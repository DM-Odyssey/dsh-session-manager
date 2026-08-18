import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { clientBundle } from '../tsdown.client.ts'

// The repo's tsdown/rolldown leaves zod's interop binding as an external
// `require("zod")` in CJS browser output (a loader-table miss: zod is not a
// platform seed module). Forcing zod to its ESM entry makes the bundler
// inline it cleanly, like published bundles do. Portable: resolved from the
// workspace's 'zod' install regardless of checkout path.
const require = createRequire(import.meta.url)
const zodEsm = join(dirname(require.resolve('zod/package.json')), 'index.js')

const base = clientBundle('@deepseek-ai/dsh-client-ui-session-manager', ['lib/types/index.js'])

export default (env: unknown) => {
  const configs = base(env as never)
  for (const cfg of configs) {
    if (cfg && typeof cfg === 'object' && (cfg as { platform?: string }).platform === 'browser') {
      const plugins = ((cfg as { plugins?: unknown[] }).plugins ?? []) as unknown[]
      plugins.push({
        name: 'zod-esm-alias',
        resolveId(source: string) {
          return source === 'zod' ? zodEsm : null
        },
      })
      ;(cfg as { plugins?: unknown[] }).plugins = plugins
    }
  }
  return configs
}
