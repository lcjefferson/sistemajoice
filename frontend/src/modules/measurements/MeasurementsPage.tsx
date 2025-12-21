import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography, FormControl, InputLabel, Select, MenuItem, Pagination, Snackbar, Alert, Chip } from '@mui/material'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'

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
  latitude?: number
  longitude?: number
  institution?: Institution
  sector?: Sector
  files?: Attachment[]
}
type Attachment = { id: string; name: string; path: string; mime: string; size: number; createdAt: string; category?: string }
type Institution = { id: string; name: string }
type Sector = { id: string; name: string; institutionId: string }

export default function MeasurementsPage() {
  const { t } = useTranslation()
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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)
  const [total, setTotal] = useState(0)
  const [feedback, setFeedback] = useState<{ open: boolean; message: string; type: 'success' | 'error' | 'warning' }>({ open: false, message: '', type: 'success' })
  const load = async () => { const { data } = await api.get('/api/measurements', { params: { institutionId: filterInstitutionId || undefined, page, pageSize, q: search } }); setItems(data.items); setTotal(data.total) }
  
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setFeedback({ open: true, message: t('common.location_error'), type: 'error' })
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }))
      },
      (error) => {
        console.error(error)
        setFeedback({ open: true, message: t('common.location_error'), type: 'error' })
      }
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File[]>>) => {
    if (e.target.files) {
      setter(prev => [...prev, ...Array.from(e.target.files!)])
      // Reset input value to allow selecting the same file again if needed
      e.target.value = ''
    }
  }

  useEffect(() => { load(); api.get('/api/institutions').then(r=>setInstitutions(r.data.items)); api.get('/api/sectors').then(r=>setSectors(r.data.items)) }, [])
  useEffect(() => { load() }, [filterInstitutionId, page, search])
  const save = async () => {
    try {
      let id = form.id
      const payload = { ...form, date: `${form.date}T${formTime}:00` }
      if (form.id) await api.put(`/api/measurements/${form.id}`, payload)
      else { const { data } = await api.post('/api/measurements', payload); id = data.id }
      
      let uploadErrors = 0
      if (id) {
        const upload = async (files: File[], category: string) => {
          if (!files.length) return
          const fd = new FormData()
          files.forEach(f => fd.append('files', f))
          try {
            // Do not set Content-Type header manually, let the browser set it with boundary
            await api.post(`/api/measurements/${id}/files`, fd, { params: { category } })
          } catch (e) {
            console.error(e)
            uploadErrors++
          }
        }
        await upload(photos, 'photo')
        await upload(reports, 'report')
        await upload(certificates, 'certificate')
      }
      
      setOpen(false); setForm({}); setFormTime(new Date().toISOString().slice(11,16)); setPhotos([]); setReports([]); setCertificates([]); load()
      setFeedback({ 
        open: true, 
        message: uploadErrors > 0 
          ? t('common.success') + ' (' + t('common.error') + ' upload)' 
          : t('common.success'), 
        type: uploadErrors > 0 ? 'warning' : 'success' 
      } as any)
    } catch (e) {
      console.error(e)
      setFeedback({ open: true, message: t('common.error'), type: 'error' })
    }
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
  return (
    <Box>
      <Paper sx={{ p:2, mb:2 }}>
        <Typography variant="h6" sx={{ mb:2 }}>{t('measurements.title')}</Typography>
        <Box sx={{ display:'flex', gap:2, flexWrap:'wrap' }}>
          <TextField size="small" label={t('common.search')} value={search} onChange={e=>setSearch(e.target.value)} sx={{ width: 200 }} />
          <FormControl size="small" sx={{ width: 200 }}>
            <InputLabel>{t('common.filter_by_institution')}</InputLabel>
            <Select value={filterInstitutionId} label={t('common.filter_by_institution')} onChange={(e) => setFilterInstitutionId(e.target.value)}>
              <MenuItem value="">{t('common.all_institutions')}</MenuItem>
              {institutions.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" sx={{ width: { xs: '100%', sm: 'auto' } }} onClick={() => { setForm({ date: new Date().toISOString().slice(0,10) }); setFormTime(new Date().toISOString().slice(11,16)); setOpen(true) }}>{t('common.new')}</Button>
          <Button sx={{ width: { xs: '100%', sm: 'auto' } }} onClick={() => download('pdf')}>{t('common.export_pdf')}</Button>
          <Button sx={{ width: { xs: '100%', sm: 'auto' } }} onClick={() => download('excel')}>{t('common.export_excel')}</Button>
        </Box>
      </Paper>
      <Paper sx={{ p:2 }}>
        {items.map(m => (
          <Box key={m.id} sx={{ py:2, borderBottom:'1px solid #eee' }}>
            <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:{ xs: 'flex-start', sm: 'center' }, flexDirection:{ xs: 'column', sm: 'row' } }}>
              <Typography sx={{ color: 'text.primary' }}>{format(new Date(m.date), 'dd/MM/yyyy | HH:mm')} | {m.institution?.name || m.institutionId} {'>'} {m.sector?.name || m.sectorId} | {m.status === 'Conforme' ? t('measurements.status_compliant') : t('measurements.status_non_compliant')}</Typography>
              <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mt:{ xs: 1, sm: 0 } }}>
                <Button sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => { setForm({ ...m, date: m.date.slice(0,10) }); setFormTime(m.date.slice(11,16)); setOpen(true) }}>{t('common.edit')}</Button>
                <Button sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => downloadOne(m.id)}>{t('common.pdf')}</Button>
                <Button color="error" sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => remove(m.id)}>{t('common.delete')}</Button>
              </Box>
            </Box>
            <Box sx={{ mt:1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{t('common.existing_attachments')}</Typography>
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
        <DialogTitle>{form.id ? t('measurements.edit_measurement') : t('measurements.new_measurement')}</DialogTitle>
        <DialogContent>
          <TextField label={t('common.date')} type="date" InputLabelProps={{ shrink: true }} fullWidth sx={{ mt:1 }} value={form.date||''} onChange={e=>setForm({ ...form, date: e.target.value })} />
          <TextField label={t('common.time')} type="time" InputLabelProps={{ shrink: true }} fullWidth sx={{ mt:1 }} value={formTime} onChange={e=>setFormTime(e.target.value)} />
          <FormControl fullWidth sx={{ mt:1 }}>
            <InputLabel>{t('common.institution')}</InputLabel>
            <Select value={form.institutionId||''} label={t('common.institution')} onChange={(e)=>setForm({ ...form, institutionId: e.target.value })}>
              {institutions.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth sx={{ mt:1 }}>
            <InputLabel>{t('common.sector')}</InputLabel>
            <Select value={form.sectorId||''} label={t('common.sector')} onChange={(e)=>setForm({ ...form, sectorId: e.target.value })}>
              {sectors.filter(s=>!form.institutionId || s.institutionId===form.institutionId).map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)}
            </Select>
          </FormControl>
          <Box sx={{ display:'grid', gap:2, mt:2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
            {[
              ['humidity',t('measurements.humidity_label')],
              ['airSpeed',t('measurements.air_speed_label')],
              ['temperature',t('measurements.temperature_label')],
              ['fungiInternal',t('measurements.fungi_internal_label')],
              ['fungiExternal',t('measurements.fungi_external_label')],
              ['ieRatio',t('measurements.ie_ratio_label')],
              ['aerodispersoids',t('measurements.aerodispersoids_label')],
              ['bacteriaInternal',t('measurements.bacteria_internal_label')],
              ['bacteriaExternal',t('measurements.bacteria_external_label')],
              ['co2Internal',t('measurements.co2_internal_label')],
              ['co2External',t('measurements.co2_external_label')],
              ['pm10',t('measurements.pm10_label')],
              ['pm25',t('measurements.pm25_label')]
            ].map(([key,label]) => (
              <TextField key={key} label={label as string} type="number" fullWidth value={(form as any)[key]||''} onChange={e=>setForm({ ...form, [key]: parseFloat(e.target.value) })} />
            ))}
          </Box>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
            <TextField label={t('common.latitude')} type="number" value={form.latitude || ''} onChange={e=>setForm({ ...form, latitude: parseFloat(e.target.value) })} sx={{ width: 150 }} />
            <TextField label={t('common.longitude')} type="number" value={form.longitude || ''} onChange={e=>setForm({ ...form, longitude: parseFloat(e.target.value) })} sx={{ width: 150 }} />
            <Button variant="outlined" onClick={handleGetLocation}>{t('common.get_location')}</Button>
          </Box>
          <Box sx={{ mt:3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{t('common.attachments')}</Typography>
            <Box sx={{ display:'grid', gap:2, mt:1, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>{t('common.photos')}</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  <Button variant="outlined" component="label" size="small">
                    {t('common.select_photos')}
                    <input hidden type="file" multiple accept="image/*" onChange={e=>handleFileSelect(e, setPhotos)} />
                  </Button>
                  <Button variant="contained" component="label" size="small">
                    {t('common.take_photo')}
                    <input hidden type="file" accept="image/*" capture="environment" onChange={e=>handleFileSelect(e, setPhotos)} />
                  </Button>
                </Box>
                {photos.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {photos.map((f, i) => (
                      <Chip key={i} label={f.name} onDelete={() => setPhotos(photos.filter((_, index) => index !== i))} size="small" />
                    ))}
                  </Box>
                )}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>{t('common.reports')}</Typography>
                <Button variant="outlined" component="label" size="small">
                  {t('common.select_reports')}
                  <input hidden type="file" multiple accept="application/pdf,image/*" onChange={e=>handleFileSelect(e, setReports)} />
                </Button>
                {reports.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {reports.map((f, i) => (
                      <Chip key={i} label={f.name} onDelete={() => setReports(reports.filter((_, index) => index !== i))} size="small" />
                    ))}
                  </Box>
                )}
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>{t('common.certificates')}</Typography>
                <Button variant="outlined" component="label" size="small">
                  {t('common.select_certificates')}
                  <input hidden type="file" multiple accept="application/pdf,image/*" onChange={e=>handleFileSelect(e, setCertificates)} />
                </Button>
                {certificates.length > 0 && (
                  <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {certificates.map((f, i) => (
                      <Chip key={i} label={f.name} onDelete={() => setCertificates(certificates.filter((_, index) => index !== i))} size="small" />
                    ))}
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={feedback.open} autoHideDuration={6000} onClose={()=>setFeedback({ ...feedback, open: false })}>
        <Alert onClose={()=>setFeedback({ ...feedback, open: false })} severity={feedback.type} sx={{ width: '100%' }}>{feedback.message}</Alert>
      </Snackbar>
    </Box>
  )
}
