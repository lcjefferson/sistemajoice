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

function getComputedStatus(m: {
  humidity: number
  airSpeed: number
  temperature: number
  fungiInternal: number
  fungiExternal: number
  ieRatio: number
  bacteriaInternal: number
  bacteriaExternal: number
  co2Internal: number
  co2External: number
  pm10: number
  pm25: number
}) {
  return computeStatus({
    humidity: Number(m.humidity),
    airSpeed: Number(m.airSpeed),
    temperature: Number(m.temperature),
    fungiInternal: Number(m.fungiInternal),
    fungiExternal: Number(m.fungiExternal),
    ieRatio: Number(m.ieRatio),
    bacteriaInternal: Number(m.bacteriaInternal),
    bacteriaExternal: Number(m.bacteriaExternal),
    co2Internal: Number(m.co2Internal),
    co2External: Number(m.co2External),
    pm10: Number(m.pm10),
    pm25: Number(m.pm25)
  })
}

router.get('/', requireAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate')
  res.setHeader('Pragma', 'no-cache')
  const { institutionId, sectorId, from, to, q } = req.query as any
  const where: any = {}
  if (institutionId && String(institutionId).trim()) where.institutionId = String(institutionId).trim()
  if (sectorId && String(sectorId).trim()) where.sectorId = String(sectorId).trim()
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
  const computedItems = items.map(i => ({ ...i, status: getComputedStatus(i) }))
  res.json({ items: computedItems, total, page, pageSize })
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

router.delete('/:measurementId/files/:fileId', requireAuth, async (req, res) => {
  const { measurementId, fileId } = req.params
  const f = await prisma.file.findFirst({ where: { id: fileId, measurementId } })
  if (!f) return res.status(404).json({ message: 'Anexo não encontrado' })
  // tenta remover arquivo físico (se existir)
  try {
    const fullPath = path.join(uploadDir, path.basename(f.path))
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
  } catch (e) {
    console.error('Erro ao remover arquivo físico:', e)
  }
  await prisma.file.delete({ where: { id: f.id } })
  res.json({ ok: true })
})

// Recalcula status de todas as medições com a regra atual (útil após mudanças de lógica)
router.post('/recompute-statuses', requireAuth, async (_req, res) => {
  const all = await prisma.measurement.findMany()
  const updates = all.map(m =>
    prisma.measurement.update({
      where: { id: m.id },
      data: { status: getComputedStatus(m) }
    })
  )
  await prisma.$transaction(updates)
  res.json({ ok: true, updated: updates.length })
})

router.get('/bi', requireAuth, async (req, res) => {
  const { institutionId, sectorId, from, to, status } = req.query as any
  const where: any = {}
  if (institutionId) where.institutionId = institutionId
  if (sectorId) where.sectorId = sectorId
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
  let items = await prisma.measurement.findMany({ where, orderBy: { date: 'asc' } })
  items = items.map(i => ({ ...i, status: getComputedStatus(i) as any }))
  if (status) items = items.filter(i => i.status === status)

  if (status === 'Não Conforme') {
    items = items.map(m => {
      const newItem = { ...m }
      const bacteriaRatio = m.bacteriaExternal === 0 ? 0 : m.bacteriaInternal / m.bacteriaExternal
      const fungiInternalOk = m.fungiInternal < limits.fungiInternal
      const fungiRatioOk = m.ieRatio <= limits.ieMax
      const bacteriaInternalOk = m.bacteriaInternal < limits.bacteriaInternal
      const bacteriaRatioOk = bacteriaRatio <= limits.ieMax
      
      if (m.temperature >= limits.temperatureMin && m.temperature <= limits.temperatureMax) newItem.temperature = 0
      if (m.humidity >= limits.humidityMin && m.humidity <= limits.humidityMax) newItem.humidity = 0
      // Fungo externo não possui limite máximo absoluto: só IE e fungo interno entram na conformidade
      if (fungiInternalOk) newItem.fungiInternal = 0
      if (fungiRatioOk) { newItem.fungiExternal = 0; newItem.ieRatio = 0 }
      // Bactéria externa não possui limite máximo absoluto: só relação I/E e bactéria interna
      if (bacteriaInternalOk) newItem.bacteriaInternal = 0
      if (bacteriaRatioOk) newItem.bacteriaExternal = 0
      if ((m.co2Internal - m.co2External) <= limits.co2DiffMax) { newItem.co2Internal = 0; newItem.co2External = 0 }
      if (m.pm10 <= limits.pm10) newItem.pm10 = 0
      if (m.pm25 <= limits.pm25) newItem.pm25 = 0
      
      // Keep only non-compliant values when filtering "Não Conforme"
      if (m.airSpeed <= limits.airSpeedMax) newItem.airSpeed = 0
      
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
    bacteriaInternal: i.bacteriaInternal,
    bacteriaExternal: i.bacteriaExternal,
    co2Internal: i.co2Internal,
    co2External: i.co2External,
    pm10: i.pm10,
    pm25: i.pm25,
    latitude: i.latitude,
    longitude: i.longitude,
    status: i.status
  }))
  res.json({ kpis, series, limits })
})

router.get('/report', requireAuth, async (req, res) => {
  const currentUser = (req as any).user
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  const { format = 'pdf', institutionId, sectorId, from, to, limit } = req.query as any
  const where: any = {}
  const instId = institutionId != null ? String(institutionId).trim() : ''
  if (instId) where.institutionId = instId
  if (sectorId && String(sectorId).trim()) where.sectorId = String(sectorId).trim()
  if (from || to) where.date = { gte: from ? new Date(from) : undefined, lte: to ? new Date(to) : undefined }
  const take = Math.min(Number(limit || 500), 2000)
  const items = await prisma.measurement.findMany({
    where,
    orderBy: { date: 'desc' },
    take,
    include: { institution: true, sector: true }
  })
  let filterInstitutionName: string | null = null
  if (instId && items.length > 0) filterInstitutionName = items[0].institution?.name ?? null
  if (instId && !filterInstitutionName) {
    const inst = await prisma.institution.findUnique({ where: { id: instId } })
    filterInstitutionName = inst?.name ?? null
  }
  if (String(format) === 'excel') {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Medições')
    ws.addRow([
      'ID',
      'Data/Hora',
      'Instituição',
      'Setor',
      'Temp (°C)',
      'Umidade (%)',
      'Fungos Int',
      'Fungos Ext',
      'Relação I/E',
      'Bactérias Int',
      'Bactérias Ext',
      'CO2 Int',
      'CO2 Ext',
      'PM10',
      'PM2.5',
      'Status',
      'Latitude',
      'Longitude',
      'Comentários'
    ])
    for (const i of items)
      ws.addRow([
        i.id,
        i.date.toISOString(),
        i.institution?.name ?? i.institutionId,
        i.sector?.name ?? i.sectorId,
        i.temperature,
        i.humidity,
        i.fungiInternal,
        i.fungiExternal,
        i.ieRatio,
        i.bacteriaInternal,
        i.bacteriaExternal,
        i.co2Internal,
        i.co2External,
        i.pm10,
        i.pm25,
        getComputedStatus(i),
        i.latitude,
        i.longitude,
        (i as any).comments || ''
      ])
    const buf = await wb.xlsx.writeBuffer()
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', 'attachment; filename="relatorio.xlsx"')
    return res.send(Buffer.from(buf))
  }

  const doc = new PDFDocument({ margin: 18, size: 'A4', layout: 'landscape', bufferPages: true })
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
  const toBR = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const drawHeader = () => {
    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 18, 18, { height: 28 })
      } catch (e) {
        console.error('Erro ao carregar logo:', e)
      }
    }
    doc.fontSize(14).text('Relatório de Medições', 0, 28, { align: 'center' })
    doc.fontSize(9).fillColor('gray')
    if (filterInstitutionName) {
      doc.text(`Filtro: ${filterInstitutionName}`, 0, 48, { align: 'center' })
    } else {
      doc.text('Todas as instituições', 0, 48, { align: 'center' })
    }
    doc.fillColor('black')
  }

  const drawFooter = (currentPage: number, totalPages: number) => {
    const bottom = doc.page.height - 30
    doc.fontSize(8)
    doc.text(
      `${systemName} - ${slogan} | Gerado em: ${toBR(new Date())}`,
      20,
      bottom,
      { align: 'left', width: doc.page.width - 40 }
    )
    doc.text(`Página ${currentPage}/${totalPages}`, 20, bottom, { align: 'right', width: doc.page.width - 40 })
  }

  const headers = [
    'ID', 'Data', 'Inst', 'Setor', 'Temp', 'Umid', 'Vel.Ar',
    'F.Int', 'F.Ext', 'I/E', 'B.Int', 'B.Ext', 'CO2.I', 'CO2.E', 'PM10', 'PM2.5', 'Status', 'Coord', 'Obs'
  ]
  // Larguras para caber em A4 paisagem (842pt) com margem 18; total < 806
  const widths = [32, 44, 52, 52, 26, 26, 26, 26, 26, 24, 28, 28, 28, 28, 28, 28, 42, 68, 72]
  const tableWidth = widths.reduce((a, b) => a + b, 0)
  const startX = (doc.page.width - tableWidth) / 2
  let y = 72

  const drawTableHead = () => {
    doc.fontSize(6).font('Helvetica-Bold')
    let x = startX
    headers.forEach((h, i) => {
      doc.text(h, x, y, { width: widths[i], align: 'left' })
      x += widths[i]
    })
    y += 15
    doc.moveTo(startX, y - 5).lineTo(startX + tableWidth, y - 5).stroke()
    doc.font('Helvetica')
  }

  drawHeader()
  drawTableHead()

  for (const i of items) {
    if (y > doc.page.height - 50) {
      doc.addPage()
      y = 80
      drawHeader()
      drawTableHead()
    }

    const nmI = (i.institution?.name ?? i.institutionId).substring(0, 15)
    const nmS = (i.sector?.name ?? i.sectorId).substring(0, 15)
    const d = i.date
    const pp = (n: number) => String(n).padStart(2, '0')
    const s = `${pp(d.getDate())}/${pp(d.getMonth() + 1)}/${d.getFullYear()}`
    const coord = i.latitude && i.longitude ? `${i.latitude.toFixed(3)}, ${i.longitude.toFixed(3)}` : '-'
    const obs = ((i as any).comments || '').substring(0, 20)
    const idShort = i.id.slice(-6).toUpperCase()
    const bacteriaRatio = i.bacteriaExternal === 0 ? 0 : i.bacteriaInternal / i.bacteriaExternal
    const co2Diff = i.co2Internal - i.co2External
    const fungiInternalOk = i.fungiInternal < limits.fungiInternal
    const fungiRatioOk = i.ieRatio <= limits.ieMax
    const bacteriaInternalOk = i.bacteriaInternal < limits.bacteriaInternal

    const computedStatus = getComputedStatus(i)
    const row = [
      idShort,
      s,
      nmI,
      nmS,
      String(i.temperature),
      String(i.humidity),
      String(i.airSpeed),
      String(i.fungiInternal),
      String(i.fungiExternal),
      String(i.ieRatio),
      String(i.bacteriaInternal),
      String(i.bacteriaExternal),
      String(i.co2Internal),
      String(i.co2External),
      String(i.pm10),
      String(i.pm25),
      computedStatus,
      coord,
      obs
    ]

    // Índices de coluna do relatório geral que devem ficar em vermelho se não conformes
    const nonCompliantByCol: Record<number, boolean> = {
      4: !(i.temperature >= limits.temperatureMin && i.temperature <= limits.temperatureMax), // Temp
      5: !(i.humidity >= limits.humidityMin && i.humidity <= limits.humidityMax), // Umidade
      6: !(i.airSpeed <= limits.airSpeedMax), // Vel.Ar
      7: !fungiInternalOk, // F.Int
      8: false, // F.Ext (externo não tem limite máximo absoluto)
      9: !fungiRatioOk, // I/E
      10: !bacteriaInternalOk, // B.Int (somente limite interno < 500)
      11: false, // B.Ext (externo não possui limite máximo absoluto)
      12: !(co2Diff <= limits.co2DiffMax), // CO2.I
      13: false, // CO2.E (externo não tem limite absoluto)
      14: !(i.pm10 <= limits.pm10), // PM10
      15: !(i.pm25 <= limits.pm25), // PM2.5
      16: computedStatus !== 'Conforme' // Status
    }

    doc.fontSize(5)
    let x = startX
    row.forEach((cell, idx) => {
      doc.fillColor(nonCompliantByCol[idx] ? '#D32F2F' : 'black')
      doc.text(String(cell).substring(0, 14), x, y, { width: widths[idx], align: 'left' })
      x += widths[idx]
    })
    doc.fillColor('black')
    y += 10
  }

  // Validação do relatório geral
  if (y > doc.page.height - 90) {
    doc.addPage()
    y = 80
    drawHeader()
  }
  doc.fontSize(9).fillColor('black').font('Helvetica-Bold')
  doc.text('Validação do relatório', startX, y + 6)
  doc.moveDown(0.2)
  doc.font('Helvetica').fontSize(8).fillColor('gray')
  const userShortId = currentUser?.id ? `#${String(currentUser.id).slice(-8).toUpperCase()}` : 'N/A'
  doc.text('Documento gerado eletronicamente pelo sistema Air Watch.', startX, y + 20)
  doc.text(`Emitido por: ${currentUser?.name ?? currentUser?.email ?? 'N/A'} (ID usuário: ${userShortId}) em ${toBR(new Date())}.`, startX, y + 32)
  doc.text('Este relatório constitui registro técnico das medições listadas.', startX, y + 44)

  // Rodapés com paginação (Página X/Y) após total de páginas conhecido
  const range = doc.bufferedPageRange()
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i)
    drawFooter(i + 1, range.count)
  }

  doc.end()
})

router.get('/:id/report', requireAuth, async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  const { id } = req.params
  const currentUser = (req as any).user
  const m = await prisma.measurement.findUnique({
    where: { id },
    include: { institution: true, sector: true, user: true, files: true }
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

  const toBR = (d: Date) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  const drawFooter = () => {
    const bottom = doc.page.height - 50
    doc.lineWidth(1)
       .moveTo(50, bottom - 15)
       .lineTo(545, bottom - 15)
       .strokeColor('#32CD32')
       .stroke()
    doc.fontSize(8).fillColor('gray')
    doc.text(
      `${systemName} - ${slogan} | Gerado em: ${toBR(new Date())}`,
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
  const stamp = toBR(new Date(m.date))
  const shortId = `#${m.id.slice(-8).toUpperCase()}`
  const computedStatus = getComputedStatus(m)

  doc.font('Helvetica').fontSize(10)
  doc.text(`Data/Hora: ${stamp}`)
  doc.text(`Instituição: ${m.institution?.name ?? m.institutionId}`)
  doc.text(`Setor: ${m.sector?.name ?? m.sectorId}`)
  doc.text(`Responsável pela medição: ${m.user?.name ?? m.userId}`)
  doc.text(`Status Global: ${computedStatus}`)
  doc.text(`ID da medição: ${shortId}`)
  doc.moveDown(1)
  doc.fontSize(9).fillColor('gray')
  doc.text(`Emitido por: ${currentUser?.name ?? currentUser?.email ?? 'Sistema'} em ${toBR(new Date())}.`)
  doc.moveDown(2)
  doc.fontSize(10).fillColor('black')

  // Tabela de Parâmetros
  doc.fontSize(12).font('Helvetica-Bold').text('Parâmetros Analisados')
  doc.moveDown(0.5)

  const coord = m.latitude && m.longitude ? `${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}` : 'Não registrado'

  const bacteriaRatio = m.bacteriaExternal === 0 ? 0 : m.bacteriaInternal / m.bacteriaExternal
  const co2Diff = m.co2Internal - m.co2External
  const rows: Array<{ label: string; value: string; nonCompliant?: boolean }> = [
    {
      label: 'Temperatura (C)',
      value: String(m.temperature),
      nonCompliant: !(m.temperature >= limits.temperatureMin && m.temperature <= limits.temperatureMax)
    },
    {
      label: 'Umidade (%)',
      value: String(m.humidity),
      nonCompliant: !(m.humidity >= limits.humidityMin && m.humidity <= limits.humidityMax)
    },
    {
      label: 'Velocidade do ar (m/s)',
      value: String(m.airSpeed),
      nonCompliant: !(m.airSpeed <= limits.airSpeedMax)
    },
    {
      label: 'Fungos Internos (UFC/m3)',
      value: String(m.fungiInternal),
      nonCompliant: !(m.fungiInternal < limits.fungiInternal)
    },
    {
      label: 'Fungos Externos (UFC/m3)',
      value: String(m.fungiExternal),
      nonCompliant: false
    },
    {
      label: 'Relação I/E',
      value: String(m.ieRatio),
      nonCompliant: !(m.ieRatio <= limits.ieMax)
    },
    {
      label: 'Bactérias Internas (UFC/m3)',
      value: String(m.bacteriaInternal),
      nonCompliant: !(m.bacteriaInternal < limits.bacteriaInternal)
    },
    {
      label: 'Bactérias Externas (UFC/m3)',
      value: String(m.bacteriaExternal),
      nonCompliant: false
    },
    {
      label: 'CO2 Interno (ppm)',
      value: String(m.co2Internal),
      nonCompliant: !(co2Diff <= limits.co2DiffMax)
    },
    {
      label: 'CO2 Externo (ppm)',
      value: String(m.co2External),
      nonCompliant: false
    },
    {
      label: 'PM10 (ug/m3)',
      value: String(m.pm10),
      nonCompliant: !(m.pm10 <= limits.pm10)
    },
    {
      label: 'PM2.5 (ug/m3)',
      value: String(m.pm25),
      nonCompliant: !(m.pm25 <= limits.pm25)
    },
    { label: 'Localização', value: coord, nonCompliant: false },
    { label: 'Comentários', value: (m as any).comments || '-', nonCompliant: false }
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
  rows.forEach(({ label, value, nonCompliant }, index) => {
    const cellY = doc.y
    // Fundo alternado
    if (index % 2 === 0) {
      doc.fillColor('#fafafa').rect(startX, cellY, col1Width + col2Width, rowHeight).fill()
    }
    
    doc.fillColor('black')
    doc.text(label, startX + 10, cellY + 5)
    doc.fillColor(nonCompliant ? '#D32F2F' : 'black')
    doc.text(value, startX + col1Width + 10, cellY + 5)
    doc.fillColor('black')
    
    doc.y = cellY + rowHeight
    
    // Verifica quebra de página
    if (doc.y > doc.page.height - 100) {
      doc.addPage()
      doc.y = 110 // Reset Y após header
    }
  })

  const baseUrl = (process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '')
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

  // Galeria de imagens (grid 2 colunas, com quebra de página)
  const imageFiles = (m.files || []).filter(f =>
    f.mime?.startsWith('image/') || imageExtensions.includes(path.extname(f.name).toLowerCase())
  )
  const galleryImgW = 220
  const galleryImgH = 150
  const galleryGap = 20
  const galleryMarginX = 50
  const galleryCols = 2
  const galleryRowH = galleryImgH + 22

  if (imageFiles.length > 0) {
    doc.moveDown(2)
    if (doc.y > doc.page.height - 220) {
      doc.addPage()
      doc.y = 110
    }
    doc.fontSize(12).fillColor('black').font('Helvetica-Bold').text('Galeria de imagens')
    doc.moveDown(0.5)
    let startY = doc.y
    let pageStartIndex = 0
    for (let i = 0; i < imageFiles.length; i++) {
      const col = (i - pageStartIndex) % galleryCols
      const rowOnPage = Math.floor((i - pageStartIndex) / galleryCols)
      let drawX = galleryMarginX + col * (galleryImgW + galleryGap)
      let drawY = startY + rowOnPage * galleryRowH
      if (drawY + galleryRowH > doc.page.height - 50) {
        doc.addPage()
        startY = 110
        pageStartIndex = i
        drawX = galleryMarginX
        drawY = 110
      }
      const fullPath = path.join(uploadDir, path.basename(imageFiles[i].path))
      if (fs.existsSync(fullPath)) {
        try {
          doc.image(fullPath, drawX, drawY, { width: galleryImgW, height: galleryImgH, fit: [galleryImgW, galleryImgH] })
          doc.fontSize(8).fillColor('gray').text(imageFiles[i].name.substring(0, 38), drawX, drawY + galleryImgH + 4, { width: galleryImgW, align: 'center' })
          doc.fillColor('black')
        } catch (e) {
          console.error('Erro ao inserir imagem no PDF:', e)
        }
      }
    }
    const lastRowOnPage = Math.floor((imageFiles.length - 1 - pageStartIndex) / galleryCols)
    doc.y = startY + (lastRowOnPage + 1) * galleryRowH
    doc.moveDown(0.5)
  }

  // Anexos: links para download (todos os arquivos)
  if (m.files && m.files.length > 0) {
    doc.moveDown(2)
    if (doc.y > doc.page.height - 100) {
      doc.addPage()
      doc.y = 110
    }
    doc.fontSize(12).fillColor('black').font('Helvetica-Bold').text('Links dos anexos')
    doc.moveDown(0.3)
    doc.font('Helvetica').fontSize(9).fillColor('gray')
    doc.text('Clique nos links para baixar (é necessário estar logado no sistema).')
    doc.moveDown(0.5)
    doc.fontSize(10).fillColor('black')
    for (const f of m.files) {
      if (doc.y > doc.page.height - 80) {
        doc.addPage()
        doc.y = 110
      }
      doc.fillColor('blue').text(f.name, { link: `${baseUrl}${f.path}`, underline: true }).fillColor('black')
      doc.moveDown(0.5)
    }
  }

  // Assinatura eletrônica / validação
  doc.moveDown(2)
  if (doc.y > doc.page.height - 80) {
    doc.addPage()
    doc.y = 110
  }
  doc.fontSize(10).fillColor('black').font('Helvetica-Bold').text('Validação do relatório')
  doc.moveDown(0.5)
  doc.font('Helvetica').fontSize(9).fillColor('gray')
  doc.text('Documento gerado eletronicamente pelo sistema Air Watch.')
  const userShortId = currentUser?.id ? `#${String(currentUser.id).slice(-8).toUpperCase()}` : 'N/A'
  doc.text(`Emitido por: ${currentUser?.name ?? currentUser?.email ?? 'N/A'} (ID usuário: ${userShortId}) em ${toBR(new Date())}.`)
  doc.text('Este relatório constitui registro técnico da medição realizada.')

  doc.end()
})

function avg(list: number[]) {
  if (!list.length) return 0
  return list.reduce((a, b) => a + b, 0) / list.length
}

export default router
