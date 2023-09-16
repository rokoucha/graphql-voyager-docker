import { graphqlServer } from '@hono/graphql-server'
import { serve } from '@hono/node-server'
import { glob } from 'glob'
import GlobWatcher from 'glob-watcher'
import { buildSchema } from 'graphql'
import { renderVoyagerPage } from 'graphql-voyager/middleware/index.js'
import { Hono } from 'hono'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000
const pattern = process.argv.slice(2)
const basePath = process.env.BASE_PATH ?? process.cwd()

async function createSchema() {
  const schemas = await glob(pattern, { cwd: basePath })

  const contents = await Promise.all(
    schemas.map((s) => readFile(join(basePath, s), { encoding: 'utf8' })),
  )

  const schema = buildSchema(contents.join('\n'))

  return graphqlServer({
    schema,
  })
}

let graphqlHandler = await createSchema()

GlobWatcher(pattern, { cwd: basePath }, async (done) => {
  console.log('Schema changed, reloading...')

  graphqlHandler = await createSchema()

  done()
})

const app = new Hono()

app.use('/graphql', (c) => graphqlHandler(c))
app.use('/', async (c) => {
  c.header('Content-Type', 'text/html')
  return c.body(renderVoyagerPage({ endpointUrl: '/graphql' }))
})

const server = serve({
  fetch: app.fetch,
  port,
})
console.log(`Listening on http://localhost:${port}`)
