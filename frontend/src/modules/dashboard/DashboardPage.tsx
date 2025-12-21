import { useEffect, useState } from 'react'
import { Box, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Button, Card, CardContent, Chip } from '@mui/material'
import { Line, Pie } from 'react-chartjs-2'
import { api } from '../../shared/api'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { useTranslation } from 'react-i18next'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)

type Option = { id: string; name: string }

const PARAMETERS = [
  { key: 'temperature', labelKey: 'measurements.temperature_label' },
  { key: 'humidity', labelKey: 'measurements.humidity_label' },
  { key: 'airSpeed', labelKey: 'measurements.air_speed_label' },
  { key: 'fungiInternal', labelKey: 'measurements.fungi_internal_label' },
  { key: 'fungiExternal', labelKey: 'measurements.fungi_external_label' },
  { key: 'ieRatio', labelKey: 'measurements.ie_ratio_label' },
  { key: 'aerodispersoids', labelKey: 'measurements.aerodispersoids_label' },
  { key: 'bacteriaInternal', labelKey: 'measurements.bacteria_internal_label' },
  { key: 'bacteriaExternal', labelKey: 'measurements.bacteria_external_label' },
  { key: 'co2Internal', labelKey: 'measurements.co2_internal_label' },
  { key: 'co2External', labelKey: 'measurements.co2_external_label' },
  { key: 'pm10', labelKey: 'measurements.pm10_label' },
  { key: 'pm25', labelKey: 'measurements.pm25_label' }
]

export default function DashboardPage() {
  const { t } = useTranslation()
  const [institutions, setInstitutions] = useState<Option[]>([])
  const [sectors, setSectors] = useState<Option[]>([])
  const [institutionId, setInstitutionId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [status, setStatus] = useState('')
  const [kpis, setKpis] = useState<any>(null)
  const [series, setSeries] = useState<any[]>([])
  const [limits, setLimits] = useState<any>(null)

  useEffect(() => {
    api.get('/api/institutions').then(r => setInstitutions(r.data.items))
  }, [])

  useEffect(() => {
    setSectorId('')
    if (institutionId) api.get(`/api/sectors?institutionId=${institutionId}`).then(r => setSectors(r.data.items))
    else api.get('/api/sectors').then(r => setSectors(r.data.items))
  }, [institutionId])

  const load = async () => {
    const { data } = await api.get('/api/measurements/bi', { params: { institutionId, sectorId, from, to, status } })
    setKpis(data.kpis)
    setSeries(data.series)
    setLimits(data.limits)
  }

  useEffect(() => {
    load()
  }, [])

  const checkCompliance = (key: string, val: number) => {
    if (!limits || val === undefined || val === null) return 'unknown'
    if (key === 'temperature') return (val >= limits.temperatureMin && val <= limits.temperatureMax) ? 'ok' : 'nok'
    if (key === 'humidity') return (val >= limits.humidityMin && val <= limits.humidityMax) ? 'ok' : 'nok'
    if (key === 'airSpeed') return val <= limits.airSpeed ? 'ok' : 'nok'
    if (key === 'fungiInternal') return val <= limits.fungiInternal ? 'ok' : 'nok'
    if (key === 'ieRatio') return val <= limits.ieMax ? 'ok' : 'nok'
    if (key === 'aerodispersoids') return val <= limits.aerodispersoids ? 'ok' : 'nok'
    if (key === 'bacteriaInternal') return val <= limits.bacteriaInternal ? 'ok' : 'nok'
    if (key === 'co2Internal') return val <= limits.co2 ? 'ok' : 'nok'
    if (key === 'pm10') return val <= limits.pm10 ? 'ok' : 'nok'
    if (key === 'pm25') return val <= limits.pm25 ? 'ok' : 'nok'
    return 'unknown'
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>{t('common.institution')}</InputLabel>
              <Select value={institutionId} label={t('common.institution')} onChange={(e) => setInstitutionId(e.target.value)}>
                <MenuItem value="">{t('common.all_institutions')}</MenuItem>
                {institutions.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>{t('common.sector')}</InputLabel>
              <Select value={sectorId} label={t('common.sector')} onChange={(e) => setSectorId(e.target.value)}>
                <MenuItem value="">{t('common.all_sectors')}</MenuItem>
                {sectors.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel>{t('common.status')}</InputLabel>
              <Select value={status} label={t('common.status')} onChange={(e) => setStatus(e.target.value)}>
                <MenuItem value="">{t('common.all')}</MenuItem>
                <MenuItem value="Conforme">{t('measurements.status_compliant')}</MenuItem>
                <MenuItem value="Não Conforme">{t('measurements.status_non_compliant')}</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}><TextField fullWidth label={t('common.from')} type="date" InputLabelProps={{ shrink: true }} value={from} onChange={e=>setFrom(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth label={t('common.to')} type="date" InputLabelProps={{ shrink: true }} value={to} onChange={e=>setTo(e.target.value)} /></Grid>
          <Grid item xs={12} md={1}><Button fullWidth variant="contained" sx={{ height: '100%' }} onClick={load}>{t('common.apply')}</Button></Grid>
        </Grid>
      </Paper>
      {kpis && (
        <>
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid item xs={12} md={6}><Card><CardContent><Typography variant="caption">{t('dashboard.compliant')}</Typography><Typography variant="h5" color="success.main">{kpis.compliantCount}</Typography></CardContent></Card></Grid>
            <Grid item xs={12} md={6}><Card><CardContent><Typography variant="caption">{t('dashboard.non_compliant')}</Typography><Typography variant="h5" color="error.main">{kpis.nonCompliantCount}</Typography></CardContent></Card></Grid>
          </Grid>

          <Grid container spacing={2}>
            {PARAMETERS.map(p => {
              const avg = kpis[`${p.key}Avg`]
              const status = checkCompliance(p.key, avg)
              return (
                <Grid item xs={12} md={6} lg={4} key={p.key}>
                  <Paper sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{t(p.labelKey)}</Typography>
                      {status !== 'unknown' && (
                        <Chip 
                          label={status === 'ok' ? t('measurements.status_compliant') : t('measurements.status_non_compliant')} 
                          color={status === 'ok' ? 'success' : 'error'} 
                          size="small" 
                        />
                      )}
                    </Box>
                    <Typography variant="h4" sx={{ mb: 2 }}>{avg?.toFixed(2) || '-'}</Typography>
                    <Box sx={{ flexGrow: 1, minHeight: 150 }}>
                      <Line 
                        data={{ 
                          labels: series.map(s => s.date), 
                          datasets: [{ 
                            label: t(p.labelKey), 
                            data: series.map(s => s[p.key]), 
                            borderColor: '#1976d2', 
                            tension: 0.3,
                            pointRadius: 0
                          }] 
                        }} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } }, 
                          scales: { 
                            x: { display: false }, 
                            y: { display: true, ticks: { count: 5 } } 
                          } 
                        }} 
                      />
                    </Box>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>
        </>
      )}
      
      {kpis && (
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}><Paper sx={{ p:2 }}><Typography variant="h6" sx={{ mb:2 }}>{t('dashboard.summary')}</Typography><Pie data={{ labels: [t('dashboard.compliant'),t('dashboard.non_compliant')], datasets: [{ data: [kpis?.compliantCount||0, kpis?.nonCompliantCount||0], backgroundColor: ['#4caf50','#f44336'] }] }} options={{ plugins:{ legend:{ labels:{ color:'#111111' } } } }} /></Paper></Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p:2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>{t('dashboard.summary')}</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Card variant="outlined"><CardContent><Typography variant="caption">{t('dashboard.institutions')}</Typography><Typography variant="h5">{institutions.length}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card variant="outlined"><CardContent><Typography variant="caption">{t('dashboard.sectors')}</Typography><Typography variant="h5">{sectors.length}</Typography></CardContent></Card></Grid>
              </Grid>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{t('dashboard.institutions')}</Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr', gap: 0.5, maxHeight: 220, overflowY: 'auto' }}>
                {institutions.slice(0, 10).map(i => (
                  <Typography key={i.id} variant="body2" sx={{ color: 'text.primary' }}>• {i.name}</Typography>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}
    </Box>
  )
}
