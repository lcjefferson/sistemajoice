import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../db.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  const { institutionId, q } = req.query
  const where: any = {}
  if (institutionId) where.institutionId = String(institutionId)
  if (q) where.name = { contains: String(q) }
  const items = await prisma.sector.findMany({ where, orderBy: { name: 'asc' } })
  res.json({ items })
})

router.post('/', requireAuth, async (req, res) => {
  const { name, institutionId } = req.body
  const s = await prisma.sector.create({ data: { name, institutionId } })
  res.json({ id: s.id })
})

router.put('/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const { name, institutionId } = req.body
  await prisma.sector.update({ where: { id }, data: { name, institutionId } })
  res.json({ ok: true })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.sector.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
