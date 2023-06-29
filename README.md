# 💉 Lazy Dependency Injection

This module provides a foundation for applications that are consisting of loosely-coupled components.
Components are lazily instantiated, once they are required the first time.

This module consists of:

* `lazy-di`: Factory and loader for NodeJS
* `lazy-di/lib`: Core library. Also works outside a NodeJS environment
* `lazy-di/loader`: Helper to load dirs and files
* `lazy-di/helper`: Helper to access foreign modules and environment variables

## Examples

Minimal example:

```js
import Library from 'lazy-di/lib';

const lib = new Library();

// Add greeter
lib.add({
    provides: 'greet',
    requires: ['planet'],
    factory: ([planet]) => `Hello ${planet}!`
});

// Inject dependency
lib.add({
    provides: 'planet',
    factory: () => 'Earth'
});

// Prints 'Hello Earth!'
console.log(await lib.get('greet'));
```

Fetch multiple dependencies:

```js
import Library from 'lazy-di/lib';

const lib = new Library();

// Add greeter
lib.add({
    provides: 'greet',
    requires: ['planets::*'],
    factory: ([planets]) => planets.map(([depName, plant]) => `Hello ${planet}!`).join(' - ');
});

// Inject dependencies
lib.add({
    provides: 'planets::earth',
    factory: () => 'Earth'
}).add({
    provides: 'planets::mars',
    factory: () => 'Mars'
}).add({
    provides: 'planets::pluto',
    factory: () => 'Pluto'
});

// Prints 'Hello Earth! - Hello Mars! - Hello Pluto!'
console.log(await lib.get('greet'));
```

Provide dependencies on-the-fly:

```js
import Library from 'lazy-di/lib';

const lib = new Library();

// Add greeter
lib.add({
    provides: 'greet',
    requires: ['planets::earth', 'planets::mars'],
    factory: ([earth, mars]) => `Hello ${earth} and ${mars}!`;
});

// Provide generic dependency
lib.add({
    provides: 'planets::*',
    factory: ([], depName) => depName.toUpperCase()
});

// Prints 'Hello EARTH and MARS!'
console.log(await lib.get('greet'));
```

## Helper

This module can load dependency from files and dirs.

Example module `my-deps/hello-world.mjs`:

```js
export default {
    provides: 'hello-world',
    factory: () => 'Hallo Welt?!'
}
```

Example override module `my-overrides/hello-world.mjs`:

```js
export default {
    provides: 'hello-world',
    factory: () => 'Hello world!'
}
```

Module loading the dependencies `index.mjs`:

```js
import lazydi from 'lazy-di';

const lib = await lazydi({
    // Context for loading paths relative to this file.
    // If omitted paths are relative to the entry point given to NodeJS.
    importContext: import.meta,

    // If dependencies are provided multiple times, the last loaded will
    // be used. This allows overriding dependencies.
    loadDirs: [
        'my-deps',
        'my-overrides'
    ]
});

// Prints 'Hello world!'
console.log(await lib.get('hello-world'));
```
