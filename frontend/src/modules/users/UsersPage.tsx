import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography } from '@mui/material'

type User = { id: string; name: string; email: string; role: 'admin' | 'analyst' | 'viewer' }

export default function UsersPage() {
  const [items, setItems] = useState<User[]>([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Partial<User> & { password?: string }>({})

  const load = async () => {
    const { data } = await api.get('/api/users')
    setItems(data.items)
  }
  useEffect(() => { load() }, [])

  const save = async () => {
    if (form.id) await api.put(`/api/users/${form.id}`, form)
    else await api.post('/api/users', form)
    setOpen(false)
    setForm({})
    load()
  }
  const remove = async (id: string) => { await api.delete(`/api/users/${id}`); load() }

  return (
    <Box>
      <Paper sx={{ p:2, mb:2 }}>
        <Typography variant="h6">Usuários</Typography>
        <Button variant="contained" sx={{ mt:2 }} onClick={() => { setForm({}); setOpen(true) }}>Novo</Button>
      </Paper>
      <Paper sx={{ p:2 }}>
        {items.map(u => (
          <Box key={u.id} sx={{ display:'flex', justifyContent:'space-between', py:1, borderBottom:'1px solid #eee', flexDirection:{ xs: 'column', sm: 'row' }, alignItems:{ xs: 'flex-start', sm: 'center' } }}>
            <Box>
              <Typography>{u.name} - {u.email} ({u.role})</Typography>
            </Box>
            <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mt:{ xs: 1, sm: 0 } }}>
              <Button sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => { setForm(u); setOpen(true) }}>Editar</Button>
              <Button color="error" sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => remove(u.id)}>Excluir</Button>
            </Box>
          </Box>
        ))}
      </Paper>
      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>{form.id ? 'Editar' : 'Novo'} Usuário</DialogTitle>
        <DialogContent>
          <TextField label="Nome" fullWidth sx={{ mt:1 }} value={form.name||''} onChange={e=>setForm({ ...form, name: e.target.value })} />
          <TextField label="E-mail" fullWidth sx={{ mt:1 }} value={form.email||''} onChange={e=>setForm({ ...form, email: e.target.value })} />
          {!form.id && <TextField label="Senha" type="password" fullWidth sx={{ mt:1 }} value={form.password||''} onChange={e=>setForm({ ...form, password: e.target.value })} />}
          <TextField label="Perfil" fullWidth sx={{ mt:1 }} value={form.role||'viewer'} onChange={e=>setForm({ ...form, role: e.target.value as any })} />
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={save}>Salvar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
