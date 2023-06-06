import lazydi from '../index.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';

test('load files from directory relative to test file', async () => {
	const lib = await lazydi({
		loadDirs: [
			'../test-assets/deps',
			'../test-assets/override-deps'
		],
		loadFiles: [
			'../test-assets/dep.mjs'
		]
	});

	assert.deepEqual(await lib.get('deps::*'), [
		['a', 'a'],
		['b', 'b'],
		['d', 'D'],
		['e', 'e'],
	]);
});

test('add ext deps loader', async () => {
	const lib = await lazydi({});
	assert.equal(await lib.get('ext::node:path'), await import('node:path'));
});

test('add env loader', async () => {
	const lib = await lazydi({});
	process.env['FOO'] = 'bar';
	assert.equal(await lib.get('env::FOO'), 'bar');
});
