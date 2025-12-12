import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography, FormControl, InputLabel, Select, MenuItem, Pagination } from '@mui/material'
import { format } from 'date-fns'

type Measurement = {
  id: string
  date: string
  institutionId: string
  sectorId: string
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
  status: 'Conforme' | 'Não Conforme'
  institution?: Institution
  sector?: Sector
  files?: Attachment[]
}
type Attachment = { id: string; name: string; path: string; mime: string; size: number; createdAt: string; category?: string }
type Institution = { id: string; name: string }
type Sector = { id: string; name: string; institutionId: string }

export default function MeasurementsPage() {
  const [items, setItems] = useState<Measurement[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [sectors, setSectors] = useState<Sector[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<Measurement>>({ date: new Date().toISOString().slice(0,10) })
  const [formTime, setFormTime] = useState<string>(new Date().toISOString().slice(11,16))
  const [photos, setPhotos] = useState<File[]>([])
  const [reports, setReports] = useState<File[]>([])
  const [certificates, setCertificates] = useState<File[]>([])
  const [filterInstitutionId, setFilterInstitutionId] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const load = async () => { const { data } = await api.get('/api/measurements', { params: { institutionId: filterInstitutionId || undefined, page, pageSize } }); setItems(data.items); setTotal(data.total) }
  useEffect(() => { load(); api.get('/api/institutions').then(r=>setInstitutions(r.data.items)); api.get('/api/sectors').then(r=>setSectors(r.data.items)) }, [])
  useEffect(() => { load() }, [filterInstitutionId, page])
  const save = async () => {
    let id = form.id
    const payload = { ...form, date: `${form.date}T${formTime}:00` }
    if (form.id) await api.put(`/api/measurements/${form.id}`, payload)
    else { const { data } = await api.post('/api/measurements', payload); id = data.id }
    if (id) {
      if (photos.length) { const fd = new FormData(); photos.forEach(f=>fd.append('files', f)); await api.post(`/api/measurements/${id}/files`, fd, { params: { category: 'photo' }, headers: { 'Content-Type':'multipart/form-data' } }) }
      if (reports.length) { const fd = new FormData(); reports.forEach(f=>fd.append('files', f)); await api.post(`/api/measurements/${id}/files`, fd, { params: { category: 'report' }, headers: { 'Content-Type':'multipart/form-data' } }) }
      if (certificates.length) { const fd = new FormData(); certificates.forEach(f=>fd.append('files', f)); await api.post(`/api/measurements/${id}/files`, fd, { params: { category: 'certificate' }, headers: { 'Content-Type':'multipart/form-data' } }) }
    }
    setOpen(false); setForm({}); setFormTime(new Date().toISOString().slice(11,16)); setPhotos([]); setReports([]); setCertificates([]); load()
  }
  const remove = async (id: string) => { await api.delete(`/api/measurements/${id}`); load() }
  const download = async (fmt: 'pdf'|'excel') => { const res = await api.get('/api/measurements/report', { params: { format: fmt, institutionId: filterInstitutionId || undefined }, responseType: 'blob' }); const url = URL.createObjectURL(res.data); const a = document.createElement('a'); a.href = url; a.download = `relatorio.${fmt==='pdf'?'pdf':'xlsx'}`; a.click(); URL.revokeObjectURL(url) }
  const downloadOne = async (id: string) => {
    const res = await api.get(`/api/measurements/${id}/report`, { responseType: 'blob' })
    const disp = (res.headers as any)['content-disposition'] as string | undefined
    const match = disp?.match(/filename="(.+?)"/)
    const fname = match?.[1] || `medicao_${id}.pdf`
    const blob = new Blob([res.data], { type: 'application/pdf' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fname
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  const uploadFiles = async (id: string, files: FileList | null) => {
    if (!files || files.length === 0) return
    const fd = new FormData()
    Array.from(files).forEach(f => fd.append('files', f))
    await api.post(`/api/measurements/${id}/files`, fd, { headers: { 'Content-Type':'multipart/form-data' } })
    load()
  }
  return (
    <Box>
      <Paper sx={{ p:2, mb:2 }}>
        <Typography variant="h6">Medições</Typography>
        <Box sx={{ display:'flex', gap:2, mt:2, alignItems: { xs: 'stretch', sm: 'center' }, flexDirection: { xs: 'column', sm: 'row' } }}>
          <FormControl fullWidth sx={{ minWidth: { xs: '100%', sm: 240 } }}>
            <InputLabel>Filtrar por Instituição</InputLabel>
            <Select value={filterInstitutionId} label="Filtrar por Instituição" onChange={(e)=>setFilterInstitutionId(e.target.value)}>
              <MenuItem value="">Todas</MenuItem>
              {institutions.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" sx={{ width: { xs: '100%', sm: 'auto' } }} onClick={() => { setForm({ date: new Date().toISOString().slice(0,10) }); setFormTime(new Date().toISOString().slice(11,16)); setOpen(true) }}>Nova</Button>
          <Button sx={{ width: { xs: '100%', sm: 'auto' } }} onClick={() => download('pdf')}>Exportar PDF</Button>
          <Button sx={{ width: { xs: '100%', sm: 'auto' } }} onClick={() => download('excel')}>Exportar Excel</Button>
        </Box>
      </Paper>
      <Paper sx={{ p:2 }}>
        {items.map(m => (
          <Box key={m.id} sx={{ py:2, borderBottom:'1px solid #eee' }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:{ xs: 'flex-start', sm: 'center' }, flexDirection:{ xs: 'column', sm: 'row' } }}>
              <Typography sx={{ color: 'text.primary' }}>{format(new Date(m.date), 'dd/MM/yyyy | HH:mm')} | {m.institution?.name || m.institutionId} {'>'} {m.sector?.name || m.sectorId} | {m.status}</Typography>
              <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mt:{ xs: 1, sm: 0 } }}>
                <Button sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => { setForm({ ...m, date: m.date.slice(0,10) }); setFormTime(m.date.slice(11,16)); setOpen(true) }}>Editar</Button>
                <Button sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => downloadOne(m.id)}>PDF</Button>
                <Button color="error" sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => remove(m.id)}>Excluir</Button>
              </Box>
            </Box>
            <Box sx={{ mt:1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Anexos existentes</Typography>
              <Box sx={{ display:'flex', flexWrap:'wrap', gap:1, mb:1 }}>
                {(m.files||[]).map(f => (
                  <Button key={f.id} href={f.path} target="_blank" rel="noopener" sx={{ color: 'primary.main' }}>{(f as any).category ? `[${(f as any).category}] ` : ''}{f.name}</Button>
                ))}
              </Box>
            </Box>
          </Box>
        ))}
        <Box sx={{ display:'flex', justifyContent:'center', mt:2 }}>
          <Pagination count={Math.max(1, Math.ceil(total / pageSize))} page={page} onChange={(_,p)=>setPage(p)} color="primary" />
        </Box>
      </Paper>
      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{form.id ? 'Editar' : 'Nova'} Medição</DialogTitle>
        <DialogContent>
          <TextField label="Data" type="date" InputLabelProps={{ shrink: true }} fullWidth sx={{ mt:1 }} value={form.date||''} onChange={e=>setForm({ ...form, date: e.target.value })} />
          <TextField label="Hora" type="time" InputLabelProps={{ shrink: true }} fullWidth sx={{ mt:1 }} value={formTime} onChange={e=>setFormTime(e.target.value)} />
          <FormControl fullWidth sx={{ mt:1 }}>
            <InputLabel>Instituição</InputLabel>
            <Select value={form.institutionId||''} label="Instituição" onChange={(e)=>setForm({ ...form, institutionId: e.target.value })}>
              {institutions.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt:1 }}>
            <InputLabel>Setor</InputLabel>
            <Select value={form.sectorId||''} label="Setor" onChange={(e)=>setForm({ ...form, sectorId: e.target.value })}>
              {sectors.filter(s=>!form.institutionId || s.institutionId===form.institutionId).map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display:'grid', gap:2, mt:2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
            {[
              ['humidity','Umidade (%)'],
              ['airSpeed','Velocidade do ar (m/s)'],
              ['temperature','Temperatura (°C)'],
              ['fungiInternal','Fungos Internos (UFC/m³)'],
              ['fungiExternal','Fungos Externos (UFC/m³)'],
              ['ieRatio','Relação I/E'],
              ['aerodispersoids','Aerodispersóides (μg/m³)'],
              ['bacteriaInternal','Bactérias Internas (UFC/m³)'],
              ['bacteriaExternal','Bactérias Externas (UFC/m³)'],
              ['co2Internal','CO₂ Interno (ppm)'],
              ['co2External','CO₂ Externo (ppm)'],
              ['pm10','PM10 (µg/m³)'],
              ['pm25','PM2.5 (µg/m³)']
            ].map(([key,label]) => (
              <TextField key={key} label={label as string} type="number" fullWidth value={(form as any)[key]||''} onChange={e=>setForm({ ...form, [key]: parseFloat(e.target.value) })} />
            ))}
          </Box>
          <Box sx={{ mt:3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Anexos</Typography>
            <Box sx={{ display:'grid', gap:2, mt:1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Fotos</Typography>
                <Button variant="outlined" component="label">Selecionar fotos<input hidden type="file" multiple accept="image/*" onChange={e=>setPhotos(Array.from(e.target.files||[]))} /></Button>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Laudos</Typography>
                <Button variant="outlined" component="label">Selecionar laudos<input hidden type="file" multiple accept="application/pdf,image/*" onChange={e=>setReports(Array.from(e.target.files||[]))} /></Button>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Certificados</Typography>
                <Button variant="outlined" component="label">Selecionar certificados<input hidden type="file" multiple accept="application/pdf,image/*" onChange={e=>setCertificates(Array.from(e.target.files||[]))} /></Button>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
