import Library, {Leaf} from '../lib.mjs';
import assert from 'node:assert/strict';
import {mock, test} from 'node:test';

test('make sure items provide required parameter', () => {
	const lib = new Library();
	assert.throws(
		() => lib.add(),
		/Must be an object/
	);
	assert.throws(
		() => lib.add({provides: 'foo'}),
		/Item factory must be a function/
	);
	assert.throws(
		() => lib.add({provides: 'foo', factory: 'foo'}),
		/Item factory must be a function/
	);
	assert.throws(
		() => lib.add({factory: () => {}}),
		/Item provides must be a string/
	);
	assert.throws(
		() => lib.add({provides: 'foo', requires: 'bar', factory: () => {}}),
		/Item requires must be an array/
	);
	assert.throws(
		() => lib.add({provides: 'foo', requires: [true], factory: () => {}}),
		/Item requires must be an array of strings/
	);

	lib.add({provides: 'foo1', factory: () => {}});
	lib.add({provides: 'foo2', requires: ['bar'], factory: () => {}});
});

test('make sure provides does not contain invalid paths', () => {
	const lib = new Library();
	assert.throws(
		() => lib.add({provides: '*::a', factory: () => {}}),
		/\* must not be used for branch names/
	);
	lib.add({provides: 'a::*', factory: () => {}});
});

test('run factory only once', async () => {
	const lib = new Library();
	let cnt = 0;
	lib.add({provides: 'foo', factory: async () => ++cnt});
	assert.equal(await lib.get('foo'), 1);
	assert.equal(await lib.get('foo'), 1);
});

test('resolve dependencies in the right order', async () => {
	const lib = new Library();
	let cnt = 0;
	lib.add({provides: 'baz::1', factory: async () => ++cnt});
	lib.add({provides: 'bar::1', requires: ['baz::1'], factory: async ([dep], name) => {
		assert.equal(dep, 2);
		assert.equal(name, '1');
		return ++cnt;
	}});
	lib.add({provides: 'bar::2', factory: async () => ++cnt});
	lib.add({provides: 'foo', requires: ['bar::2', 'bar::1'], factory: async ([dep1, dep2], name) => {
		assert.equal(dep1, 1);
		assert.equal(dep2, 3);
		assert.equal(name, 'foo');
		return ++cnt;
	}});
	assert.equal(await lib.get('foo'), 4);
});

test('resolve group of dependencies', async () => {
	const lib = new Library();
	lib.add({provides: 'foo::bar::baz::a', factory: () => Promise.reject()});
	lib.add({provides: 'foo::bar::a', factory: (deps, name) => `foo_${name}`});
	lib.add({provides: 'foo::bar::b', factory: (deps, name) => `foo_${name}`});
	lib.add({provides: 'foo::bar::c', factory: (deps, name) => `foo_${name}`});
	lib.add({provides: 'baz', requires: ['foo::bar::*'], factory: ([dep]) => {
		assert.deepStrictEqual(dep, [
			['a', 'foo_a'],
			['b', 'foo_b'],
			['c', 'foo_c'],
		]);
		return true;
	}});
	assert.equal(await lib.get('baz'), true);
});

test('resolve empty groups', async () => {
	const lib = new Library();
	assert.deepStrictEqual(await lib.get('bar::*'), []);
});

test('resolve catch-all dependency', async () => {
	const lib = new Library();
	lib.add({provides: 'foo::bar', factory: () => true});
	lib.add({provides: 'foo::*', factory: (deps, name) => name});
	assert.equal(await lib.get('foo::a'), 'a');
	assert.equal(await lib.get('foo::b'), 'b');
	assert.equal(await lib.get('foo::bar'), true);
});

test('propagate errors', async () => {
	const lib = new Library();
	const err = new Error('ERROR!');
	lib.add({provides: 'a', factory: () => Promise.reject(err)});
	lib.add({provides: 'b', requires: ['a'], factory: () => true});
	await assert.rejects(() => lib.get('b'), err);
});

test('control overriding dependencies', async () => {
	const lib = new Library();

	lib.add({
		provides: 'a',
		factory: () => 1
	});

	assert.throws(() => lib.add({
		provides: 'a',
		factory: () => 2
	}), /Dependency a already provided/);

	lib.add({
		provides: 'a',
		factory: () => 3
	}, {override: true});

	assert.equal(await lib.get('a'), 3);
});

test('dynamic requires', async () => {
	const lib = new Library();
	lib.add({provides: 'foo::*', factory: (deps, name) => name});
	lib.add({provides: 'bar::*', requires: [(name) => `foo::${name}`], factory: ([req]) => req});
	assert.equal(await lib.get('bar::a'), 'a');
});

test('prevent require race conditions', async () => {
	const lib = new Library();
	const factory = mock.fn(() => Symbol());
	lib.add({provides: 'foo', factory});
	const [i0, i1] = await Promise.all([
		lib.get('foo'),
		lib.get('foo'),
	]);
	assert.equal(factory.mock.calls.length, 1);
	assert.equal(i0, factory.mock.calls[0].result);
	assert.equal(i1, factory.mock.calls[0].result);
});

test('list lib items', () => {
	const lib = new Library();
	lib.add({
		provides: 'foo',
		factory: () => {}
	}).add({
		provides: 'bar::foo',
		factory: () => {}
	}).add({
		provides: 'bar::baz',
		factory: () => {}
	});
	const list = lib.ls();
	assert.deepEqual(list.map(([name]) => name), [
		'foo',
		'bar::foo',
		'bar::baz',
	]);
	list.forEach(([provides, item]) => {
		assert(item instanceof Leaf);
		assert.equal(provides, item.provides);
	});
});

test('generate docs', () => {
	const lib = new Library();
	lib.add({
		provides: 'foo',
		requires: ['bar', 'baz', (a) => `bar:${a}`],
		factory: () => {},
		docs: `
			Super cool feature!

				Foo bar
		`
	}).add({
		provides: 'bar',
		factory: () => {}
	});

	const docs = lib.ls().map(([_, leaf]) => leaf.genDocs());
	assert.deepEqual(docs, [
		'## `foo`\n\nRequires:\n- `bar`\n- `baz`\n- `(a) => \'bar:${a}\'`\n\nSuper cool feature!\n\n\tFoo bar',
		'## `bar`\n\n*Undocumented*'
	]);
});

test('generate docs with anchors', () => {
	const lib = new Library();
	lib.add({
		provides: 'foo',
		requires: ['bar::test', 'baz::a', 'bla', (x) => `blub::${x}`],
		factory: () => {},
		docs: 'foo docs'
	}).add({
		provides: 'bar::*',
		factory: () => {},
		docs: 'bar docs'
	}).add({
		provides: 'baz::a',
		factory: () => {},
		docs: 'baz docs'
	});

	const docs = lib.genDocs('# My Super Docs');
	assert.deepEqual(docs, `# My Super Docs

<a name="foo"></a>
## \`foo\`

Requires:
- [\`bar::test\`](#bar___)
- [\`baz::a\`](#baz__a)
- \`bla\`
- \`(x) => 'blub::\${x}'\`

foo docs

<a name="bar___"></a>
## \`bar::*\`

bar docs

<a name="baz__a"></a>
## \`baz::a\`

baz docs`);
});
