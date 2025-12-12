import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import authRouter from './web/auth'
import usersRouter from './web/users'
import institutionsRouter from './web/institutions'
import sectorsRouter from './web/sectors'
import measurementsRouter from './web/measurements'
import { prisma } from './db'

const app = express()
app.use(cors({ origin: true, exposedHeaders: ['Content-Disposition'] }))
app.use(express.json({ limit: '2mb' }))
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

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
