import assert from 'node:assert';
import process from 'node:process';

export function addEnvLoader (lib) {
	lib.add({
		provides: 'env::*',
		factory: (dep, name) => {
			const env = process.env[name];
			assert(env !== undefined, `Environment ${name} not set`);
			return env;
		}
	});
}

export function addExtDepLoader (lib) {
	lib.add({
		provides: 'ext::*',
		factory: async (deps, name) => await import(name)
	});
}
