export function computeStatus(m: {
  humidity: number
  airSpeed: number
  temperature: number
  fungiInternal: number
  fungiExternal: number
  ieRatio: number
  aerodispersoids: number
  bacteriaInternal: number
  bacteriaExternal: number
  co2Internal: number
  co2External: number
  pm10: number
  pm25: number
}) {
  const limits = {
    aerodispersoids: 80,
    fungiInternal: 750,
    co2: 1000,
    temperatureMin: 23,
    temperatureMax: 28,
    humidityMin: 40,
    humidityMax: 70,
    airSpeed: 0.25,
    ieMax: 1.5,
    pm10: 50,
    pm25: 25
  }

  const checks = [
    m.aerodispersoids <= limits.aerodispersoids,
    m.fungiInternal <= limits.fungiInternal,
    (m.co2Internal - m.co2External) <= 700 && m.co2Internal <= limits.co2,
    m.temperature >= limits.temperatureMin && m.temperature <= limits.temperatureMax,
    m.humidity >= limits.humidityMin && m.humidity <= limits.humidityMax,
    m.airSpeed <= limits.airSpeed,
    m.ieRatio <= limits.ieMax,
    m.pm10 <= limits.pm10,
    m.pm25 <= limits.pm25,
    m.bacteriaInternal <= 500
  ]

  const ok = checks.every(Boolean)
  return ok ? 'Conforme' : 'Não Conforme'
}
