import { posix } from 'node:path'
import es5Strict from './es5-strict.json' with { type: 'json' }
import es5 from './es5.json' with { type: 'json' }
import latest from './latest.json' with { type: 'json' }
import recommended from './recommended.json' with { type: 'json' }
import common from './style-parts/common.json' with { type: 'json' }
import es2017Style from './style-parts/es2017.json' with { type: 'json' }
import es5Style from './style-parts/es5.json' with { type: 'json' }
import recommendedStyle from './style-parts/recommended.json' with { type: 'json' }
import tsCommon from './style-parts/ts-common.json' with { type: 'json' }
import tsPrettierStyle from './style-parts/ts-prettier.json' with { type: 'json' }
import tsPrettier from './ts-prettier.json' with { type: 'json' }
import tsRecommendedCra from './ts-recommended-cra.json' with { type: 'json' }
import tsRecommendedRequiringTypeChecking from './ts-recommended-requiring-type-checking.json' with { type: 'json' }
import tsRecommendedTypeCheckCra from './ts-recommended-type-check-cra.json' with { type: 'json' }
import tsRecommendedTypeCheck from './ts-recommended-type-check.json' with { type: 'json' }
import tsRecommended from './ts-recommended.json' with { type: 'json' }

/**
 * The eslintrc shape this package ships. Only the keys these configs actually use.
 */
export type EslintrcConfig = {
	extends?: string | string[],
	plugins?: string[],
	parser?: string,
	parserOptions?: Record<string, unknown>,
	rules?: Record<string, unknown>
}

/**
 * Every eslintrc file in this package, keyed by its path relative to `src`,
 * without the `.json` extension. `extends` entries are resolved against this
 * map exactly the way eslintrc resolves a relative `extends` against the
 * directory of the file it appears in.
 */
const OWN_CONFIGS: Record<string, EslintrcConfig> = {
	'es5': es5,
	'es5-strict': es5Strict,
	'latest': latest,
	'recommended': recommended,
	'ts-prettier': tsPrettier,
	'ts-recommended': tsRecommended,
	'ts-recommended-cra': tsRecommendedCra,
	'ts-recommended-requiring-type-checking': tsRecommendedRequiringTypeChecking,
	'ts-recommended-type-check': tsRecommendedTypeCheck,
	'ts-recommended-type-check-cra': tsRecommendedTypeCheckCra,
	'style-parts/common': common,
	'style-parts/es2017': es2017Style,
	'style-parts/es5': es5Style,
	'style-parts/recommended': recommendedStyle,
	'style-parts/ts-common': tsCommon,
	'style-parts/ts-prettier': tsPrettierStyle
}

type Resolved = {
	rules: Record<string, unknown>,
	parser?: string
}

/**
 * `languageOptions` per flat config.
 *
 * The eslintrc `parserOptions.ecmaVersion` values are deliberately not carried
 * over. They are floors from 2018/2019 that eslintrc consumers always overrode
 * in their own config; in flat config the harmony entry usually comes last and
 * would win, so `latest.json`'s `ecmaVersion: 9` would turn `a?.b` into a
 * parsing error. Flat config defaults to `latest`, which is what a consumer of a
 * style overlay expects. The `es5` configs are the exception: pinning the
 * language is the whole point of them.
 */
const LANGUAGE_OPTIONS: Record<string, Record<string, unknown>> = {
	'es5': { ecmaVersion: 5, sourceType: 'script' },
	'es5-strict': { ecmaVersion: 5, sourceType: 'script' }
}

function toKey(from: string, ref: string) {
	return posix.join(posix.dirname(from), ref).replace(/\.json$/, '')
}

/**
 * Collapse an eslintrc `extends` chain down to the parts this package owns.
 *
 * Entries that name another package (`eslint:recommended`,
 * `plugin:@typescript-eslint/recommended`, `prettier`) are skipped: flat config
 * has no string `extends`, so those have to be composed by the consumer.
 * Everything relative is merged in eslintrc order — extends first, in order,
 * then the config's own keys.
 */
function resolveOwn(key: string): Resolved {
	const config = OWN_CONFIGS[key]
	if (!config) throw new Error(`eslint-plugin-harmony: unknown config '${key}'`)

	const resolved: Resolved = { rules: {} }
	const parents = config.extends === undefined
		? []
		: Array.isArray(config.extends) ? config.extends : [config.extends]

	for (const parent of parents) {
		if (!parent.startsWith('.')) continue
		const inherited = resolveOwn(toKey(key, parent))
		Object.assign(resolved.rules, inherited.rules)
		if (inherited.parser) resolved.parser = inherited.parser
	}

	Object.assign(resolved.rules, config.rules)
	if (config.parser) resolved.parser = config.parser

	return resolved
}

/** A flat config object, typed loosely so this package needs no `eslint` types at runtime. */
export type FlatConfig = {
	name: string,
	files?: string[],
	plugins: Record<string, unknown>,
	languageOptions?: Record<string, unknown>,
	rules: Record<string, unknown>
}

/**
 * The files the `ts-*` flat configs apply to.
 *
 * Flat config only lints a file some config's `files` matches, so without this
 * the TypeScript configs would silently lint nothing. eslintrc left the same
 * decision to the consumer's `overrides.files`, which the README told them to
 * set to exactly this.
 *
 * The parser is deliberately not set. eslintrc named `@typescript-eslint/parser`
 * and resolved it from this package; in flat config the parser is an object, and
 * pinning the copy this package depends on would override — and on ESLint 10,
 * break — the modern one `typescript-eslint` installs. The `ts-*` flat configs
 * are composed on top of `typescript-eslint`, which supplies parser and plugin.
 */
const TS_FILES = ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts']

/** The severity of a rule entry, in the `'off' | 'warn' | 'error'` spelling. */
function severityOf(entry: unknown): 'off' | 'warn' | 'error' {
	const value = Array.isArray(entry) ? entry[0] : entry
	if (value === 0 || value === 'off') return 'off'
	if (value === 1 || value === 'warn') return 'warn'
	return 'error'
}

function toFlat(key: string, plugin: unknown): FlatConfig[] {
	const { rules, parser } = resolveOwn(key)
	const languageOptions = LANGUAGE_OPTIONS[key]

	/**
	 * `plugin:@typescript-eslint/recommended` turned the core rule off wherever the
	 * typescript-eslint extension rule takes over. Flat config has no string
	 * `extends`, so that pairing is re-applied here — otherwise the core rule would
	 * come back on and double-report on TypeScript files.
	 */
	for (const [ruleId, entry] of Object.entries(rules)) {
		if (!ruleId.startsWith('@typescript-eslint/')) continue
		if (severityOf(entry) === 'off') continue
		const coreRuleId = ruleId.slice('@typescript-eslint/'.length)
		if (coreRuleId in rules && severityOf(rules[coreRuleId]) !== 'off') rules[coreRuleId] = 'off'
	}

	const config: FlatConfig = {
		name: `harmony/${key}`,
		plugins: { harmony: plugin },
		rules
	}
	if (parser) config.files = TS_FILES
	if (languageOptions) config.languageOptions = languageOptions
	return [config]
}

/**
 * Build the `flat/*` entries of `plugin.configs`.
 *
 * Each one is an array of flat config objects carrying the rules this package
 * owns, with `plugins.harmony` already wired to the plugin object, so
 * `extends: ['harmony/recommended']` in `defineConfig` resolves without the
 * consumer naming the plugin. The eslintrc entries beside them are untouched.
 */
export function createFlatConfigs(plugin: unknown): Record<string, FlatConfig[]> {
	const names = Object.keys(OWN_CONFIGS).filter((key) => !key.startsWith('style-parts/'))
	return Object.fromEntries(names.map((key) => [`flat/${key}`, toFlat(key, plugin)]))
}
