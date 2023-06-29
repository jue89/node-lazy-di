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
	}).add({
		provides: 'env-optional::*',
		factory: (dep, name) => {
			const env = process.env[name];
			return env;
		}
	}).add({
		provides: 'envint::*',
		factory: (dep, name) => {
			const env = process.env[name];
			assert(env !== undefined, `Environment ${name} not set`);
			return parseInt(env);
		}
	}).add({
		provides: 'envint-optional::*',
		factory: (dep, name) => {
			const env = process.env[name];
			return parseInt(env);
		}
	});
}

export function addExtDepLoader (lib) {
	lib.add({
		provides: 'ext::*',
		factory: async (deps, name) => await import(name)
	});
}
