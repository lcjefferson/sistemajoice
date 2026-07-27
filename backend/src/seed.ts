import { prisma } from './db.js'
import bcrypt from 'bcryptjs'
import { computeStatus } from './utils/validation.js'

/** Popula o banco só se estiver vazio (útil no Render free, SQLite efêmero). */
export async function seedIfEmpty() {
  const existing = await prisma.user.count()
  if (existing > 0) {
    console.log('Seed ignorado: banco já possui dados')
    return
  }

  const email = 'admin@sistema.local'
  const hash = await bcrypt.hash('admin123', 10)
  await prisma.user.create({
    data: { name: 'Administrador', email, password: hash, role: 'admin' }
  })
  console.log('Usuário admin criado: admin@sistema.local / admin123')

  const user = await prisma.user.findUnique({ where: { email } })
  const instNames = ['Hospital Alfa', 'Universidade Beta']
  const insts = [] as { id: string; name: string }[]
  for (const name of instNames) {
    const i = await prisma.institution.create({ data: { name } })
    insts.push(i)
  }

  const sectorsData = [
    { name: 'UTI Adulto', institutionId: insts[0].id },
    { name: 'Laboratório', institutionId: insts[0].id },
    { name: 'Biblioteca', institutionId: insts[1].id },
    { name: 'Sala de Aula', institutionId: insts[1].id }
  ]
  const sectors = [] as { id: string; name: string; institutionId: string }[]
  for (const s of sectorsData) {
    const created = await prisma.sector.create({ data: s })
    sectors.push(created)
  }

  const today = new Date()
  const randomInRange = (min: number, max: number) =>
    Math.round((Math.random() * (max - min) + min) * 100) / 100

  for (const s of sectors) {
    for (let d = 0; d < 60; d++) {
      const date = new Date(today)
      date.setDate(today.getDate() - d)
      const base = {
        humidity: randomInRange(38, 72),
        airSpeed: randomInRange(0.1, 0.28),
        temperature: randomInRange(22, 29),
        fungiInternal: randomInRange(300, 900),
        fungiExternal: randomInRange(300, 1200),
        ieRatio: randomInRange(0.9, 1.8),
        aerodispersoids: randomInRange(40, 100),
        bacteriaInternal: randomInRange(200, 600),
        bacteriaExternal: randomInRange(200, 1200),
        co2Internal: randomInRange(500, 1200),
        co2External: randomInRange(380, 450),
        pm10: randomInRange(30, 65),
        pm25: randomInRange(15, 35)
      }
      const status = computeStatus(base)
      await prisma.measurement.create({
        data: {
          date,
          institutionId: s.institutionId,
          sectorId: s.id,
          userId: user!.id,
          ...base,
          status
        }
      })
    }
  }
  console.log('Dados de exemplo inseridos')
}

async function runCli() {
  await seedIfEmpty()
  process.exit(0)
}

const isDirectRun =
  process.argv[1]?.includes('seed') ||
  process.argv[1]?.endsWith('seed.js') ||
  process.argv[1]?.endsWith('seed.ts')

if (isDirectRun) {
  runCli().catch((err) => {
    console.error(err)
    process.exit(1)
  })
}
