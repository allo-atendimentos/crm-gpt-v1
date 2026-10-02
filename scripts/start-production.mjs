import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = process.env.NEXT_DIST_DIR || '.next'
process.env.HOSTNAME = process.env.BIND_HOST || '0.0.0.0'
await import(pathToFileURL(path.join(root, dist, 'standalone', 'server.js')).href)
