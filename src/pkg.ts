import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

export const pkg = require('../package.json') as { version: string }
