import { Router } from 'express'
import { prisma } from '../db'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

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
  const secret = process.env.JWT_SECRET!
  const token = jwt.sign({ sub: user.id, name: user.name, role: user.role }, secret, { expiresIn: '12h' })
  res.json({ token })
})

export default router
