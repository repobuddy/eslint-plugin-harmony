import { TSESTree, AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'
import type { JSONSchema4, JSONSchema4ObjectSchema } from '@typescript-eslint/utils/json-schema'
import { createRule } from '../utils/createRule.js'

type Delimiter = 'comma' | 'none' | 'semi'

type TypeOptions = {
  delimiter?: Delimiter,
  requireLast?: boolean
}

type BaseOptions = {
  multiline?: {
    delimiter?: Delimiter,
    requireLast?: boolean
  },
  singleline?: {
    delimiter?: 'comma' | 'semi',
    requireLast?: boolean
  },
}
type Config = BaseOptions & {
  overrides?: {
    typeLiteral?: BaseOptions,
    interface?: BaseOptions
  },
}

type Options = [Config]
type MessageIds =
  | 'unexpectedComma'
  | 'unexpectedSemi'
  | 'expectedComma'
  | 'expectedSemi'

const definition: JSONSchema4ObjectSchema = {
  type: 'object',
  properties: {
    multiline: {
      type: 'object',
      properties: {
        delimiter: { type: 'string', enum: ['none', 'semi', 'comma'] },
        requireLast: { type: 'boolean' },
      },
      additionalProperties: false,
    },
    singleline: {
      type: 'object',
      properties: {
        // note can't have "none" for single line delimiter as it's invlaid syntax
        delimiter: { type: 'string', enum: ['semi', 'comma'] },
        requireLast: { type: 'boolean' },
      },
      additionalProperties: false,
    },
  },
  additionalProperties: false,
}

const overridesDefinition: JSONSchema4 = {
  type: 'object',
  properties: {
    interface: definition,
    typeLiteral: definition,
  },
  additionalProperties: false,
}

export default createRule<Options, MessageIds>({
  name: 'member-delimiter-style',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Require a specific member delimiter style for interfaces and type literals',
    },
    fixable: 'code',
    messages: {
      unexpectedComma: 'Unexpected separator (,).',
      unexpectedSemi: 'Unexpected separator (;).',
      expectedComma: 'Expected a comma.',
      expectedSemi: 'Expected a semicolon.',
    },
    schema: [
      {
        type: 'object',
        properties: {
          ...definition.properties,
          overrides: overridesDefinition,
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [
    {
      multiline: {
        delimiter: 'semi'
      },
      singleline: {
        delimiter: 'semi',
        requireLast: false,
      },
    },
  ],
  create(context, [options]) {
    // `context.getSourceCode()` was removed in ESLint 10; `context.sourceCode`
    // has been available since ESLint 8.40.
    const sourceCode = (context as unknown as { sourceCode?: ReturnType<typeof context.getSourceCode> })
      .sourceCode ?? context.getSourceCode()

    // use the base options as the defaults for the cases
    const baseOptions = options
    const overrides = baseOptions.overrides || {}
    const interfaceOptions: BaseOptions = ESLintUtils.deepMerge(
      baseOptions,
      overrides.interface,
    )
    const typeLiteralOptions: BaseOptions = ESLintUtils.deepMerge(
      baseOptions,
      overrides.typeLiteral,
    )

    /**
     * Check the member separator being used matches the delimiter.
     * @param {ASTNode} node the node to be evaluated.
     */
    function checkMemberSeparatorStyle(
      node: TSESTree.TSInterfaceBody | TSESTree.TSTypeLiteral,
    ): void {
      const isSingleLine = node.loc.start.line === node.loc.end.line
      const members = node.type === AST_NODE_TYPES.TSInterfaceBody ? node.body : node.members
      const typeOpts = node.type === AST_NODE_TYPES.TSInterfaceBody ? interfaceOptions : typeLiteralOptions
      const opts = isSingleLine ? typeOpts.singleline : typeOpts.multiline

      members.forEach((member, index) => {
        checkLastToken(member, opts || {}, index === members.length - 1)
      })
    }

    /**
     * Check the last token in the given member.
     * @param member the member to be evaluated.
     * @param opts the options to be validated.
     * @param isLast a flag indicating `member` is the last in the interface or type literal.
     */
    function checkLastToken(
      member: TSESTree.TypeElement,
      opts: TypeOptions,
      isLast: boolean,
    ): void {
      /**
       * Resolves the boolean value for the given setting enum value
       * @param type the option name
       */
      function getOption(type: Delimiter): boolean {
        if (isLast && opts.requireLast === undefined) {
          return false
        }

        if (isLast && !opts.requireLast) {
          // only turn the option on if its expecting no delimiter for the last member
          return type === 'none'
        }

        return opts.delimiter === type
      }

      let messageId: MessageIds | null = null
      let missingDelimiter = false
      const lastToken = sourceCode.getLastToken(member, {
        includeComments: false,
      })
      if (!lastToken) {
        return
      }

      const optsSemi = getOption('semi')
      const optsComma = getOption('comma')
      const optsNone = getOption('none')

      if (lastToken.value === ';') {
        if (optsComma) {
          messageId = 'expectedComma'
        }
        else if (optsNone) {
          missingDelimiter = true
          messageId = 'unexpectedSemi'
        }
      }
      else if (lastToken.value === ',') {
        if (optsSemi) {
          messageId = 'expectedSemi'
        }
        else if (optsNone) {
          missingDelimiter = true
          messageId = 'unexpectedComma'
        }
      }
      else {
        if (optsSemi) {
          missingDelimiter = true
          messageId = 'expectedSemi'
        }
        else if (optsComma) {
          missingDelimiter = true
          messageId = 'expectedComma'
        }
      }

      if (messageId) {
        context.report({
          node: lastToken,
          loc: {
            start: {
              line: lastToken.loc.end.line,
              column: lastToken.loc.end.column,
            },
            end: {
              line: lastToken.loc.end.line,
              column: lastToken.loc.end.column,
            },
          },
          messageId,
          fix(fixer) {
            if (optsNone) {
              // remove the unneeded token
              return fixer.remove(lastToken)
            }

            const token = optsSemi ? ';' : ','

            if (missingDelimiter) {
              // add the missing delimiter
              return fixer.insertTextAfter(lastToken, token)
            }

            // correct the current delimiter
            return fixer.replaceText(lastToken, token)
          },
        })
      }
    }

    return {
      TSInterfaceBody: checkMemberSeparatorStyle,
      TSTypeLiteral: checkMemberSeparatorStyle,
    }
  },
})
