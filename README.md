# eslint-plugin-harmony

[![NPM version][npm-image]][npm-url]
[![NPM downloads][downloads-image]][downloads-url]

[![GitHub Action][github-release]][github-action-url]

[![Visual Studio Code][vscode-image]][vscode-url]
[![phpStorm][phpStorm-image]][phpStorm-url]
[![Atom][atom-image]][atom-url]

A [`eslint`](https://eslint.org/) config styles package that work across IDEs.

## Design Principles

There are several configurations available in this package.
Although they are different as they are designed for different programmers,
here are the principles that they all follow:

- They are designed to be used by team
- Each team member can use one of the supported IDE
- The formatter available on each IDE should work with each configuration
- Code should look well and consistent on each IDE with folding
  - so that when you stop by your team member's cube, the code looks the same.
- Thrive for easy to write (with the fewest keystrokes) while keeping the code clean

## Supported IDE

- Visual Studio Code (1.20.0): <https://code.visualstudio.com/>
- phpStorm (2017.3.4): <https://www.jetbrains.com/phpstorm/>
- Atom (1.24.0): <https://atom.io/>

## Requirements

- Node.js `^20.19.0 || ^22.13.0 || >=24` — this package is ESM only
- ESLint `>=8.57.0`

## Installation

```sh
npm install --save-dev eslint eslint-plugin-harmony
```

## Usage

`eslint.config.js` (flat config) is the supported way to use this package on every
ESLint version it supports:

```js
import { defineConfig } from 'eslint/config'
import harmony from 'eslint-plugin-harmony'

export default defineConfig([
  { files: ['**/*.js'], plugins: { harmony }, extends: ['harmony/recommended'] }
])
```

`extends: ['harmony/<name>']` needs ESLint 9.23 or later, which falls back to the
`flat/<name>` entry of the plugin. On ESLint 8 and 9.22 and earlier, spread the
config instead — this works on every version:

```js
import harmony from 'eslint-plugin-harmony'

export default [...harmony.configs['flat/recommended']]
```

### The configs

| `extends` name | spread name | notes |
| --- | --- | --- |
| `harmony/recommended` | `harmony.configs['flat/recommended']` | the JavaScript style |
| `harmony/latest` | `harmony.configs['flat/latest']` | `recommended` without the indentation rule |
| `harmony/es5` | `harmony.configs['flat/es5']` | pins the language to ES5 |
| `harmony/es5-strict` | `harmony.configs['flat/es5-strict']` | ES5, plus `semi` and no trailing commas |
| `harmony/ts-recommended` | `harmony.configs['flat/ts-recommended']` | TypeScript |
| `harmony/ts-recommended-type-check` | `harmony.configs['flat/ts-recommended-type-check']` | TypeScript, type-aware rules |
| `harmony/ts-recommended-requiring-type-checking` | … | same, older name |
| `harmony/ts-recommended-cra` | … | Create React App variant |
| `harmony/ts-recommended-type-check-cra` | … | Create React App variant |
| `harmony/ts-prettier` | `harmony.configs['flat/ts-prettier']` | experimental; pair with `eslint-config-prettier` |

### These configs are overlays

The eslintrc configs pull in `eslint:recommended`, `plugin:@typescript-eslint/*`
and `prettier` by name. Flat config has no string `extends`, so the flat configs
carry only the rules harmony itself sets and you compose the bases yourself —
harmony last, so its style wins:

```js
import { defineConfig } from 'eslint/config'
import js from '@eslint/js'
import harmony from 'eslint-plugin-harmony'

export default defineConfig([
  js.configs.recommended,
  { files: ['**/*.js'], plugins: { harmony }, extends: ['harmony/recommended'] }
])
```

Two other deliberate differences from the eslintrc twins:

- The `ts-*` flat configs apply to `**/*.{ts,tsx,mts,cts}` on their own. eslintrc
  left that to your `overrides.files`.
- No `ecmaVersion` is pinned, except in `es5` and `es5-strict` where it is the
  point. The eslintrc configs pinned ES2018/ES2019, which in flat config would
  win over yours and turn `a?.b` into a parsing error.

### TypeScript

The `ts-*` flat configs set `@typescript-eslint/*` rules but do not register the
plugin or the parser — pinning a parser here would override the one your
`typescript-eslint` version installs. Compose them on top of
[`typescript-eslint`](https://typescript-eslint.io), which supplies both:

```js
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'
import harmony from 'eslint-plugin-harmony'

export default defineConfig([
  ...tseslint.configs.recommended,
  { files: ['**/*.ts', '**/*.tsx'], plugins: { harmony }, extends: ['harmony/ts-recommended'] }
])
```

For the type-aware configs, also give `typescript-eslint` your
`languageOptions.parserOptions.project` — harmony does not set it.

For `harmony/ts-prettier`, put `eslint-config-prettier` last so it turns the
formatting rules off again.

## Legacy: eslintrc (ESLint 8 and 9 only)

> ESLint 10 removed the eslintrc format. `.eslintrc.*` files are not read there
> at all, and `ESLINT_USE_FLAT_CONFIG=false` no longer brings it back, so
> `plugin:harmony/*` cannot be used on ESLint 10. Move to the flat configs above.

The `plugin:harmony/*` configs are unchanged from earlier versions:

```json
{
  "extends": ["plugin:harmony/recommended"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "extends": ["plugin:harmony/ts-recommended"]
    }
  ]
}
```

Available: `plugin:harmony/recommended`, `plugin:harmony/latest`,
`plugin:harmony/es5`, `plugin:harmony/es5-strict`, `plugin:harmony/ts-prettier`,
`plugin:harmony/ts-recommended`, `plugin:harmony/ts-recommended-type-check`,
`plugin:harmony/ts-recommended-cra`, `plugin:harmony/ts-recommended-type-check-cra`.

For `ts-recommended-type-check` you still need to specify
`parserOptions.project`:

```json
{
  "extends": ["plugin:harmony/recommended"],
  "overrides": [
    {
      "files": ["*.ts", "*.tsx"],
      "extends": ["plugin:harmony/ts-recommended-type-check"],
      "parserOptions": { "project": "tsconfig.json" }
    }
  ]
}
```

### JetBrains IDE

After you import the settings,
you need to use them in the setting:

![setting](2018-03-06-16-12-17.png)

You also need to change your language version appropriately:

![language version](2018-03-06-16-14-48.png)

## Contribute

```sh
pnpm i
pnpm bootstrap
```

[npm-image]: https://img.shields.io/npm/v/eslint-plugin-harmony.svg?style=flat
[npm-url]: https://npmjs.org/package/eslint-plugin-harmony
[downloads-image]: https://img.shields.io/npm/dm/eslint-plugin-harmony.svg?style=flat
[downloads-url]: https://npmjs.org/package/eslint-plugin-harmony
[github-release]: https://github.com/repobuddy/eslint-plugin-harmony/workflows/release/badge.svg
[github-action-url]: https://github.com/repobuddy/eslint-plugin-harmony/actions
[vscode-image]:https://img.shields.io/badge/vscode-ready-green.svg
[vscode-url]:https://code.visualstudio.com/
[phpStorm-image]:https://img.shields.io/badge/phpStorm-ready-green.svg
[phpStorm-url]:https://www.jetbrains.com/phpstorm/
[atom-image]:https://img.shields.io/badge/atom-ready-green.svg
[atom-url]:https://atom.io/
