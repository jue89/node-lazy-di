import Library from '../lib.mjs';
import {addEnvLoader, addExtDepLoader} from '../helper.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import process from 'node:process';

test('load envs', async () => {
	const lib = new Library();
	addEnvLoader(lib);
	process.env['FOO'] = 'bar';
	process.env['NUM'] = '42';

	await assert.equal(await lib.get('env-optional::NOT_SET'), undefined);
	await assert.equal(await lib.get('env-optional::FOO'), 'bar');

	await assert.rejects(() => lib.get('env::NOT_SET'), /Environment NOT_SET not set/);
	assert.equal(await lib.get('env::FOO'), 'bar');

	await assert(isNaN(await lib.get('envint-optional::NOT_SET')));
	await assert.equal(await lib.get('envint-optional::NUM'), 42);

	await assert.rejects(() => lib.get('envint::NOT_SET'), /Environment NOT_SET not set/);
	await assert.equal(await lib.get('envint::NUM'), 42);
});

test('load ext dependencies', async () => {
	const lib = new Library();
	addExtDepLoader(lib);

	await assert.rejects(() => lib.get('ext::foobar'), /Cannot find package 'foobar'/);
	assert.equal(await lib.get('ext::node:path'), await import('node:path'));
});
