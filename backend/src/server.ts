import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import authRouter from './web/auth.js'
import usersRouter from './web/users.js'
import institutionsRouter from './web/institutions.js'
import sectorsRouter from './web/sectors.js'
import measurementsRouter from './web/measurements.js'
import { prisma } from './db.js'

const app = express()
app.use(cors({ origin: true, exposedHeaders: ['Content-Disposition'] }))
app.use(express.json({ limit: '2mb' }))
const uploadDir = process.env.UPLOAD_DIR ? String(process.env.UPLOAD_DIR) : path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadDir))

app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/institutions', institutionsRouter)
app.use('/api/sectors', sectorsRouter)
app.use('/api/measurements', measurementsRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

const port = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(port, () => {
  console.log(`API on http://localhost:${port}`)
})
