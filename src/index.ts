import es5Strict from './es5-strict.json' with { type: 'json' }
import es5 from './es5.json' with { type: 'json' }
import { createFlatConfigs } from './flat.js'
import latest from './latest.json' with { type: 'json' }
import { pkg } from './pkg.js'
import recommended from './recommended.json' with { type: 'json' }
import { rules } from './rules/index.js'
import tsPrettier from './ts-prettier.json' with { type: 'json' }
import tsRecommendedCra from './ts-recommended-cra.json' with { type: 'json' }
import tsRecommendedTypeCheck2 from './ts-recommended-requiring-type-checking.json' with { type: 'json' }
import tsRecommendedTypeCheckCra from './ts-recommended-type-check-cra.json' with { type: 'json' }
import tsRecommendedTypeCheck from './ts-recommended-type-check.json' with { type: 'json' }
import tsRecommended from './ts-recommended.json' with { type: 'json' }

export const meta = { name: 'eslint-plugin-harmony', version: pkg.version }

export { rules }

/**
 * The eslintrc configs, unchanged. ESLint 8 and 9 reach these through
 * `extends: "plugin:harmony/<name>"`; ESLint 10 removed the eslintrc format and
 * cannot load them at all — use the `flat/` entries there.
 */
const eslintrcConfigs = {
	'es5': es5,
	'es5-strict': es5Strict,
	'latest': latest,
	'recommended': recommended,
	'ts-prettier': tsPrettier,
	'ts-recommended-type-check': tsRecommendedTypeCheck,
	'ts-recommended-type-check-cra': tsRecommendedTypeCheckCra,
	'ts-recommended-requiring-type-checking': tsRecommendedTypeCheck2,
	'ts-recommended': tsRecommended,
	'ts-recommended-cra': tsRecommendedCra
}

/** The plugin object itself, the default export and the value flat configs register. */
export type HarmonyPlugin = {
	meta: typeof meta,
	rules: typeof rules,
	configs: Record<string, unknown>
}

const plugin: HarmonyPlugin = {
	meta,
	rules,
	configs: {}
}

Object.assign(plugin.configs, eslintrcConfigs, createFlatConfigs(plugin))

/**
 * Named export, so `@eslint/eslintrc` (ESLint 8/9) finds the configs on the
 * module namespace of this ESM module — it does not unwrap `default`.
 */
export const configs = plugin.configs

/**
 * Default export, so `eslint --plugin harmony` works: the module importer
 * behind `--plugin` requires a default export.
 */
export default plugin
