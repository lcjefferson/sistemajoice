import { Router } from 'express'
import { prisma } from '../db.js'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body
  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) return res.status(400).json({ message: 'E-mail já cadastrado' })
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { name, email, password: hash, role } })
  res.json({ id: user.id })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return res.status(401).json({ message: 'Credenciais inválidas' })
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return res.status(401).json({ message: 'Credenciais inválidas' })
  const secret = process.env.JWT_SECRET
  if (!secret) return res.status(500).json({ message: 'Configuração ausente de JWT' })
  const token = jwt.sign({ sub: user.id, name: user.name, role: user.role, language: user.language }, secret, { expiresIn: '12h' })
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, language: user.language } })
})

router.get('/me', requireAuth, async (req: any, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } })
  if (!user) return res.status(404).json({ message: 'Usuário não encontrado' })
  res.json({ id: user.id, name: user.name, email: user.email, role: user.role, language: user.language })
})

router.put('/me/language', requireAuth, async (req: any, res) => {
  const { language } = req.body
  if (!['pt', 'en', 'es'].includes(language)) {
    return res.status(400).json({ message: 'Idioma inválido' })
  }
  await prisma.user.update({ where: { id: req.user.id }, data: { language } })
  res.json({ ok: true })
})

export default router
