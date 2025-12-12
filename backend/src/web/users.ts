import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth'
import bcrypt from 'bcryptjs'
import { prisma } from '../db'

const router = Router()

router.get('/', requireAuth, async (_req, res) => {
  const items = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true } })
  res.json({ items })
})

router.post('/', requireAuth, requireRole('admin'), async (req, res) => {
  const { name, email, password, role } = req.body
  const hash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({ data: { name, email, password: hash, role } })
  res.json({ id: user.id })
})

router.put('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  const { id } = req.params
  const { name, email, role, password } = req.body
  const data: any = { name, email, role }
  if (password) data.password = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id }, data })
  res.json({ ok: true })
})

router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
