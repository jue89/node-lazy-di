import {isAbsolute, join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import Library from './lib.mjs';
import {loadDir, loadFile} from './loader.mjs';
import {addEnvLoader, addExtDepLoader} from './helper.mjs';
import process from 'node:process';

function getBasePath () {
	if (!process.argv[1]) return null;
	return dirname(process.argv[1]);
}

export default async function lazyDI (opts = {}) {
	const lib = new Library();

	// try to find base path:
	// 1. use explicit option
	let basePath = opts.basePath;
	// 2. caller provided the import context
	if (!basePath) basePath = opts.importContext && dirname(fileURLToPath(opts.importContext.url));
	// 3. use the processes entry-point
	if (!basePath) basePath = getBasePath();
	// 4. use cwd
	if (!basePath) basePath = process.cwd();

	const makeAbsolute = (path) => basePath && !isAbsolute(path)
		? join(basePath, path)
		: path;

	addEnvLoader(lib);
	addExtDepLoader(lib);

	if (opts.loadDirs) {
		for (let dir of opts.loadDirs) {
			await loadDir(lib, makeAbsolute(dir), {override: true});
		}
	}

	if (opts.loadFiles) {
		for (let file of opts.loadFiles) {
			await loadFile(lib, makeAbsolute(file), {override: true});
		}
	}

	return lib;
}
