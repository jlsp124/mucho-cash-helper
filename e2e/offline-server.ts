import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, sep, extname } from 'node:path'

// WebKit's setOffline rejects SW responses in Playwright 1.63 (#42775).
// Shutting down an isolated origin tests real cache fallback, without skipping
// reload or changing application behavior. Bind loopback only.
export async function offlineTestServer() {
  const root = resolve('dist')
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
  }
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url!, 'http://localhost').pathname
      if (!pathname.startsWith('/mucho-cash-helper/')) {
        res.writeHead(404).end()
        return
      }
      const relative = pathname.slice('/mucho-cash-helper/'.length) || 'index.html'
      const file = resolve(root, relative)
      if (!file.startsWith(root + sep)) {
        res.writeHead(404).end()
        return
      }
      const data = await readFile(file)
      res
        .writeHead(200, {
          'Content-Type': types[extname(file)] ?? 'application/octet-stream',
          Connection: 'close',
        })
        .end(data)
    } catch {
      res.writeHead(404).end()
    }
  })
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Test server did not bind')
  return {
    url: `http://127.0.0.1:${address.port}/mucho-cash-helper/`,
    close: () =>
      !server.listening
        ? Promise.resolve()
        : new Promise<void>((done, reject) =>
            server.close((error) => (error ? reject(error) : done())),
          ),
  }
}
