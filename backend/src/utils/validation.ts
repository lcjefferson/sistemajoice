/** Limites conforme texto ABNT NBR 17037 enviado */
export const limits = {
  fungiInternal: 750,      // Fungos_Conforme: [Fungos_Internos] < 750
  temperatureMin: 21,      // Temp_Conforme: [Temperatura] >= 21 e <= 26
  temperatureMax: 26,
  humidityMin: 35,         // UR_Conforme: [Umidade_Relativa] >= 35 e <= 65
  humidityMax: 65,
  airSpeedMax: 0.2,        // Velocidade do Ar_Conforme: [VA_m/s] <= 0,20
  ieMax: 1.5,              // Fungos e Bacterias: Relação I/E <= 1,5
  pm10: 50,                // PM10_Conforme: IF([PM10] <= 50, ...)
  pm25: 25,                // PM25_Conforme: IF([PM2.5] <= 25, ...)
  bacteriaInternal: 500,   // Bacterias_Conforme: [Bacterias_Internas] < 500 (fórmula do texto)
  co2DiffMax: 700          // CO2_Conforme: [CO2_Diferenca] <= 700
}

/** Campos numéricos necessários para avaliar conformidade ABNT de forma completa */
export const MEASUREMENT_NUMERIC_KEYS = [
  'humidity',
  'airSpeed',
  'temperature',
  'fungiInternal',
  'fungiExternal',
  'ieRatio',
  'bacteriaInternal',
  'bacteriaExternal',
  'co2Internal',
  'co2External',
  'pm10',
  'pm25'
] as const

export type MeasurementNumericKey = (typeof MEASUREMENT_NUMERIC_KEYS)[number]

export type MeasurementStatus = 'Conforme' | 'Não Conforme' | 'Pendente'

/** Valor informado (não nulo e número finito) */
export function isNumericValuePresent(v: unknown): boolean {
  if (v === null || v === undefined) return false
  if (typeof v === 'string' && v.trim() === '') return false
  const n = Number(v)
  return Number.isFinite(n)
}

export function computeStatus(m: {
  humidity?: number | null
  airSpeed?: number | null
  temperature?: number | null
  fungiInternal?: number | null
  fungiExternal?: number | null
  ieRatio?: number | null
  bacteriaInternal?: number | null
  bacteriaExternal?: number | null
  co2Internal?: number | null
  co2External?: number | null
  pm10?: number | null
  pm25?: number | null
}): MeasurementStatus {
  for (const key of MEASUREMENT_NUMERIC_KEYS) {
    if (!isNumericValuePresent(m[key])) return 'Pendente'
  }

  const humidity = Number(m.humidity)
  const airSpeed = Number(m.airSpeed)
  const temperature = Number(m.temperature)
  const fungiInternal = Number(m.fungiInternal)
  const fungiExternal = Number(m.fungiExternal)
  const ieRatio = Number(m.ieRatio)
  const bacteriaInternal = Number(m.bacteriaInternal)
  const bacteriaExternal = Number(m.bacteriaExternal)
  const co2Internal = Number(m.co2Internal)
  const co2External = Number(m.co2External)
  const pm10 = Number(m.pm10)
  const pm25 = Number(m.pm25)

  const bacteriaRatio = bacteriaExternal === 0 ? 0 : bacteriaInternal / bacteriaExternal

  const checks = [
    (co2Internal - co2External) <= limits.co2DiffMax,
    temperature >= limits.temperatureMin && temperature <= limits.temperatureMax,
    humidity >= limits.humidityMin && humidity <= limits.humidityMax,
    pm10 <= limits.pm10,
    pm25 <= limits.pm25,
    fungiInternal < limits.fungiInternal && ieRatio <= limits.ieMax,
    bacteriaInternal < limits.bacteriaInternal && bacteriaRatio <= limits.ieMax,
    airSpeed <= limits.airSpeedMax
  ]

  const ok = checks.every(Boolean)
  return ok ? 'Conforme' : 'Não Conforme'
}
