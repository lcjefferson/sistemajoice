import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../db.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { q } = req.query
  const where = q ? { name: { contains: String(q) } } : {}
  const items = await prisma.institution.findMany({ where, orderBy: { name: 'asc' } })
  res.json({ items })
})

router.post('/', requireAuth, async (req, res) => {
  const { name } = req.body
  const inst = await prisma.institution.create({ data: { name } })
  res.json({ id: inst.id })
})

router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  await prisma.institution.update({ where: { id }, data: { name: req.body.name } })
  res.json({ ok: true })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.institution.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
