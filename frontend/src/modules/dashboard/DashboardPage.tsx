import { useEffect, useState } from 'react'
import { Box, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Button, Card, CardContent, Chip } from '@mui/material'
import { Line, Pie, Bar } from 'react-chartjs-2'
import { api } from '../../shared/api'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'
import { useTranslation } from 'react-i18next'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)

type Option = { id: string; name: string }

const PARAMETERS = [
  { key: 'temperature', labelKey: 'measurements.temperature_label', type: 'bar', color: '#f44336' },
  { key: 'humidity', labelKey: 'measurements.humidity_label', type: 'bar', color: '#2196f3' },
  { key: 'airSpeed', labelKey: 'measurements.air_speed_label', type: 'bar', color: '#00bcd4' },
  { key: 'fungiInternal', labelKey: 'measurements.fungi_internal_label', type: 'bar', color: '#4caf50' },
  { key: 'fungiExternal', labelKey: 'measurements.fungi_external_label', type: 'bar', color: '#8bc34a' },
  { key: 'ieRatio', labelKey: 'measurements.ie_ratio_label', type: 'bar', color: '#ff9800' },
  { key: 'bacteriaInternal', labelKey: 'measurements.bacteria_internal_label', type: 'bar', color: '#673ab7' },
  { key: 'bacteriaExternal', labelKey: 'measurements.bacteria_external_label', type: 'bar', color: '#3f51b5' },
  { key: 'co2Internal', labelKey: 'measurements.co2_internal_label', type: 'bar', color: '#795548' },
  { key: 'co2External', labelKey: 'measurements.co2_external_label', type: 'bar', color: '#607d8b' },
  { key: 'pm10', labelKey: 'measurements.pm10_label', type: 'bar', color: '#e91e63' },
  { key: 'pm25', labelKey: 'measurements.pm25_label', type: 'bar', color: '#9e9e9e' }
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

  const checkCompliance = (key: string, val: number, m?: any) => {
    if (!limits || val === undefined || val === null) return 'unknown'
    if (key === 'temperature') return (val >= limits.temperatureMin && val <= limits.temperatureMax) ? 'ok' : 'nok'
    if (key === 'humidity') return (val >= limits.humidityMin && val <= limits.humidityMax) ? 'ok' : 'nok'
    if (key === 'airSpeed') return val <= limits.airSpeed ? 'ok' : 'nok'
    if (key === 'fungiInternal') return val < limits.fungiInternal ? 'ok' : 'nok'
    if (key === 'ieRatio') return val <= limits.ieMax ? 'ok' : 'nok'
    if (key === 'bacteriaInternal') {
      const bacteriaRatio = m?.bacteriaExternal === 0 ? 0 : (m?.bacteriaInternal / m?.bacteriaExternal)
      return (val < limits.bacteriaInternal && bacteriaRatio <= limits.ieMax) ? 'ok' : 'nok'
    }
    if (key === 'co2Internal') {
      const diff = m ? (m.co2Internal - m.co2External) : 0
      return diff <= 700 ? 'ok' : 'nok'
    }
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
              const avgVal = kpis[`${p.key}Avg`]
              // Pass the whole kpis object as context for ratios/diffs, mapping keys to match Measurement structure
              const context = {
                co2Internal: kpis.co2InternalAvg,
                co2External: kpis.co2ExternalAvg,
                bacteriaInternal: kpis.bacteriaInternalAvg,
                bacteriaExternal: kpis.bacteriaExternalAvg,
                fungiInternal: kpis.fungiInternalAvg,
                fungiExternal: kpis.fungiExternalAvg
              }
              const status = checkCompliance(p.key, avgVal, context)
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
                    <Typography variant="h4" sx={{ mb: 2 }}>{avgVal?.toFixed(2) || '-'}</Typography>
                    <Box sx={{ flexGrow: 1, minHeight: 150 }}>
                      {p.type === 'bar' ? (
                        <Bar 
                          data={{ 
                            labels: series.map(s => s.date), 
                            datasets: [{ 
                              label: t(p.labelKey), 
                              data: series.map(s => s[p.key]), 
                              backgroundColor: p.color || '#1976d2'
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
                      ) : (
                        <Line 
                          data={{ 
                            labels: series.map(s => s.date), 
                            datasets: [{ 
                              label: t(p.labelKey), 
                              data: series.map(s => s[p.key]), 
                              borderColor: p.color || '#1976d2', 
                              tension: 0.3,
                              pointRadius: 3,
                              pointHoverRadius: 5
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
                      )}
                    </Box>
                  </Paper>
                </Grid>
              )
            })}
            <Grid item xs={12} md={12} lg={8}>
              <Paper sx={{ p: 2, height: '100%' }}>
                <Typography variant="h6" gutterBottom>{t('dashboard.compliance_status')}</Typography>
                <Grid container spacing={2} alignItems="center" sx={{ height: '100%' }}>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
                      <Pie 
                        data={{ 
                          labels: [t('dashboard.compliant'), t('dashboard.non_compliant')],
                          datasets: [{ 
                            data: [kpis.compliantCount, kpis.nonCompliantCount],
                            backgroundColor: ['#4caf50', '#f44336']
                          }] 
                        }}
                        options={{ 
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } }
                        }}
                      />
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 2 }}>
                      <Paper variant="outlined" sx={{ p: 2, borderLeft: '6px solid #4caf50' }}>
                        <Typography variant="subtitle2" color="text.secondary">{t('dashboard.compliant')}</Typography>
                        <Typography variant="h4">{kpis.compliantCount}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {((kpis.compliantCount / (kpis.compliantCount + kpis.nonCompliantCount || 1)) * 100).toFixed(1)}%
                        </Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2, borderLeft: '6px solid #f44336' }}>
                        <Typography variant="subtitle2" color="text.secondary">{t('dashboard.non_compliant')}</Typography>
                        <Typography variant="h4">{kpis.nonCompliantCount}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {((kpis.nonCompliantCount / (kpis.compliantCount + kpis.nonCompliantCount || 1)) * 100).toFixed(1)}%
                        </Typography>
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2, borderLeft: '6px solid #1976d2' }}>
                        <Typography variant="subtitle2" color="text.secondary">{t('dashboard.occurrences')}</Typography>
                        <Typography variant="h4">{kpis.compliantCount + kpis.nonCompliantCount}</Typography>
                      </Paper>
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  )
}
