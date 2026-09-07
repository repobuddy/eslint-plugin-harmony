---
'eslint-plugin-harmony': major
---

`@typescript-eslint/parser` is no longer a dependency of this package. It is now an
optional peer dependency (`>= 6.0.0`), beside `@typescript-eslint/eslint-plugin`.

**If you use any eslintrc `ts-*` config you must now install it yourself** —
`npm i -D @typescript-eslint/parser` — or ESLint fails to resolve the parser named
in `style-parts/ts-common.json`. Flat config consumers already supply their own
through `typescript-eslint` and are unaffected.

Why: as a runtime dependency, a package manager installs a copy *inside*
`node_modules/eslint-plugin-harmony/node_modules/`, and eslintrc resolves
`"parser": "@typescript-eslint/parser"` relative to the config file that names it —
this package's own. So the nested copy won whenever it differed from yours.
Measured on a real install with a consumer on parser 7.18.0,
`eslint --print-config` reported
`node_modules/eslint-plugin-harmony/node_modules/@typescript-eslint/parser`. After
the move it reports the consumer's own copy. Your parser version is now yours, and
the plugin cannot pin it out from under you.
