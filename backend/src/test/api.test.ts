/**
 * Testes de API do backend Air Watch.
 * Requer: DATABASE_URL e JWT_SECRET (ou usa valores de teste).
 * Rodar: npm test
 */
import process from 'node:process'
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'test-secret-qa'

import app from '../app.js'
import request from 'supertest'

const api = request(app)

let token = ''
let userId = ''
let institutionId = ''
let sectorId = ''
let measurementId = ''

async function testHealth() {
  const res = await api.get('/api/health')
  if (res.status !== 200 || res.body?.ok !== true) throw new Error(`Health: expected 200 ok, got ${res.status} ${JSON.stringify(res.body)}`)
  console.log('  ✓ GET /api/health')
}

async function testAuthRegister() {
  const email = `qa-${Date.now()}@test.local`
  const res = await api.post('/api/auth/register').send({ name: 'QA User', email, password: 'test123', role: 'admin' })
  if (res.status !== 200 || !res.body?.id) throw new Error(`Register: expected 200 with id, got ${res.status} ${JSON.stringify(res.body)}`)
  console.log('  ✓ POST /api/auth/register')
}

async function testAuthLoginFail() {
  const res = await api.post('/api/auth/login').send({ email: 'naoexiste@test.local', password: 'x' })
  if (res.status !== 401) throw new Error(`Login fail: expected 401, got ${res.status}`)
  console.log('  ✓ POST /api/auth/login (credenciais inválidas → 401)')
}

async function testAuthLogin() {
  const email = `qa-${Date.now()}@test.local`
  await api.post('/api/auth/register').send({ name: 'QA User', email, password: 'test123', role: 'admin' })
  const res = await api.post('/api/auth/login').send({ email, password: 'test123' })
  if (res.status !== 200 || !res.body?.token) throw new Error(`Login: expected 200 with token, got ${res.status}`)
  token = res.body.token
  userId = res.body.user?.id
  if (!token || !userId) throw new Error('Login: missing token or user.id')
  console.log('  ✓ POST /api/auth/login')
}

async function testAuthMe() {
  const res = await api.get('/api/auth/me').set('Authorization', `Bearer ${token}`)
  if (res.status !== 200 || !res.body?.id) throw new Error(`Me: expected 200, got ${res.status}`)
  console.log('  ✓ GET /api/auth/me')
}

async function testAuthUnauthorized() {
  const res = await api.get('/api/auth/me')
  if (res.status !== 401) throw new Error(`Me without token: expected 401, got ${res.status}`)
  console.log('  ✓ GET /api/auth/me sem token → 401')
}

async function testInstitutionsList() {
  const res = await api.get('/api/institutions').set('Authorization', `Bearer ${token}`)
  if (res.status !== 200 || !Array.isArray(res.body?.items)) throw new Error(`Institutions list: expected 200, got ${res.status}`)
  console.log('  ✓ GET /api/institutions')
}

async function testInstitutionsCreate() {
  const res = await api.post('/api/institutions').set('Authorization', `Bearer ${token}`).send({ name: `Inst QA ${Date.now()}` })
  if (res.status !== 200 || !res.body?.id) throw new Error(`Institution create: expected 200, got ${res.status}`)
  institutionId = res.body.id
  console.log('  ✓ POST /api/institutions')
}

async function testSectorsList() {
  const res = await api.get('/api/sectors').set('Authorization', `Bearer ${token}`)
  if (res.status !== 200 || !Array.isArray(res.body?.items)) throw new Error(`Sectors list: expected 200, got ${res.status}`)
  console.log('  ✓ GET /api/sectors')
}

async function testSectorsCreate() {
  const res = await api.post('/api/sectors').set('Authorization', `Bearer ${token}`).send({ name: `Setor QA ${Date.now()}`, institutionId })
  if (res.status !== 200 || !res.body?.id) throw new Error(`Sector create: expected 200, got ${res.status}`)
  sectorId = res.body.id
  console.log('  ✓ POST /api/sectors')
}

const measurementPayload = () => ({
  date: new Date().toISOString().slice(0, 19), // YYYY-MM-DDTHH:mm:ss
  institutionId,
  sectorId,
  humidity: 50,
  airSpeed: 0.15,
  temperature: 23,
  fungiInternal: 400,
  fungiExternal: 500,
  ieRatio: 0.8,
  bacteriaInternal: 300,
  bacteriaExternal: 400,
  co2Internal: 600,
  co2External: 400,
  pm10: 30,
  pm25: 15
})

async function testMeasurementsList() {
  const res = await api.get('/api/measurements').set('Authorization', `Bearer ${token}`).query({ page: 1, pageSize: 10 })
  if (res.status !== 200 || !Array.isArray(res.body?.items) || typeof res.body?.total !== 'number') throw new Error(`Measurements list: expected 200, got ${res.status}`)
  console.log('  ✓ GET /api/measurements')
}

async function testMeasurementsListWithFilter() {
  const res = await api.get('/api/measurements').set('Authorization', `Bearer ${token}`).query({ institutionId, page: 1, pageSize: 10 })
  if (res.status !== 200) throw new Error(`Measurements list (filter): expected 200, got ${res.status}`)
  console.log('  ✓ GET /api/measurements?institutionId=...')
}

async function testMeasurementsCreate() {
  const payload = measurementPayload()
  const res = await api.post('/api/measurements').set('Authorization', `Bearer ${token}`).send(payload)
  if (res.status !== 200 || !res.body?.id) throw new Error(`Measurement create: expected 200, got ${res.status}`)
  measurementId = res.body.id
  console.log('  ✓ POST /api/measurements')
}

async function testMeasurementsUpdate() {
  const payload = measurementPayload()
  payload.temperature = 24
  const res = await api.put(`/api/measurements/${measurementId}`).set('Authorization', `Bearer ${token}`).send(payload)
  if (res.status !== 200) throw new Error(`Measurement update: expected 200, got ${res.status}`)
  console.log('  ✓ PUT /api/measurements/:id')
}

async function testMeasurementsReportPdf() {
  const res = await api.get('/api/measurements/report').set('Authorization', `Bearer ${token}`).query({ format: 'pdf', _: Date.now() })
  if (res.status !== 200) throw new Error(`Report PDF: expected 200, got ${res.status}`)
  if (!Buffer.isBuffer(res.body) && !(res.body instanceof Uint8Array)) throw new Error('Report PDF: body should be buffer')
  const contentType = res.headers['content-type'] || ''
  if (!contentType.includes('pdf')) throw new Error(`Report PDF: content-type should be pdf, got ${contentType}`)
  console.log('  ✓ GET /api/measurements/report?format=pdf')
}

async function testMeasurementsReportExcel() {
  const res = await api.get('/api/measurements/report').set('Authorization', `Bearer ${token}`).query({ format: 'excel', _: Date.now() })
  if (res.status !== 200) throw new Error(`Report Excel: expected 200, got ${res.status}`)
  const contentType = res.headers['content-type'] || ''
  if (!contentType.includes('spreadsheet') && !contentType.includes('excel')) throw new Error(`Report Excel: content-type, got ${contentType}`)
  console.log('  ✓ GET /api/measurements/report?format=excel')
}

async function testMeasurementsReportWithFilter() {
  const res = await api.get('/api/measurements/report').set('Authorization', `Bearer ${token}`).query({ format: 'pdf', institutionId, _: Date.now() })
  if (res.status !== 200) throw new Error(`Report PDF (filter): expected 200, got ${res.status}`)
  console.log('  ✓ GET /api/measurements/report?format=pdf&institutionId=...')
}

async function testMeasurementsIndividualReport() {
  const res = await api.get(`/api/measurements/${measurementId}/report`).set('Authorization', `Bearer ${token}`).query({ _: Date.now() })
  if (res.status !== 200) throw new Error(`Individual report: expected 200, got ${res.status}`)
  const contentType = res.headers['content-type'] || ''
  if (!contentType.includes('pdf')) throw new Error(`Individual report: content-type pdf, got ${contentType}`)
  console.log('  ✓ GET /api/measurements/:id/report')
}

async function testMeasurementsBi() {
  const res = await api.get('/api/measurements/bi').set('Authorization', `Bearer ${token}`)
  if (res.status !== 200 || !res.body?.kpis || !res.body?.limits) throw new Error(`BI: expected 200 with kpis/limits, got ${res.status}`)
  console.log('  ✓ GET /api/measurements/bi')
}

async function testMeasurementsDelete() {
  const res = await api.delete(`/api/measurements/${measurementId}`).set('Authorization', `Bearer ${token}`)
  if (res.status !== 200) throw new Error(`Measurement delete: expected 200, got ${res.status}`)
  console.log('  ✓ DELETE /api/measurements/:id')
}

async function testMeasurementNotFound() {
  const res = await api.get('/api/measurements/naoexisteid123/report').set('Authorization', `Bearer ${token}`)
  if (res.status !== 404) throw new Error(`Report 404: expected 404, got ${res.status}`)
  console.log('  ✓ GET /api/measurements/:id/report (404 para id inexistente)')
}

async function run() {
  console.log('\n--- Testes de API Backend Air Watch ---\n')
  await testHealth()
  console.log('\nAuth:')
  await testAuthRegister()
  await testAuthLoginFail()
  await testAuthLogin()
  await testAuthMe()
  await testAuthUnauthorized()
  console.log('\nInstitutions:')
  await testInstitutionsList()
  await testInstitutionsCreate()
  console.log('\nSectors:')
  await testSectorsList()
  await testSectorsCreate()
  console.log('\nMeasurements:')
  await testMeasurementsList()
  await testMeasurementsListWithFilter()
  await testMeasurementsCreate()
  await testMeasurementsUpdate()
  await testMeasurementsReportPdf()
  await testMeasurementsReportExcel()
  await testMeasurementsReportWithFilter()
  await testMeasurementsIndividualReport()
  await testMeasurementsBi()
  await testMeasurementsDelete()
  await testMeasurementNotFound()
  console.log('\n--- Todos os testes passaram. ---\n')
}

run().then(() => process.exit(0)).catch((e) => {
  console.error('\nFalha:', e.message || e)
  process.exit(1)
})
