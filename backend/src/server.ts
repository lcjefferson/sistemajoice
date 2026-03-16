import 'dotenv/config'
import app from './app.js'

const port = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(port, '0.0.0.0', () => {
  console.log(`API on http://0.0.0.0:${port}`)
})
