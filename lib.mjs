function assert (condition, message) {
	if (!condition) throw new Error(message);
}

const INDENT_SEQ = /^(\n*)[\t ]*/m;
function trimDocs (docs) {
	const indentSeq = INDENT_SEQ.exec(docs);
	if (indentSeq) {
		const [seq, br] = indentSeq;
		docs = docs.replace(new RegExp(`${seq}`, 'mg'), br);
	}
	return docs.trim().replace(/\n{3,}/g, '\n\n');
}

export const DELIMITER = '::';
export const WILDCARD = '*';

export class Leaf {
	constructor (item) {
		assert(typeof item === 'object', 'Must be an object');
		let {provides, requires, factory, docs} = item;
		assert(typeof factory === 'function', 'Item factory must be a function');
		assert(typeof provides === 'string', 'Item provides must be a string');
		if (requires === undefined) requires = [];
		assert(Array.isArray(requires), 'Item requires must be an array of strings');
		requires.forEach((r) => {
			const type = typeof r;
			assert(type === 'string' || type === 'function', 'Item requires must be an array of strings or functions');
		});

		this.factory = factory;
		this.provides = provides;
		this.requires = requires;
		this.docs = docs;
	}

	genDocs ({genAnchor, findAnchor} = {}) {
		genAnchor ||= () => undefined;
		findAnchor ||= () => undefined;
		const anchor = genAnchor(this.provides);
		function reqToListItem (req) {
			const name = req.toString().replace(/`/g, '\'');
			const anchor = findAnchor(name);
			return anchor ? `- [\`${name}\`](#${anchor})` : `- \`${name}\``;
		}
		return trimDocs(`
			${anchor ? `<a name="${anchor}"></a>` : ''}
			## \`${this.provides}\`

			${this.requires.length > 0 ?  trimDocs(`
				Requires:
				${this.requires.map(reqToListItem).join('\n')}
			`) : ''}

			${trimDocs(this.docs || '*Undocumented*')}
		`);
	}
}

export class Branch {
	fetchBranch (path) {
		const [cur, ...remainder] = path;
		if (cur === undefined) {
			return this;
		}

		assert(cur !== WILDCARD, '* must not be used for branch names');

		if (this[cur] === undefined) {
			this[cur] = new Branch();
		}

		return this[cur].fetchBranch(remainder);
	}

	getAllLeaves () {
		return Object.entries(this)
			.filter(([k, v]) => k !== WILDCARD && v instanceof Leaf)
			.sort(([a], [b]) => {
				if (a < b) return -1;
				if (a > b) return 1;
				return 0;
			});
	}

	getLeaf (name) {
		assert(this[name] instanceof Leaf, `item ${name} not found`);
		return this[name];
	}

	addLeaf (name, leaf, {override}) {
		assert(leaf instanceof Leaf);
		if (!override) {
			assert(this[name] === undefined, `Dependency ${name} already provided`);
		}
		this[name] = leaf;
	}
}

export default class Library {
	constructor () {
		this.root = new Branch();
	}

	add (item, opts = {}) {
		assert(typeof item === 'object', 'Must be an object');
		if (item.ignore) return this;
		const leaf = new Leaf(item);
		const path = leaf.provides.split(DELIMITER);
		const itemName = path.pop();
		const branch = this.root.fetchBranch(path);
		branch.addLeaf(itemName, leaf, opts);
		return this;
	}

	async _initLeaf (leaf, name) {
		if (leaf.instance === undefined) {
			const reqs = leaf.requires.map((r) => typeof r === 'function' ? r(name) : r);
			leaf.instance = Promise.all(reqs.map((r) => this.get(r)))
				.then((deps) => leaf.factory(deps, name));
		}
		return leaf.instance;
	}

	async get (path) {
		assert(typeof path === 'string', 'path must be a string');
		path = path.split(DELIMITER);
		const itemName = path.pop();
		const branch = this.root.fetchBranch(path);
		if (itemName === WILDCARD) {
			const leaves = branch.getAllLeaves();
			const instances = await Promise.all(leaves.map(async ([k, v]) => [k, await this._initLeaf(v, k)]));
			return instances;
		} else {
			if (!(branch[itemName] instanceof Leaf) && branch[WILDCARD] instanceof Leaf) {
				branch[itemName] = new Leaf(branch[WILDCARD]);
			}
			const leaf = branch.getLeaf(itemName);
			const instance = await this._initLeaf(leaf, itemName);
			return instance;
		}
	}

	ls () {
		function walk (branch, path = []) {
			return Object.entries(branch).reduce((acc, [key, item]) => {
				if (item instanceof Branch) {
					return acc.concat(walk(item, [...path, key]));
				} else if (item instanceof Leaf) {
					return acc.concat([[[...path, key], item]]);
				} else {
					throw new Error('Invalid item');
				}
			}, []);
		}

		return walk(this.root).map(([path, item]) => [path.join(DELIMITER), item]);
	}

	genDocs (preamble = '# Documentation') {
		function genAnchor (name) {
			return name.toLowerCase().replace(/:/g, '_').replace(/\*/, '_');
		}

		const list = this.ls();
		const anchors = list.map(([name]) => {
			return [new RegExp(name.replace(/\*$/, '.*')), genAnchor(name)];
		});

		function findAnchor (name) {
			const item = anchors.find(([regexp]) => regexp.test(name));
			return item ? item[1] : undefined;
		}

		return trimDocs(`
			${trimDocs(preamble)}

			${this.ls().map(([_name, item]) => item.genDocs({genAnchor, findAnchor})).join('\n\n')}
		`);
	}
}
