import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'

type Sector = { id: string; name: string; institutionId: string }
type Institution = { id: string; name: string }

export default function SectorsPage() {
  const { t } = useTranslation()
  const [items, setItems] = useState<Sector[]>([])
  const [institutions, setInstitutions] = useState<Institution[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState<Partial<Sector>>({})
  const load = async () => { const { data } = await api.get('/api/sectors', { params: { q: search } }); setItems(data.items) }
  useEffect(() => { load(); api.get('/api/institutions').then(r=>setInstitutions(r.data.items)) }, [search])
  const save = async () => { if (form.id) await api.put(`/api/sectors/${form.id}`, form); else await api.post('/api/sectors', form); setOpen(false); setForm({}); load() }
  const remove = async (id: string) => { await api.delete(`/api/sectors/${id}`); load() }
  return (
    <Box>
      <Paper sx={{ p:2, mb:2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">{t('sectors.title')}</Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField size="small" label={t('common.search')} value={search} onChange={e=>setSearch(e.target.value)} />
          <Button variant="contained" onClick={() => { setForm({}); setOpen(true) }}>{t('common.new')}</Button>
        </Box>
      </Paper>
      <Paper sx={{ p:2 }}>
        {items.map(s => (
          <Box key={s.id} sx={{ display:'flex', justifyContent:'space-between', py:1, borderBottom:'1px solid #eee', flexDirection:{ xs: 'column', sm: 'row' }, alignItems:{ xs: 'flex-start', sm: 'center' } }}>
            <Typography>{s.name}</Typography>
            <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mt:{ xs: 1, sm: 0 } }}>
              <Button sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => { setForm(s); setOpen(true) }}>{t('common.edit')}</Button>
              <Button color="error" sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => remove(s.id)}>{t('common.delete')}</Button>
            </Box>
          </Box>
        ))}
      </Paper>
      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>{form.id ? t('sectors.edit_sector') : t('sectors.new_sector')}</DialogTitle>
        <DialogContent>
          <TextField label={t('common.name')} fullWidth sx={{ mt:1 }} value={form.name||''} onChange={e=>setForm({ ...form, name: e.target.value })} />
          <FormControl fullWidth sx={{ mt:1 }}>
            <InputLabel>{t('common.institution')}</InputLabel>
            <Select value={form.institutionId||''} label={t('common.institution')} onChange={(e)=>setForm({ ...form, institutionId: e.target.value })}>
              {institutions.map(i => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>{t('common.cancel')}</Button>
          <Button variant="contained" onClick={save}>{t('common.save')}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
