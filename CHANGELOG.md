# eslint-plugin-harmony

## 8.0.0

### Major Changes

- abb8263: ESM-only package, with flat config (`eslint.config.js`) support.

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
    {
      files: ['**/*.js'],
      plugins: { harmony },
      extends: ['harmony/recommended'],
    },
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
  parser named in `style-parts/ts-common.json` from _this_ package, so the pinned
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
    _not_ re-expressed as `@stylistic/*` entries: this package does not depend on
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
  follow whichever typescript-eslint version _you_ install. Moving to v8 therefore
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

## 7.2.1

### Patch Changes

- bdef35e: Move the release pipeline to GitHub OIDC trusted publishing on `cyberuni`, and reconcile the package version with the registry.

### [7.1.1](https://github.com/unional/eslint-plugin-harmony/compare/v7.1.0...v7.1.1) (2022-11-20)

### Bug Fixes

- mark prettier as optional ([562c24e](https://github.com/unional/eslint-plugin-harmony/commit/562c24e6ff65a0e4e7c01f16e3b62e29b7998f64))

## [7.1.0](https://github.com/unional/eslint-plugin-harmony/compare/v7.0.2...v7.1.0) (2022-05-16)

### Features

- add CRA variant for TypeScript ([9b1dad9](https://github.com/unional/eslint-plugin-harmony/commit/9b1dad97aeb3f07c365bb85638b68f0b414d3197))

### [7.0.2](https://github.com/unional/eslint-plugin-harmony/compare/v7.0.1...v7.0.2) (2022-05-15)

### Bug Fixes

- parser should be regular dependency ([ac35c82](https://github.com/unional/eslint-plugin-harmony/commit/ac35c82cf500abe1b1c28959a3442a033d06ba47))

### [7.0.1](https://github.com/unional/eslint-plugin-harmony/compare/v7.0.0...v7.0.1) (2022-05-12)

### Bug Fixes

- disable indent rule ([56bc361](https://github.com/unional/eslint-plugin-harmony/commit/56bc361d62f8ed32c8e96440248bb88bcb4abf3f))

## [7.0.0](https://github.com/unional/eslint-plugin-harmony/compare/v6.1.1...v7.0.0) (2022-05-12)

### ⚠ BREAKING CHANGES

- move @typescript-eslint/parser to peer deps

Marking this as breaking change because
consumers need to install `@typescript-eslint/parser` themselves.

### Bug Fixes

- reset [@typescript-eslint](https://github.com/typescript-eslint) peer to 5.0.0 ([c88ca9d](https://github.com/unional/eslint-plugin-harmony/commit/c88ca9d9f5565e6741f8d26de301ccc6bb5ac7e3))

### [6.1.1](https://github.com/unional/eslint-plugin-harmony/compare/v6.1.0...v6.1.1) (2022-05-12)

### Bug Fixes

- add @typescript/eslint-plugin ([#63](https://github.com/unional/eslint-plugin-harmony/issues/63)) ([77e9921](https://github.com/unional/eslint-plugin-harmony/commit/77e99213a255db0eac07ca6daac819b7750a1bbc))

## [6.1.0](https://github.com/unional/eslint-plugin-harmony/compare/v6.0.6...v6.1.0) (2022-04-24)

### Features

- disable no-unsafe-argument and member-access ([89c2e61](https://github.com/unional/eslint-plugin-harmony/commit/89c2e61ea6126fd8a7a362fa938e404deb981490))

### [6.0.6](https://github.com/unional/eslint-plugin-harmony/compare/v6.0.5...v6.0.6) (2022-04-24)

### [6.0.5](https://github.com/unional/eslint-plugin-harmony/compare/v6.0.4...v6.0.5) (2022-04-24)

### [6.0.2](https://github.com/unional/eslint-plugin-harmony/compare/v6.0.1...v6.0.2) (2022-04-02)

### Bug Fixes

- move eslint-plugin and eslint-config-prettier as peer dependencies ([37ac6f5](https://github.com/unional/eslint-plugin-harmony/commit/37ac6f57b649ad287c3d7103b1d8d96586c28d22))

### [6.0.1](https://github.com/unional/eslint-plugin-harmony/compare/v6.0.0...v6.0.1) (2022-04-02)

### Bug Fixes

- disable @typescript-eslint/no-empty-interface ([#44](https://github.com/unional/eslint-plugin-harmony/issues/44)) ([58ec617](https://github.com/unional/eslint-plugin-harmony/commit/58ec617a172844e8c6c2ee88b9c2590d6652580a))
- update dependencies ([#45](https://github.com/unional/eslint-plugin-harmony/issues/45)) ([3500d8b](https://github.com/unional/eslint-plugin-harmony/commit/3500d8bc4cd9d7b5ed60e419185f43e7da2e2562))

## [6.0.0](https://github.com/unional/eslint-plugin-harmony/compare/v5.1.0...v6.0.0) (2021-12-05)

### ⚠ BREAKING CHANGES

- updated @typescript-eslint

@typescript-eslint 4.x does not work with ESLint 8.
Upgrading to 5.x is a breaking change

### Bug Fixes

- remove category ([063e36a](https://github.com/unional/eslint-plugin-harmony/commit/063e36acf4edc478b01ed27a1ca700a1e58e0b6a))
- update to support ESLint 8 ([8156c1e](https://github.com/unional/eslint-plugin-harmony/commit/8156c1ebb7f462bbf82f78389bab5af6449b6efe))

### [5.0.1](https://github.com/unional/eslint-plugin-harmony/compare/v5.0.0...v5.0.1) (2020-10-01)

### Bug Fixes

- **ts-prettier:** change brace-style to 1tbs ([f540980](https://github.com/unional/eslint-plugin-harmony/commit/f540980655f589d016eeb8e7915255f8231e74f7))

## [5.0.0](https://github.com/unional/eslint-plugin-harmony/compare/v3.0.1...v5.0.0) (2020-10-01)

### ⚠ BREAKING CHANGES

- TypeScript 4.0 support

### Features

- add @typescript-eslint/explicit-module-boundary-types setting ([49b3dd5](https://github.com/unional/eslint-plugin-harmony/commit/49b3dd5b4de216a22af8b0e261aeb303d3c27dc9))

### Bug Fixes

- **ts-prettier:** adjust ts-member-delimiter-style ([b74c1e5](https://github.com/unional/eslint-plugin-harmony/commit/b74c1e5f17ff0668e8892448483d9d8af7ab7745))

## [4.0.0](https://github.com/unional/eslint-plugin-harmony/compare/v3.0.1...v4.0.0) (2020-09-05)

### ⚠ BREAKING CHANGES

- TypeScript 4.0 support

### Features

- add @typescript-eslint/explicit-module-boundary-types setting ([49b3dd5](https://github.com/unional/eslint-plugin-harmony/commit/49b3dd5b4de216a22af8b0e261aeb303d3c27dc9))

### [2.1.9](https://github.com/unional/eslint-plugin-harmony/compare/v2.1.8...v2.1.9) (2019-10-24)

### Bug Fixes

- add @ts-eslint/parser as deps ([0d172ac](https://github.com/unional/eslint-plugin-harmony/commit/0d172ace769fd25709332f07fac485b11fbe46b5))

### [2.1.8](https://github.com/unional/eslint-plugin-harmony/compare/v2.1.7...v2.1.8) (2019-10-23)

### Bug Fixes

- set @ts-eslint/eslint-plugin as deps ([e2505da](https://github.com/unional/eslint-plugin-harmony/commit/e2505da6108c22c413bf4bfde3086ecefb479e59))

### [2.1.6](https://github.com/unional/eslint-plugin-harmony/compare/v2.1.5...v2.1.6) (2019-08-21)

### Bug Fixes

- relax ts/no-unused-vars for catch ([9253d17](https://github.com/unional/eslint-plugin-harmony/commit/9253d17))

### [2.1.5](https://github.com/unional/eslint-plugin-harmony/compare/v2.1.3...v2.1.5) (2019-08-21)

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.
