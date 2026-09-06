---
'eslint-plugin-harmony': major
---

ESM-only package, with flat config (`eslint.config.js`) support.

## What changed

- The package is now **ESM only**. It exports `configs`, `rules` and `meta` as
  named exports and the plugin object as the default export, which is what
  `eslint.config.js`, `@eslint/eslintrc` and `eslint --plugin harmony` each need.
  There is no `require` entry point.
- **Node.js `^20.19.0 || ^22.13.0 || >=24`** is required. Older versions cannot
  `require()` an ESM package, which is how ESLint 8 and 9 load a plugin from an
  `.eslintrc`.
- The `eslint` peer range is now `>=8.57.0`. The old `>=8.4.0` could not be true
  once loading the plugin depends on `require(esm)`.
- New `flat/*` configs: `flat/recommended`, `flat/latest`, `flat/es5`,
  `flat/es5-strict`, `flat/ts-recommended`, `flat/ts-recommended-type-check`,
  `flat/ts-recommended-requiring-type-checking`, `flat/ts-recommended-cra`,
  `flat/ts-recommended-type-check-cra` and `flat/ts-prettier`.
- `harmony/ts-member-delimiter-style` now reads `context.sourceCode`, so it runs
  on ESLint 10, which removed `context.getSourceCode()`.
- The eslintrc configs (`plugin:harmony/*`) are unchanged.

## Migrating

### If you use `eslint.config.js`

```js
import { defineConfig } from 'eslint/config'
import harmony from 'eslint-plugin-harmony'

export default defineConfig([
  { files: ['**/*.js'], plugins: { harmony }, extends: ['harmony/recommended'] }
])
```

`extends: ['harmony/<name>']` resolves the `flat/<name>` config on ESLint 9.23
and later. On earlier versions, spread it instead:
`export default [...harmony.configs['flat/recommended']]`.

The flat configs are overlays: they carry only the rules harmony sets. The bases
the eslintrc configs extended by name — `eslint:recommended`,
`plugin:@typescript-eslint/*`, `prettier` — have no string form in flat config,
so compose them yourself, with harmony last. The `ts-*` flat configs in
particular set `@typescript-eslint/*` rules but register neither the plugin nor
a parser: put `typescript-eslint`'s own configs before them.

Two further differences from the eslintrc twins: the `ts-*` flat configs scope
themselves to `**/*.{ts,tsx,mts,cts}`, and no `ecmaVersion` is pinned except in
`es5` and `es5-strict` — the eslintrc ES2018/ES2019 floors would have won over
yours in flat config and broken modern syntax.

### If you use `.eslintrc`

Nothing about `plugin:harmony/*` changed, but ESLint 10 removed the eslintrc
format entirely (`ESLINT_USE_FLAT_CONFIG=false` no longer brings it back), so
staying on `.eslintrc` means staying on ESLint 8 or 9. Node.js must be at least
20.19 for ESLint to load this package from an `.eslintrc` at all.

### If you use a CommonJS config file

`require('eslint-plugin-harmony')` still works on the Node versions this package
supports — `require()` of an ESM package returns the module namespace there — but
the plugin object is now `require('eslint-plugin-harmony').default`. On older
Node it throws `ERR_REQUIRE_ESM`. Prefer an `eslint.config.mjs` with
`import harmony from 'eslint-plugin-harmony'`.
