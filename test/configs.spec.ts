import { existsSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { ESLint, type Linter } from 'eslint'
import { describe, expect, test } from 'vitest'

/** vitest runs from the package root, which is also where the `.eslintrc` cascade starts. */
const rootDir = process.cwd()
const require = createRequire(path.join(rootDir, 'package.json'))

/**
 * The plugin the package publishes. Read from the build output so the suite
 * exercises what consumers actually install, not the sources.
 */
const plugin = await import(pathToFileURL(path.join(rootDir, 'lib', 'index.js')).href)

const allConfigs = plugin.configs as Record<string, unknown>

/** The eslintrc configs, reachable as `plugin:harmony/<name>` on ESLint 8 and 9. */
const configs: string[] = Object.keys(allConfigs).filter((name) => !name.startsWith('flat/'))

/** The flat configs, reachable as `harmony/<name>` from `eslint.config.js`. */
const flatConfigs: string[] = Object.keys(allConfigs).filter((name) => name.startsWith('flat/'))

/**
 * One ESLint instance per config, pointed at the built config file.
 *
 * `overrideConfigFile` layers the config under test on top of the `.eslintrc`
 * cascade, so `spec/<config>/.eslintrc` still supplies things a shareable config
 * cannot (`env`, `parserOptions.project`). That is the same layering the previous
 * gulp harness relied on.
 */
function lintFilesWith(config: string, files: string[]) {
	const eslint = new ESLint({
		cwd: rootDir,
		overrideConfigFile: require.resolve(path.join(rootDir, 'lib', config))
	})
	return eslint.lintFiles(files)
}

function fixtures(config: string, suffix: string) {
	const dir = path.join(rootDir, 'spec', config)
	if (!existsSync(dir)) return []
	return readdirSync(dir)
		.filter((f) => f.includes(suffix))
		.sort()
		.map((f) => path.join(dir, f))
}

function messagesOf(results: ESLint.LintResult[], file: string) {
	const result = results.find((r) => r.filePath === file)
	if (!result) throw new Error(`ESLint returned no result for ${file}`)
	return result.messages
}

function ruleIds(messages: Linter.LintMessage[]) {
	return messages.map((m) => m.ruleId).filter((id): id is string => !!id)
}

/** `<rule-id>.<count>.error.ts` / `<rule-id>.<count>.warn.js` */
function parseExpectation(file: string, kind: 'error' | 'warn') {
	const name = path.basename(file)
	const matches = new RegExp(`(.*)\\.(\\d+)\\.${kind}\\.(j|t)s$`).exec(name)
	if (!matches) {
		throw new Error(`Unable to process '${name}'. Missing number of ${kind}s expected?`)
	}
	return { ruleId: matches[1], count: Number(matches[2]) }
}

describe.each(configs)('%s', (config) => {
	const passFiles = fixtures(config, '.pass.')
	const errorFiles = fixtures(config, '.error.')
	const warnFiles = fixtures(config, '.warn.')

	test.skipIf(passFiles.length === 0)('clean code reports no error', async () => {
		const results = await lintFilesWith(config, passFiles)
		const offences = results.flatMap((r) =>
			r.messages
				.filter((m) => m.severity === 2)
				.map((m) => `${path.basename(r.filePath)}: ${m.ruleId ?? 'syntax'} — ${m.message}`)
		)
		expect(offences).toEqual([])
	})

	test.skipIf(errorFiles.length === 0)('violations are reported as errors', async () => {
		const results = await lintFilesWith(config, errorFiles)
		for (const file of errorFiles) {
			const { ruleId, count } = parseExpectation(file, 'error')
			const messages = messagesOf(results, file)
			const triggered = messages.filter((m) => m.ruleId === ruleId)
			expect(
				triggered.length,
				`${path.basename(file)} expected ${count} violation(s) of '${ruleId}', got ${
					triggered.length
				} (reported: ${ruleIds(messages).join(', ') || 'none'})`
			).toBe(count)

			const unexpected = [...new Set(ruleIds(messages).filter((id) => id !== ruleId))]
			expect(
				unexpected,
				`${path.basename(file)} triggered unexpected rule(s)`
			).toEqual([])
		}
	})

	test.skipIf(warnFiles.length === 0)('violations are reported as warnings', async () => {
		const results = await lintFilesWith(config, warnFiles)
		for (const file of warnFiles) {
			const { ruleId, count } = parseExpectation(file, 'warn')
			const messages = messagesOf(results, file)
			const triggered = messages.filter((m) => m.ruleId?.endsWith(ruleId))
			expect(
				triggered.length,
				`${path.basename(file)} expected ${count} warning(s) of '${ruleId}', got ${
					triggered.length
				} (reported: ${ruleIds(messages).join(', ') || 'none'})`
			).toBe(count)

			const unexpected = [...new Set(ruleIds(messages).filter((id) => !id.endsWith(ruleId)))]
			expect(
				unexpected,
				`${path.basename(file)} triggered unexpected rule(s)`
			).toEqual([])
		}
	})
})

describe('module shape', () => {
	test('the default export is the plugin', () => {
		expect(plugin.default.rules).toBe(plugin.rules)
		expect(plugin.default.configs).toBe(plugin.configs)
	})

	/**
	 * `@eslint/eslintrc` reads `configs` and `rules` off the module namespace with
	 * no `default` unwrapping, so an ESM plugin without these named exports loads
	 * on ESLint 8/9 with no rules at all.
	 */
	test('configs and rules are named exports', () => {
		expect(typeof plugin.configs).toBe('object')
		expect(Object.keys(plugin.rules)).toContain('ts-member-delimiter-style')
	})

	test('meta carries the package name and version', () => {
		expect(plugin.meta.name).toBe('eslint-plugin-harmony')
		expect(plugin.meta.version).toBe(require(path.join(rootDir, 'package.json')).version)
	})
})

/** The severity of a rule entry, in the `'off' | 'warn' | 'error'` spelling. */
function severityOf(entry: unknown): 'off' | 'warn' | 'error' {
	const value = Array.isArray(entry) ? entry[0] : entry
	if (value === 0 || value === 'off') return 'off'
	if (value === 1 || value === 'warn') return 'warn'
	return 'error'
}

/**
 * Rules whose flat severity deliberately differs from the eslintrc twin's.
 *
 * `flat/ts-prettier` keeps the rules `eslint-config-prettier` turns off in the
 * eslintrc chain: flat config has no string `extends`, so the consumer composes
 * `eslint-config-prettier` themselves and it turns them off again.
 */
const EXPECTED_SEVERITY_DRIFT: Record<string, string[]> = {
	'ts-prettier': ['object-curly-spacing']
}

describe('flat configs', () => {
	test('every eslintrc config has a flat twin', () => {
		expect(flatConfigs.sort()).toEqual(configs.map((name) => `flat/${name}`).sort())
	})

	describe.each(flatConfigs)('%s', (name) => {
		const config = allConfigs[name] as Array<Record<string, any>>

		test('is an array of flat config objects', () => {
			expect(Array.isArray(config)).toBe(true)
			for (const entry of config) {
				expect(entry.name).toMatch(/^harmony\//)
				expect(Object.keys(entry.rules).length).toBeGreaterThan(0)
				// eslintrc keys have no meaning in flat config and make ESLint reject the config
				expect(entry.extends).toBeUndefined()
				expect(entry.env).toBeUndefined()
				expect(entry.overrides).toBeUndefined()
				expect(entry.parserOptions).toBeUndefined()
			}
		})

		test('registers the plugin as an object', () => {
			for (const entry of config) {
				expect(entry.plugins.harmony).toBe(plugin.default)
			}
		})

		test('matches the severities its eslintrc twin computes', async () => {
			const twin = name.slice('flat/'.length)
			const isTs = twin.startsWith('ts-')
			// `useEslintrc` keeps the repo's own `.eslintrc` out of the computed config.
			// It is an eslintrc-era option the flat-first `@types/eslint` no longer declares.
			const eslint = new ESLint({
				cwd: rootDir,
				useEslintrc: false,
				overrideConfigFile: require.resolve(path.join(rootDir, 'lib', twin))
			} as unknown as ESLint.Options)
			const eslintrc = await eslint.calculateConfigForFile(isTs ? 'x.ts' : 'x.js')
			const allowed = EXPECTED_SEVERITY_DRIFT[twin] ?? []

			const drift = Object.entries(config[0].rules)
				.filter(([ruleId]) => !allowed.includes(ruleId))
				.filter(([ruleId, entry]) => severityOf(eslintrc.rules?.[ruleId] ?? 'off') !== severityOf(entry))
				.map(([ruleId]) => ruleId)

			expect(drift).toEqual([])
		})
	})

	test('flat/recommended reports the same violations ESLint 10 consumers see', async () => {
		const { FlatESLint } = require('eslint/use-at-your-own-risk')
		const eslint = new FlatESLint({
			overrideConfigFile: true,
			overrideConfig: allConfigs['flat/recommended']
		})
		const results = await eslint.lintText('var msg = "double"\nconsole.log(msg)\n', { filePath: 'bad.js' })
		expect(ruleIds(results[0].messages).sort()).toEqual(['no-console', 'quotes'])
	})

	test('flat/ts-recommended runs the harmony rule on TypeScript', async () => {
		const { FlatESLint } = require('eslint/use-at-your-own-risk')
		const eslint = new FlatESLint({
			overrideConfigFile: true,
			overrideConfig: [
				{
					files: ['**/*.ts'],
					languageOptions: { parser: require('@typescript-eslint/parser') },
					plugins: { '@typescript-eslint': require('@typescript-eslint/eslint-plugin') }
				},
				...(allConfigs['flat/ts-recommended'] as unknown[])
			]
		})
		const results = await eslint.lintText('type Person = { name: string; age: number }\nexport type { Person }\n', {
			filePath: 'bad.ts'
		})
		expect(ruleIds(results[0].messages)).toContain('harmony/ts-member-delimiter-style')
	})
})
