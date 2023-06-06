import Library from '../lib.mjs';
import {loadDir} from '../loader.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('load files from directory', async () => {
	const lib = new Library();
	const path = join(__dirname, '../test-assets/deps');
	await loadDir(lib, path);
	assert.deepEqual(await lib.get('deps::*'), [
		['a', 'a'],
		['b', 'b'],
		['d', 'd'],
	]);
});

test('ensure paths are absolute', async () => {
	const lib = new Library();
	await assert.rejects(() => loadDir(lib, '../'), /paths must be absolute/);
});
