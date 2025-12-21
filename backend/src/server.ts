import 'dotenv/config'
import express, { Request, Response, NextFunction } from 'express'
import cors from 'cors'
import path from 'path'
import authRouter from './web/auth.js'
import usersRouter from './web/users.js'
import institutionsRouter from './web/institutions.js'
import sectorsRouter from './web/sectors.js'
import measurementsRouter from './web/measurements.js'
import contactRouter from './web/contact.js'
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
app.use('/api/contact', contactRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ message: 'Erro interno' })
})

const port = process.env.PORT ? Number(process.env.PORT) : 4000
app.listen(port, () => {
  console.log(`API on http://localhost:${port}`)
})
