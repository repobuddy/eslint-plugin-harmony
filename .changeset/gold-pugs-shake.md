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

## Dependencies

- `@typescript-eslint/experimental-utils` (deprecated, v5) is replaced by
  `@typescript-eslint/utils` v8. It is what the custom rule is built on, and its
  `eslint` peer range (`^8.57.0 || ^9 || ^10`) matches this package's own — v5's
  did not. If you import this package's types, the `rules` record is now typed
  with `TSESLint.RuleModule` from `@typescript-eslint/utils`.
- `@rushstack/eslint-patch` is dropped. Nothing in this package used it.
- `@typescript-eslint/eslint-plugin` is now an **optional** peer dependency. Only
  the `ts-*` configs need it; `harmony/recommended` on plain JavaScript does not.
  The range is unchanged (`>= 6.0.0`), and the `ts-*` configs are verified
  against v6 through v8.

## typescript-eslint v8

`@typescript-eslint/parser` (a real dependency of this package) and the
`@typescript-eslint/eslint-plugin` this repo tests against both move to `^8`.
The `@typescript-eslint/eslint-plugin` peer range is unchanged (`>= 6.0.0`), so
nothing forces you off v6 or v7.

### Why the parser bump matters

`@typescript-eslint/parser@^6` cannot run on ESLint 10 — it throws
`scopeManager.addGlobals is not a function`. eslintrc consumers resolve the
parser named in `style-parts/ts-common.json` from *this* package, so the pinned
v6 was theirs whether they wanted it or not. v8's parser is verified working on
ESLint 8.57.1, 9.39.5 and 10.10.0.

### Rule changes

Only one rule entry was added, and it is additive — an `off` for a rule id that
does not exist in v6 or v7 is a no-op there, so resolved severities on those
versions are unchanged:

- `@typescript-eslint/no-empty-object-type: "off"` in `ts-common`, beside the
  existing `@typescript-eslint/no-empty-interface: "off"`. v8 dropped
  `no-empty-interface` from `plugin:@typescript-eslint/recommended` and replaced
  it with `no-empty-object-type` (which also absorbed part of the removed
  `ban-types`). Without the new entry, this package's long-standing decision that
  empty interfaces are allowed — they carry contextual meaning and leave room to
  extend without a breaking change — was silently lost on v8. Note the
  replacement is broader than what it replaces: `{}` as a type annotation is now
  allowed too, because the rule is off rather than narrowed.

Two entries in `ts-common` are now inert rather than wrong, and are kept for v6
and v7 consumers:

- `@typescript-eslint/indent: "off"` and
  `@typescript-eslint/member-delimiter-style: "off"`. Both rules were moved out
  of typescript-eslint into `@stylistic` and no longer exist in v8. ESLint
  ignores an unknown rule set to severity `0`, so they stay harmless. They are
  *not* re-expressed as `@stylistic/*` entries: this package does not depend on
  `@stylistic/eslint-plugin`, and in flat config a rule from an unregistered
  plugin is a hard config error even at severity `off`.

Everything else `ts-common` and the `ts-recommended*` configs name still exists
in v8: `ban-ts-comment`, `explicit-function-return-type`,
`explicit-module-boundary-types`, `no-empty-function`, `no-explicit-any`,
`no-namespace`, `no-non-null-assertion`, `no-unused-vars`, `no-use-before-define`,
`no-unsafe-argument`, `no-unsafe-member-access`.

### What v8 turns on that this package does not turn off

The `ts-*` configs extend `plugin:@typescript-eslint/recommended` and
`plugin:@typescript-eslint/recommended-requiring-type-checking` by name, so they
follow whichever typescript-eslint version *you* install. Moving to v8 therefore
brings its enlarged recommended set with it: `no-unused-expressions`,
`no-require-imports`, `no-unsafe-function-type`, `no-wrapper-object-types`,
`no-duplicate-enum-values`, `no-unsafe-declaration-merging` and
`no-unnecessary-type-constraint`, plus the type-checked additions
(`only-throw-error`, `prefer-promise-reject-errors`, `no-unsafe-unary-minus`,
`no-array-delete`, and others). This package makes no judgement on those; turn
off what you do not want.

`plugin:@typescript-eslint/recommended-requiring-type-checking`, which
`ts-recommended-type-check` and its siblings extend, is a deprecated alias for
`recommended-type-checked` in v8. It still resolves, but expect it to go in
typescript-eslint v9.

### Flat `ts-*` configs still set no parser

Unchanged, and deliberately so: the flat `ts-*` configs register neither
`@typescript-eslint` nor a parser, so you compose `typescript-eslint`'s own
configs before them. Registering a parser or plugin instance here would fight the
one you install — `Cannot redefine plugin` — and would pin the parser this
package happens to depend on over yours.
