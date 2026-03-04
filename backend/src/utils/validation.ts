export const limits = {
  fungiInternal: 750,
  co2: 1000,
  temperatureMin: 21, // Dra. Thesis: 21-26
  temperatureMax: 26,
  humidityMin: 35,    // Dra. Thesis: 35-65%
  humidityMax: 65,
  airSpeed: 0.25,
  ieMax: 1.5,
  pm10: 50,
  pm25: 25,
  bacteriaInternal: 750 // Dra. Thesis: < 750
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
  // Bacteria I/E Ratio calculation
  const bacteriaRatio = m.bacteriaExternal === 0 ? 0 : m.bacteriaInternal / m.bacteriaExternal

  const checks = [
    // CO2_Conforme: IF([CO2_Diferenca] <= 700, "Conforme", "Não Conforme")
    (m.co2Internal - m.co2External) <= 700,
    
    // Temp_Conforme: IF(AND([Temp_C] >= 21, [Temp_C] <= 26), "Conforme", "Não Conforme")
    m.temperature >= limits.temperatureMin && m.temperature <= limits.temperatureMax,
    
    // UR_Conforme: IF(AND([Umidade_Relativa_perc] >= 35, [Umidade_Relativa_perc] <= 65), "Conforme", "Não Conforme")
    m.humidity >= limits.humidityMin && m.humidity <= limits.humidityMax,
    
    // PM10_Conforme: IF([PM10_ug_m3] <= 50, "Conforme", "Não Conforme")
    m.pm10 <= limits.pm10,
    
    // PM25_Conforme: IF([PM25_ug_m3] <= 25, "Conforme", "Não Conforme")
    m.pm25 <= limits.pm25,
    
    // Fungos_Conforme: IF(AND([Fungos_Int_UFC_m3] < 750, [Fungos_Relacao_IE] <= 1.5), "Conforme", "Não Conforme")
    m.fungiInternal < limits.fungiInternal && m.ieRatio <= limits.ieMax,
    
    // Bacterias_Conforme: IF(AND([Bacterias_Int_UFC_m3] < 750, [Bacterias_Relacao_IE] <= 1.5), "Conforme", "Não Conforme")
    m.bacteriaInternal < limits.bacteriaInternal && bacteriaRatio <= limits.ieMax
  ]

  const ok = checks.every(Boolean)
  return ok ? 'Conforme' : 'Não Conforme'
}
