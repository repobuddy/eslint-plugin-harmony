import { ESLintUtils } from '@typescript-eslint/utils'
import { pkg } from '../pkg.js'

export const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/unional/eslint-plugin-harmony/blob/v${pkg.version}/docs/rules/${name}.md`
)
