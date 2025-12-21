import { useEffect, useState } from 'react'
import { api } from '../../shared/api'
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Paper, TextField, Typography, FormControl, InputLabel, Select, MenuItem } from '@mui/material'
import { useTranslation } from 'react-i18next'

type User = { id: string; name: string; email: string; role: 'admin' | 'analyst' | 'viewer' }

export default function UsersPage() {
  const { t } = useTranslation()
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
        <Typography variant="h6">{t('users.title')}</Typography>
        <Button variant="contained" sx={{ mt:2 }} onClick={() => { setForm({}); setOpen(true) }}>{t('common.new')}</Button>
      </Paper>
      <Paper sx={{ p:2 }}>
        {items.map(u => (
          <Box key={u.id} sx={{ display:'flex', justifyContent:'space-between', py:1, borderBottom:'1px solid #eee', flexDirection:{ xs: 'column', sm: 'row' }, alignItems:{ xs: 'flex-start', sm: 'center' } }}>
            <Box>
              <Typography>{u.name} - {u.email} ({t(`users.roles.${u.role}`)})</Typography>
            </Box>
            <Box sx={{ display:'flex', gap:1, flexWrap:'wrap', mt:{ xs: 1, sm: 0 } }}>
              <Button sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => { setForm(u); setOpen(true) }}>{t('common.edit')}</Button>
              <Button color="error" sx={{ width:{ xs:'100%', sm:'auto' } }} onClick={() => remove(u.id)}>{t('common.delete')}</Button>
            </Box>
          </Box>
        ))}
      </Paper>
      <Dialog open={open} onClose={()=>setOpen(false)}>
        <DialogTitle>{form.id ? t('users.edit_user') : t('users.new_user')}</DialogTitle>
        <DialogContent>
          <TextField label={t('common.name')} fullWidth sx={{ mt:1 }} value={form.name||''} onChange={e=>setForm({ ...form, name: e.target.value })} />
          <TextField label={t('common.email')} fullWidth sx={{ mt:1 }} value={form.email||''} onChange={e=>setForm({ ...form, email: e.target.value })} />
          {!form.id && <TextField label={t('common.password')} type="password" fullWidth sx={{ mt:1 }} value={form.password||''} onChange={e=>setForm({ ...form, password: e.target.value })} />}
          <FormControl fullWidth sx={{ mt: 1 }}>
            <InputLabel>{t('common.role')}</InputLabel>
            <Select
              value={form.role || 'viewer'}
              label={t('common.role')}
              onChange={(e) => setForm({ ...form, role: e.target.value as any })}
            >
              <MenuItem value="admin">{t('users.roles.admin')}</MenuItem>
              <MenuItem value="analyst">{t('users.roles.analyst')}</MenuItem>
              <MenuItem value="viewer">{t('users.roles.viewer')}</MenuItem>
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
