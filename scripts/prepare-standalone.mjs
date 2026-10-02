import { access, cp } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = process.env.NEXT_DIST_DIR || '.next'
const standalone = path.join(root, dist, 'standalone')
await access(path.join(standalone, 'server.js'))
await cp(path.join(root, 'public'), path.join(standalone, 'public'), { recursive: true })
await cp(path.join(root, dist, 'static'), path.join(standalone, dist, 'static'), { recursive: true })
console.log('Standalone pronto com arquivos públicos e assets estáticos.')
