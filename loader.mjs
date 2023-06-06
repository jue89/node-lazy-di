import assert from 'node:assert';
import {readdir} from 'fs/promises';
import {isAbsolute, join} from 'path';

function appendItem (lib, file, item, opts) {
	try {
		lib.add(item.default !== undefined ? item.default : item, opts);
	} catch (err) {
		throw new Error(`Cannot load ${file}: ${err.message}`);
	}
}

export async function loadFile (lib, file, opts) {
	assert(isAbsolute(file), 'file path must be absolute');
	const item = await import(file);
	appendItem(lib, file, item, opts);
}

export const FILE_REGEXP = /\.m?js$/;

export async function loadDir (lib, dir, opts) {
	assert(isAbsolute(dir), 'paths must be absolute');

	const files = (await readdir(dir))
		.filter((file) => FILE_REGEXP.test(file))
		.sort();

	const items = await Promise.all(files.map(async (file) => {
		const path = join(dir, file);
		return [path, await import(path)];
	}));

	for (let [file, item] of items) {
		appendItem(lib, file, item, opts);
	}
}
