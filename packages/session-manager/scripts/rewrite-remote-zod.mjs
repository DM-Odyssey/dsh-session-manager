import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const target = join(here, '..', 'lib', 'typert.remote-client.js')
let s = readFileSync(target, 'utf8')

s = s.replace(
  "import { z } from 'zod'",
  "import { array, boolean, literal, number, object, string, union, undefined as _zod_undefined } from 'zod'",
)
const repl = {
  'z.string(': 'string(',
  'z.boolean(': 'boolean(',
  'z.object(': 'object(',
  'z.number(': 'number(',
  'z.array(': 'array(',
  'z.literal(': 'literal(',
  'z.union(': 'union(',
  'z.undefined(': '_zod_undefined(',
}
for (const [from, to] of Object.entries(repl)) s = s.split(from).join(to)
writeFileSync(target, s)
console.log('rewrote', target)
