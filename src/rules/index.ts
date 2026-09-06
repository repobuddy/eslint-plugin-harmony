import { type TSESLint } from '@typescript-eslint/utils'
import tsMemberDelimiterStyle from './ts-member-delimiter-style.js'

/**
 * Annotated rather than inferred: the inferred rule type reaches into
 * `@typescript-eslint/utils` internals, which a declaration file cannot name.
 */
export const rules: Record<string, TSESLint.RuleModule<string, readonly unknown[]>> = {
  'ts-member-delimiter-style': tsMemberDelimiterStyle
}
