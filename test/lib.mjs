import Library from '../lib.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';

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
	}), /Dependency already provided/);

	lib.add({
		provides: 'a',
		factory: () => 3
	}, {override: true});

	assert.equal(await lib.get('a'), 3);
});
