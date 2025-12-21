import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { computeStatus, limits } from '../utils/validation.js'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import PDFDocument from 'pdfkit'
import ExcelJS from 'exceljs'
import { prisma } from '../db.js'

const router = Router()

const uploadDir = process.env.UPLOAD_DIR ? String(process.env.UPLOAD_DIR) : path.join(process.cwd(), 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, Date.now() + '_' + file.originalname.replace(/\s+/g, '_'))
})
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } })

router.get('/', requireAuth, async (req, res) => {
  const { institutionId, sectorId, from, to, q } = req.query as any
  const where: any = {}
  if (institutionId) where.institutionId = String(institutionId)
  if (sectorId) where.sectorId = String(sectorId)
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
  if (q) {
    where.OR = [
      { institution: { name: { contains: String(q) } } },
      { sector: { name: { contains: String(q) } } }
    ]
  }
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
  const { institution, sector, files, id, createdAt, updatedAt, userId: _u, ...data } = req.body
  const status = computeStatus(data)
  const m = await prisma.measurement.create({
    data: { ...data, status, userId: user.id, date: new Date(data.date) }
  })
  res.json({ id: m.id })
})

router.put('/:id', requireAuth, async (req, res) => {
  const { institution, sector, files, id, createdAt, updatedAt, userId: _u, ...data } = req.body
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

router.post('/:id/files', requireAuth, upload.array('files', 20), async (req, res) => {
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
  const { institutionId, sectorId, from, to, status } = req.query as any
  const where: any = {}
  if (institutionId) where.institutionId = institutionId
  if (sectorId) where.sectorId = sectorId
  if (status) where.status = status
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
  let items = await prisma.measurement.findMany({ where, orderBy: { date: 'asc' } })

  if (status === 'Não Conforme') {
    items = items.map(m => {
      const newItem = { ...m }
      if (m.temperature >= limits.temperatureMin && m.temperature <= limits.temperatureMax) newItem.temperature = 0
      if (m.humidity >= limits.humidityMin && m.humidity <= limits.humidityMax) newItem.humidity = 0
      if (m.airSpeed <= limits.airSpeed) newItem.airSpeed = 0
      if (m.fungiInternal <= limits.fungiInternal) { newItem.fungiInternal = 0; newItem.fungiExternal = 0 }
      if (m.ieRatio <= limits.ieMax) newItem.ieRatio = 0
      if (m.aerodispersoids <= limits.aerodispersoids) newItem.aerodispersoids = 0
      if (m.bacteriaInternal <= limits.bacteriaInternal) { newItem.bacteriaInternal = 0; newItem.bacteriaExternal = 0 }
      if ((m.co2Internal - m.co2External) <= 700 && m.co2Internal <= limits.co2) { newItem.co2Internal = 0; newItem.co2External = 0 }
      if (m.pm10 <= limits.pm10) newItem.pm10 = 0
      if (m.pm25 <= limits.pm25) newItem.pm25 = 0
      return newItem
    })
  }

  const kpis = {
    temperatureAvg: avg(items.map(i => i.temperature)),
    humidityAvg: avg(items.map(i => i.humidity)),
    airSpeedAvg: avg(items.map(i => i.airSpeed)),
    fungiInternalAvg: avg(items.map(i => i.fungiInternal)),
    fungiExternalAvg: avg(items.map(i => i.fungiExternal)),
    ieRatioAvg: avg(items.map(i => i.ieRatio)),
    aerodispersoidsAvg: avg(items.map(i => i.aerodispersoids)),
    bacteriaInternalAvg: avg(items.map(i => i.bacteriaInternal)),
    bacteriaExternalAvg: avg(items.map(i => i.bacteriaExternal)),
    co2InternalAvg: avg(items.map(i => i.co2Internal)),
    co2ExternalAvg: avg(items.map(i => i.co2External)),
    pm10Avg: avg(items.map(i => i.pm10)),
    pm25Avg: avg(items.map(i => i.pm25)),
    compliantCount: items.filter(i => i.status === 'Conforme').length,
    nonCompliantCount: items.filter(i => i.status !== 'Conforme').length
  }
  const series = items.map(i => ({
    date: i.date.toISOString().slice(0, 10),
    temperature: i.temperature,
    humidity: i.humidity,
    airSpeed: i.airSpeed,
    fungiInternal: i.fungiInternal,
    fungiExternal: i.fungiExternal,
    ieRatio: i.ieRatio,
    aerodispersoids: i.aerodispersoids,
    bacteriaInternal: i.bacteriaInternal,
    bacteriaExternal: i.bacteriaExternal,
    co2Internal: i.co2Internal,
    co2External: i.co2External,
    pm10: i.pm10,
    pm25: i.pm25
  }))
  res.json({ kpis, series, limits })
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
      'Fungos Int',
      'Fungos Ext',
      'Relação I/E',
      'Bactérias Int',
      'Status',
      'Latitude',
      'Longitude'
    ])
    for (const i of items)
      ws.addRow([
        i.date.toISOString(),
        i.institution?.name ?? i.institutionId,
        i.sector?.name ?? i.sectorId,
        i.temperature,
        i.humidity,
        i.fungiInternal,
        i.fungiExternal,
        i.ieRatio,
        i.bacteriaInternal,
        i.status,
        i.latitude,
        i.longitude
      ])
    const buf = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio.xlsx"')
    return res.send(Buffer.from(buf))
  }

  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  doc.on('end', () => {
    const pdf = Buffer.concat(chunks)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio.pdf"')
    res.send(pdf)
  })

  const logoPath = path.join(process.cwd(), '../frontend/public/logo.png')
  const systemName = 'Air Watch'
  const slogan = 'Qualidade do Ar Interior - Monitoramento e Gestão'

  let pageNumber = 1

  const drawHeader = () => {
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 30, 20, { height: 40 })
      } catch (e) {
        console.error('Erro ao carregar logo:', e)
      }
    }
    doc.fontSize(18).text('Relatório de Medições', 0, 35, { align: 'center' })
  }

  const drawFooter = () => {
    const bottom = doc.page.height - 40
    doc.fontSize(8)
    doc.text(
      `${systemName} - ${slogan} | Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      30,
      bottom,
      { align: 'center', width: doc.page.width - 60 }
    )
  }

  const headers = [
    'Data', 'Instituição', 'Setor', 'Temp', 'Umid',
    'Fungos Int', 'Fungos Ext', 'Rel I/E', 'Bact Int', 'Status', 'Coord'
  ]
  const widths = [60, 100, 90, 40, 40, 60, 60, 50, 60, 70, 100] // Total 730
  const startX = 30
  let y = 100

  const drawTableHead = () => {
    doc.fontSize(9).font('Helvetica-Bold')
    let x = startX
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: widths[i], align: 'left' })
      x += widths[i]
    })
    y += 20
    doc.moveTo(startX, y - 5).lineTo(startX + widths.reduce((a, b) => a + b, 0), y - 5).stroke()
    doc.font('Helvetica')
  }

  drawHeader()
  drawTableHead()
  drawFooter()

  for (const i of items) {
    if (y > doc.page.height - 60) {
      doc.addPage()
      pageNumber++
      y = 100
      drawHeader()
      drawTableHead()
      drawFooter()
    }

    const nmI = i.institution?.name ?? i.institutionId
    const nmS = i.sector?.name ?? i.sectorId
    const d = i.date
    const pp = (n: number) => String(n).padStart(2, '0')
    const s = `${pp(d.getDate())}/${pp(d.getMonth() + 1)}/${d.getFullYear()}`
    const coord = i.latitude && i.longitude ? `${i.latitude.toFixed(4)}, ${i.longitude.toFixed(4)}` : '-'

    const row = [
      s,
      nmI,
      nmS,
      String(i.temperature),
      String(i.humidity),
      String(i.fungiInternal),
      String(i.fungiExternal),
      String(i.ieRatio),
      String(i.bacteriaInternal),
      i.status,
      coord
    ]

    doc.fontSize(8)
    let x = startX
    row.forEach((cell, idx) => {
      doc.text(cell, x, y, { width: widths[idx], align: 'left' })
      x += widths[idx]
    })
    y += 15
  }

  doc.end()
})

router.get('/:id/report', requireAuth, async (req, res) => {
  const { id } = req.params
  const m = await prisma.measurement.findUnique({
    where: { id },
    include: { institution: true, sector: true, user: true }
  })
  if (!m) return res.status(404).json({ message: 'Medição não encontrada' })
  const doc = new PDFDocument({ 
    size: 'A4',
    margins: {
      top: 50,
      bottom: 20,
      left: 50,
      right: 50
    }
  })
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

  const logoPath = path.join(process.cwd(), '../frontend/public/logo.png')
  const systemName = 'Air Watch'
  const slogan = 'Qualidade do Ar Interior - Monitoramento e Gestão'

  const drawHeader = () => {
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 30, { height: 40 })
      } catch (e) {
        console.error('Erro ao carregar logo:', e)
      }
    }
    doc.fontSize(18).fillColor('black').text('Relatório de Medição', 0, 45, { align: 'center' })
    
    // Linha verde limão
    doc.lineWidth(2)
       .moveTo(50, 85)
       .lineTo(545, 85)
       .strokeColor('#32CD32')
       .stroke()
  }

  const drawFooter = () => {
    const bottom = doc.page.height - 50
    
    // Linha verde limão
    doc.lineWidth(1)
       .moveTo(50, bottom - 15)
       .lineTo(545, bottom - 15)
       .strokeColor('#32CD32')
       .stroke()

    doc.fontSize(8).fillColor('gray')
    doc.text(
      `${systemName} - ${slogan} | Gerado em: ${new Date().toLocaleString('pt-BR')}`,
      50,
      bottom,
      { align: 'center', width: doc.page.width - 100 }
    )
  }

  doc.on('pageAdded', () => {
    drawHeader()
    drawFooter()
  })

  drawHeader()
  drawFooter()

  doc.y = 110

  // Informações Gerais
  doc.fontSize(12).fillColor('black').font('Helvetica-Bold').text('Informações Gerais')
  doc.moveDown(0.5)
  
  const pad = (n: number) => String(n).padStart(2, '0')
  const dt = m.date
  const stamp = `${pad(dt.getDate())}/${pad(dt.getMonth() + 1)}/${dt.getFullYear()} | ${pad(dt.getHours())}:${pad(dt.getMinutes())}`

  doc.font('Helvetica').fontSize(10)
  doc.text(`Data/Hora: ${stamp}`)
  doc.text(`Instituição: ${m.institution?.name ?? m.institutionId}`)
  doc.text(`Setor: ${m.sector?.name ?? m.sectorId}`)
  doc.text(`Responsável: ${m.user?.name ?? m.userId}`)
  doc.text(`Status Global: ${m.status}`)
  
  doc.moveDown(2)

  // Tabela de Parâmetros
  doc.fontSize(12).font('Helvetica-Bold').text('Parâmetros Analisados')
  doc.moveDown(0.5)

  const coord = m.latitude && m.longitude ? `${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}` : 'Não registrado'

  const rows: [string, string][] = [
    ['Temperatura (C)', String(m.temperature)],
    ['Umidade (%)', String(m.humidity)],
    ['Velocidade do ar (m/s)', String(m.airSpeed)],
    ['Fungos Internos (UFC/m3)', String(m.fungiInternal)],
    ['Fungos Externos (UFC/m3)', String(m.fungiExternal)],
    ['Relação I/E', String(m.ieRatio)],
    ['Aerodispersóides (ug/m3)', String(m.aerodispersoids)],
    ['Bactérias Internas (UFC/m3)', String(m.bacteriaInternal)],
    ['Bactérias Externas (UFC/m3)', String(m.bacteriaExternal)],
    ['CO2 Interno (ppm)', String(m.co2Internal)],
    ['CO2 Externo (ppm)', String(m.co2External)],
    ['PM10 (ug/m3)', String(m.pm10)],
    ['PM2.5 (ug/m3)', String(m.pm25)],
    ['Localização', coord]
  ]

  // Configuração da tabela
  const startX = 50
  const col1Width = 300
  const col2Width = 150
  const rowHeight = 20
  
  // Cabeçalho da tabela
  const headerY = doc.y
  doc.fillColor('#f0f0f0').rect(startX, headerY, col1Width + col2Width, rowHeight).fill()
  doc.fillColor('black').font('Helvetica-Bold').fontSize(10)
  doc.text('Parâmetro', startX + 10, headerY + 5)
  doc.text('Valor Medido', startX + col1Width + 10, headerY + 5)
  
  doc.y = headerY + rowHeight

  // Linhas da tabela
  doc.font('Helvetica').fontSize(10)
  rows.forEach(([param, value], index) => {
    const cellY = doc.y
    // Fundo alternado
    if (index % 2 === 0) {
      doc.fillColor('#fafafa').rect(startX, cellY, col1Width + col2Width, rowHeight).fill()
    }
    
    doc.fillColor('black')
    // Bordas (opcional, aqui usando apenas linhas finas se quiser, mas fundo alternado ajuda)
    // Vamos desenhar o texto
    doc.text(param, startX + 10, cellY + 5)
    doc.text(value, startX + col1Width + 10, cellY + 5)
    
    doc.y = cellY + rowHeight
    
    // Verifica quebra de página
    if (doc.y > doc.page.height - 100) {
      doc.addPage()
      doc.y = 110 // Reset Y após header
    }
  })

  doc.end()
})

function avg(list: number[]) {
  if (!list.length) return 0
  return list.reduce((a, b) => a + b, 0) / list.length
}

export default router
