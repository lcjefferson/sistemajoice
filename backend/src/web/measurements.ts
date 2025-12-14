import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { computeStatus } from '../utils/validation'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import { prisma } from '../db'

const router = Router()

const uploadDir = process.env.UPLOAD_DIR ? String(process.env.UPLOAD_DIR) : path.join(process.cwd(), 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_'))
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

router.get('/', requireAuth, async (req, res) => {
  const { institutionId, sectorId, from, to } = req.query as any
  const where: any = {}
  if (institutionId) where.institutionId = String(institutionId)
  if (sectorId) where.sectorId = String(sectorId)
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
  const page = Number((req.query as any).page || 1)
  const pageSize = Number((req.query as any).pageSize || 10)
  const skip = Math.max(0, (page - 1) * pageSize)
  const [items, total] = await prisma.$transaction([
    prisma.measurement.findMany({
      where,
      orderBy: { date: 'desc' },
      skip,
      take: pageSize,
      include: { institution: true, sector: true, files: true }
    }),
    prisma.measurement.count({ where })
  ])
  res.json({ items, total, page, pageSize })
})

router.post('/', requireAuth, async (req, res) => {
  const user = (req as any).user
  const data = req.body
  const status = computeStatus(data)
  const m = await prisma.measurement.create({
    data: { ...data, status, userId: user.id, date: new Date(data.date) }
  })
  res.json({ id: m.id })
})

router.put('/:id', requireAuth, async (req, res) => {
  const data = req.body
  const status = computeStatus(data)
  await prisma.measurement.update({
    where: { id: req.params.id },
    data: { ...data, status, date: new Date(data.date) }
  })
  res.json({ ok: true })
})

router.delete('/:id', requireAuth, async (req, res) => {
  await prisma.file.deleteMany({ where: { measurementId: req.params.id } })
  await prisma.measurement.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

router.post('/:id/files', requireAuth, upload.array('files', 5), async (req, res) => {
  const id = req.params.id
  const files = (req.files as Express.Multer.File[]) || []
  const category = String((req.query as any).category || '') || null
  const created = await prisma.$transaction(
    files.map(f =>
      prisma.file.create({
        data: {
          measurementId: id,
          name: f.originalname,
          path: '/uploads/' + path.basename(f.path),
          mime: f.mimetype,
          size: f.size,
          category: category ?? undefined
        }
      })
    )
  )
  res.json({ files: created })
})

router.get('/bi', requireAuth, async (req, res) => {
  const { institutionId, sectorId, from, to } = req.query as any
  const where: any = {}
  if (institutionId) where.institutionId = institutionId
  if (sectorId) where.sectorId = sectorId
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
  const items = await prisma.measurement.findMany({ where, orderBy: { date: 'asc' } })
  const kpis = {
    temperatureAvg: avg(items.map(i => i.temperature)),
    humidityAvg: avg(items.map(i => i.humidity)),
    compliantCount: items.filter(i => i.status === 'Conforme').length,
    nonCompliantCount: items.filter(i => i.status !== 'Conforme').length
  }
  const series = items.map(i => ({
    date: i.date.toISOString().slice(0, 10),
    temperature: i.temperature,
    humidity: i.humidity
  }))
  res.json({ kpis, series })
})

router.get('/report', requireAuth, async (req, res) => {
  const { format = 'pdf', institutionId, sectorId, from, to, limit } = req.query as any
  const where: any = {}
  if (institutionId) where.institutionId = String(institutionId)
  if (sectorId) where.sectorId = String(sectorId)
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
  const take = Math.min(Number(limit || 500), 2000)
  const items = await prisma.measurement.findMany({
    where,
    orderBy: { date: 'desc' },
    take,
    include: { institution: true, sector: true }
  })
  if (String(format) === 'excel') {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Medições')
    ws.addRow([
      'Data',
      'Instituição',
      'Setor',
      'Temp (°C)',
      'Umidade (%)',
      'CO2 Int (ppm)',
      'CO2 Ext (ppm)',
      'Status'
    ])
    for (const i of items)
      ws.addRow([
        i.date.toISOString(),
        i.institution?.name ?? i.institutionId,
        i.sector?.name ?? i.sectorId,
        i.temperature,
        i.humidity,
        i.co2Internal,
        i.co2External,
        i.status
      ])
    const buf = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio.xlsx"')
    return res.send(Buffer.from(buf))
  }
  const doc = new PDFDocument({ margin: 40 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  doc.on('end', () => {
    const pdf = Buffer.concat(chunks)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio.pdf"')
    res.send(pdf)
  })
  doc.fontSize(16).text('Relatório de Medições', { align: 'center' })
  doc.moveDown()
  doc.fontSize(10)
  items.forEach(i => {
    const nmI = i.institution?.name ?? i.institutionId
    const nmS = i.sector?.name ?? i.sectorId
    const d = i.date
    const pp = (n: number) => String(n).padStart(2, '0')
    const s = `${pp(d.getDate())}/${pp(d.getMonth() + 1)}/${d.getFullYear()}`
    doc.text(
      `${s} | ${nmI} > ${nmS} | Temp: ${i.temperature} °C | Umid: ${i.humidity}% | Status: ${i.status}`
    )
  })
  doc.end()
})

router.get('/:id/report', requireAuth, async (req, res) => {
  const { id } = req.params
  const m = await prisma.measurement.findUnique({
    where: { id },
    include: { institution: true, sector: true, user: true }
  })
  if (!m) return res.status(404).json({ message: 'Medição não encontrada' })
  const doc = new PDFDocument({ margin: 40 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  doc.on('end', () => {
    const pdf = Buffer.concat(chunks)
    res.setHeader('Content-Type', 'application/pdf')
    const inst = m.institution?.name ?? m.institutionId
    const sec = m.sector?.name ?? m.sectorId
    const fname = `medicao_${m.date.toISOString().slice(0, 10)}_${inst}_${sec}.pdf`.replace(/\s+/g, '_')
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`)
    res.send(pdf)
  })
  doc.fontSize(18).text('Relatório de Medição', { align: 'center' })
  doc.moveDown()
  doc.fontSize(12)
  const pad = (n: number) => String(n).padStart(2, '0')
  const dt = m.date
  const stamp = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} | ${pad(dt.getHours())}:${pad(
    dt.getMinutes()
  )}`
  doc.text(`Data: ${stamp}`)
  doc.text(`Instituição: ${m.institution?.name ?? m.institutionId}`)
  doc.text(`Setor: ${m.sector?.name ?? m.sectorId}`)
  doc.text(`Responsável: ${m.user?.name ?? m.userId}`)
  doc.text(`Status: ${m.status}`)
  doc.moveDown()
  const rows: [string, string][] = [
    ['Temperatura (°C)', String(m.temperature)],
    ['Umidade (%)', String(m.humidity)],
    ['Velocidade do ar (m/s)', String(m.airSpeed)],
    ['Fungos Internos (UFC/m³)', String(m.fungiInternal)],
    ['Fungos Externos (UFC/m³)', String(m.fungiExternal)],
    ['Relação I/E', String(m.ieRatio)],
    ['Aerodispersóides (μg/m³)', String(m.aerodispersoids)],
    ['Bactérias Internas (UFC/m³)', String(m.bacteriaInternal)],
    ['Bactérias Externas (UFC/m³)', String(m.bacteriaExternal)],
    ['CO₂ Interno (ppm)', String(m.co2Internal)],
    ['CO₂ Externo (ppm)', String(m.co2External)],
    ['PM10 (µg/m³)', String(m.pm10)],
    ['PM2.5 (µg/m³)', String(m.pm25)]
  ]
  rows.forEach(([k, v]) => doc.text(`${k}: ${v}`))
  doc.end()
})

function avg(list: number[]) {
  if (!list.length) return 0
  return list.reduce((a, b) => a + b, 0) / list.length
}

export default router
