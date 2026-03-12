/** Limites conforme texto ABNT NBR 17037 enviado */
export const limits = {
  fungiInternal: 750,      // Fungos_Conforme: [Fungos_Internos] < 750
  temperatureMin: 21,      // Temp_Conforme: [Temperatura] >= 21 e <= 26
  temperatureMax: 26,
  humidityMin: 35,         // UR_Conforme: [Umidade_Relativa] >= 35 e <= 65
  humidityMax: 65,
  airSpeedMax: 0.2,        // Velocidade do Ar_Conforme: [VA_m/s] <= 0,20
  ieMax: 1.5,              // Fungos e Bacterias: Relação I/E <= 1,5
  pm10: 50,                // PM10_Conforme: [PM10] <= 50
  pm25: 25,                // PM25_Conforme: [PM2.5] <= 25
  bacteriaInternal: 500,   // Bacterias_Conforme: [Bacterias_Internas] < 500 (fórmula do texto)
  co2DiffMax: 700          // CO2_Conforme: [CO2_Diferenca] <= 700
}

export function computeStatus(m: {
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
  // Bacterias_Relacao_IE: IF([Bacterias_Externas] = 0, 0, [Bacterias_Internas] / [Bacterias_Externas])
  const bacteriaRatio = m.bacteriaExternal === 0 ? 0 : m.bacteriaInternal / m.bacteriaExternal

  const checks = [
    // CO2_Diferenca = [CO2_Interno] - [CO2_Externo]; CO2_Conforme: IF([CO2_Diferenca] <= 700, "Conforme", "Não Conforme")
    (m.co2Internal - m.co2External) <= limits.co2DiffMax,
    // Temp_Conforme: IF(AND([Temperatura] >= 21, [Temperatura] <= 26), "Conforme", "Não Conforme")
    m.temperature >= limits.temperatureMin && m.temperature <= limits.temperatureMax,
    // UR_Conforme: IF(AND([Umidade_Relativa] >= 35, [Umidade_Relativa] <= 65), "Conforme", "Não Conforme")
    m.humidity >= limits.humidityMin && m.humidity <= limits.humidityMax,
    // PM10_Conforme: IF([PM10] <= 50, "Conforme", "Não Conforme")
    m.pm10 <= limits.pm10,
    // PM25_Conforme: IF([PM2.5] <= 25, "Conforme", "Não Conforme")
    m.pm25 <= limits.pm25,
    // Fungos_Conforme: IF(AND([Fungos_Internos] < 750, [Fungos_Relacao_IE] <= 1.5), "Conforme", "Não Conforme")
    m.fungiInternal < limits.fungiInternal && m.ieRatio <= limits.ieMax,
    // Bacterias_Conforme: IF(AND([Bacterias_Internas] < 500, [Bacterias_Relacao_IE] <= 1.5), "Conforme", "Não Conforme")
    m.bacteriaInternal < limits.bacteriaInternal && bacteriaRatio <= limits.ieMax,
    // Velocidade do Ar_Conforme: IF([VA_m/s] <= 0,20, "Conforme", "Não Conforme")
    m.airSpeed <= limits.airSpeedMax
  ]

  // Status_Geral: "Não Conforme" se qualquer um dos 8 indicadores fora dos limites; senão "Conforme"

  const ok = checks.every(Boolean)
  return ok ? 'Conforme' : 'Não Conforme'
}
