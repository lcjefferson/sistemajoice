import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography } from '@mui/material'

type Institution = { id: string; name: string }

export default function InstitutionsPage() {
  const [items, setItems] = useState<Institution[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<Institution>>({})
  const load = async () => { const { data } = await api.get('/api/institutions'); setItems(data.items) }
  useEffect(() => { load() }, [])
  const save = async () => { if (form.id) await api.put(`/api/institutions/${form.id}`, form); else await api.post('/api/institutions', form); setOpen(false); setForm({}); load() }
  const remove = async (id: string) => { await api.delete(`/api/institutions/${id}`); load() }
  return (
    <Box>
      <Paper sx={{ p:2, mb:2 }}>
        <Typography variant="h6">Instituições</Typography>
        <Button variant="contained" sx={{ mt:2 }} onClick={() => { setForm({}); setOpen(true) }}>Nova</Button>
      </Paper>
      <Paper sx={{ p:2 }}>
        {items.map(i => (
          <Box key={i.id} sx={{ display:'flex', justifyContent:'space-between', py:1, borderBottom:'1px solid #eee', flexDirection:{ xs: 'column', sm: 'row' }, alignItems:{ xs: 'flex-start', sm: 'center' } }}>
            <Typography>{i.name}</Typography>
            <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mt:{ xs: 1, sm: 0 } }}>
              <Button sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => { setForm(i); setOpen(true) }}>Editar</Button>
              <Button color="error" sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => remove(i.id)}>Excluir</Button>
            </Box>
          </Box>
        ))}
      </Paper>
      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>{form.id ? 'Editar' : 'Nova'} Instituição</DialogTitle>
        <DialogContent>
          <TextField label="Nome" fullWidth sx={{ mt:1 }} value={form.name||''} onChange={e=>setForm({ ...form, name: e.target.value })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
