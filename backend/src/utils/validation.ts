export const limits = {
  aerodispersoids: 80,
  fungiInternal: 750,
  co2: 1000,
  temperatureMin: 20, // ABNT/RE09: 20-22 (Inverno) / 23-26 (Verão) -> Abrangendo faixa segura
  temperatureMax: 26,
  humidityMin: 40,
  humidityMax: 60, // ABNT/RE09: 40-60%
  airSpeed: 0.25,
  ieMax: 1.5,
  pm10: 50,
  pm25: 25,
  bacteriaInternal: 500
}

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
    m.bacteriaInternal <= limits.bacteriaInternal
  ]

  const ok = checks.every(Boolean)
  return ok ? 'Conforme' : 'Não Conforme'
}
