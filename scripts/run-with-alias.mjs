import createJiti from 'jiti'
import path from 'node:path'

const root = path.resolve('.')
const jiti = createJiti(import.meta.url, {
  alias: {
    '@': root,
  },
})

const targetScript = process.argv[2] || 'scripts/test-weekly-copy-local.ts'
await jiti.import(path.resolve(root, targetScript))
