import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { api } from '../../shared/api'
import { useServerStatus } from '../../shared/useServerStatus'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const online = useServerStatus()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      login(data.token)
      navigate('/dashboard')
    } catch (err: any) {
      const code = err?.code
      if (code === 'ERR_NETWORK') {
        setError('Servidor offline. Tente novamente em alguns segundos.')
      } else {
        setError(err?.response?.data?.message || 'Falha no login')
      }
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 4, sm: 8 }, px: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 380 }}>
        <Typography variant="h6" gutterBottom>Acesso</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!online && <Alert severity="warning" sx={{ mb: 2 }}>Servidor offline. Tentando reconectar...</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField label="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <TextField label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={!online}>Entrar</Button>
        </form>
      </Paper>
    </Box>
  )
}
