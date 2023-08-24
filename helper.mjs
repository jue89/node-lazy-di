import assert from 'node:assert';
import process from 'node:process';

export function addEnvLoader (lib) {
	lib.add({
		provides: 'env::*',
		docs: `
			Exposes the requested environment variable.
			Fails if the variable hasn't been defined.
		`,
		factory: (dep, name) => {
			const env = process.env[name];
			assert(env !== undefined, `Environment ${name} not set`);
			return env;
		}
	}).add({
		provides: 'env-optional::*',
		docs: `
			Exposes the requested environment variable.
			Returns \`undefined\` if the variable hasn't been defined.
		`,
		factory: (dep, name) => {
			const env = process.env[name];
			return env;
		}
	}).add({
		provides: 'envint::*',
		docs: `
			Exposes the requested environment variable parsed as integer.
			Fails if the variable hasn't been defined.
		`,
		factory: (dep, name) => {
			const env = process.env[name];
			assert(env !== undefined, `Environment ${name} not set`);
			return parseInt(env);
		}
	}).add({
		provides: 'envint-optional::*',
		docs: `
			Exposes the requested environment variable parsed as integer.
			Returns \`NaN\` if the variable hasn't been defined
		`,
		factory: (dep, name) => {
			const env = process.env[name];
			return parseInt(env);
		}
	});
}

export function addExtDepLoader (lib) {
	lib.add({
		provides: 'ext::*',
		docs: `
			Wrapper for loading ES6 modules.
		`,
		factory: async (deps, name) => await import(name)
	});
}
