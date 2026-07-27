import 'dotenv/config'
import app from './app.js'
import { seedIfEmpty } from './seed.js'

const port = process.env.PORT ? Number(process.env.PORT) : 4000

async function start() {
  if (process.env.SEED_ON_START === 'true') {
    await seedIfEmpty()
  }
  app.listen(port, '0.0.0.0', () => {
    console.log(`API on http://0.0.0.0:${port}`)
  })
}

start().catch((err) => {
  console.error('Falha ao iniciar API', err)
  process.exit(1)
})
