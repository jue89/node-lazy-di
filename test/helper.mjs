import Library from '../lib.mjs';
import {addEnvLoader, addExtDepLoader} from '../helper.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import process from 'node:process';

test('load envs', async () => {
	const lib = new Library();
	addEnvLoader(lib);
	await assert.rejects(() => lib.get('env::NOT_SET'), /Environment NOT_SET not set/);
	process.env['FOO'] = 'bar';
	assert.equal(await lib.get('env::FOO'), 'bar');
});

test('load ext dependencies', async () => {
	const lib = new Library();
	addExtDepLoader(lib);

	await assert.rejects(() => lib.get('ext::foobar'), /Cannot find package 'foobar'/);
	assert.equal(await lib.get('ext::node:path'), await import('node:path'));
});
