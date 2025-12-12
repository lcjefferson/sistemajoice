import { useEffect, useState } from 'react'
import { Box, Paper, Typography, Grid, FormControl, InputLabel, Select, MenuItem, TextField, Button, Card, CardContent } from '@mui/material'
import { Line, Bar, Pie } from 'react-chartjs-2'
import { api } from '../../shared/api'
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend } from 'chart.js'

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend)

type Option = { id: string; name: string }

export default function DashboardPage() {
  const [institutions, setInstitutions] = useState<Option[]>([])
  const [sectors, setSectors] = useState<Option[]>([])
  const [institutionId, setInstitutionId] = useState('')
  const [sectorId, setSectorId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [kpis, setKpis] = useState<any>(null)
  const [series, setSeries] = useState<any[]>([])

  useEffect(() => {
    api.get('/api/institutions').then(r => setInstitutions(r.data.items))
  }, [])

  useEffect(() => {
    if (institutionId) api.get(`/api/sectors?institutionId=${institutionId}`).then(r => setSectors(r.data.items))
    else api.get('/api/sectors').then(r => setSectors(r.data.items))
  }, [institutionId])

  const load = async () => {
    const { data } = await api.get('/api/measurements/bi', { params: { institutionId, sectorId, from, to } })
    setKpis(data.kpis)
    setSeries(data.series)
  }

  return (
    <Box>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Instituição</InputLabel>
              <Select value={institutionId} label="Instituição" onChange={(e) => setInstitutionId(e.target.value)}>
                <MenuItem value="">Todas</MenuItem>
                {institutions.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Setor</InputLabel>
              <Select value={sectorId} label="Setor" onChange={(e) => setSectorId(e.target.value)}>
                <MenuItem value="">Todos</MenuItem>
                {sectors.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}><TextField fullWidth label="De" type="date" InputLabelProps={{ shrink: true }} value={from} onChange={e=>setFrom(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><TextField fullWidth label="Até" type="date" InputLabelProps={{ shrink: true }} value={to} onChange={e=>setTo(e.target.value)} /></Grid>
          <Grid item xs={12} md={2}><Button fullWidth variant="contained" sx={{ height: '100%' }} onClick={load}>Aplicar</Button></Grid>
        </Grid>
      </Paper>
      {kpis && (
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}><Card><CardContent><Typography variant="caption">Média Temp</Typography><Typography variant="h5">{kpis.temperatureAvg?.toFixed(2)} °C</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography variant="caption">Média Umidade</Typography><Typography variant="h5">{kpis.humidityAvg?.toFixed(2)} %</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography variant="caption">Conformes</Typography><Typography variant="h5" color="success.main">{kpis.compliantCount}</Typography></CardContent></Card></Grid>
          <Grid item xs={12} md={3}><Card><CardContent><Typography variant="caption">Não conformes</Typography><Typography variant="h5" color="error.main">{kpis.nonCompliantCount}</Typography></CardContent></Card></Grid>
        </Grid>
      )}
      {series.length > 0 && (
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} md={6}><Paper sx={{ p:2 }}><Line data={{ labels: series.map(s=>s.date), datasets: [{ label: 'Temperatura', data: series.map(s=>s.temperature), borderColor: '#32cd32', tension: 0.3 }] }} options={{ plugins:{ legend:{ labels:{ color:'#111111' } } }, scales:{ x:{ ticks:{ color:'#111111' }, grid:{ color:'rgba(0,0,0,0.08)' } }, y:{ ticks:{ color:'#111111' }, grid:{ color:'rgba(0,0,0,0.08)' } } } }} /></Paper></Grid>
          <Grid item xs={12} md={6}><Paper sx={{ p:2 }}><Bar data={{ labels: series.map(s=>s.date), datasets: [{ label: 'Umidade', data: series.map(s=>s.humidity), backgroundColor: 'rgba(50,205,50,0.6)' }] }} options={{ plugins:{ legend:{ labels:{ color:'#111111' } } }, scales:{ x:{ ticks:{ color:'#111111' }, grid:{ color:'rgba(0,0,0,0.08)' } }, y:{ ticks:{ color:'#111111' }, grid:{ color:'rgba(0,0,0,0.08)' } } } }} /></Paper></Grid>
          <Grid item xs={12} md={6}><Paper sx={{ p:2 }}><Pie data={{ labels: ['Conforme','Não Conforme'], datasets: [{ data: [kpis?.compliantCount||0, kpis?.nonCompliantCount||0], backgroundColor: ['#4caf50','#32cd32'] }] }} options={{ plugins:{ legend:{ labels:{ color:'#111111' } } } }} /></Paper></Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p:2 }}>
              <Typography variant="h6" sx={{ mb: 1 }}>Resumo</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}><Card variant="outlined"><CardContent><Typography variant="caption">Instituições</Typography><Typography variant="h5">{institutions.length}</Typography></CardContent></Card></Grid>
                <Grid item xs={6}><Card variant="outlined"><CardContent><Typography variant="caption">Setores</Typography><Typography variant="h5">{sectors.length}</Typography></CardContent></Card></Grid>
              </Grid>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Instituições</Typography>
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
