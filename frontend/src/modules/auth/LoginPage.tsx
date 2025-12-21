import { Box, Button, Paper, TextField, Typography, Alert } from '@mui/material'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import { api } from '../../shared/api'
import { useServerStatus } from '../../shared/useServerStatus'
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login } = useAuth()
  const navigate = useNavigate()
  const online = useServerStatus()
  const { t } = useTranslation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      login(data.token, data.user?.language)
      navigate('/dashboard')
    } catch (err: any) {
      const code = err?.code
      if (code === 'ERR_NETWORK') {
        setError(t('login.offline'))
      } else {
        setError(err?.response?.data?.message || t('login.error'))
      }
    }
  }

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: { xs: 4, sm: 8 }, px: 2 }}>
      <Paper sx={{ p: 4, width: '100%', maxWidth: 380, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <img src="/logo.png" alt="Air Watch Logo" style={{ width: 120, height: 'auto', marginBottom: 16 }} />
          <Typography variant="h4" component="h1" fontWeight="bold" color="primary" gutterBottom>{t('app.title')}</Typography>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ fontStyle: 'italic' }}>
            {t('app.slogan')}
          </Typography>
        </Box>
        <Typography variant="h6" gutterBottom sx={{ alignSelf: 'flex-start', width: '100%' }}>{t('login.title')}</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {!online && <Alert severity="warning" sx={{ mb: 2 }}>{t('login.reconnecting')}</Alert>}
        <form onSubmit={handleSubmit}>
          <TextField label={t('login.email')} value={email} onChange={(e) => setEmail(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <TextField label={t('login.password')} type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth sx={{ mb: 2 }} />
          <Button type="submit" variant="contained" fullWidth disabled={!online}>{t('login.button')}</Button>
        </form>
      </Paper>
    </Box>
  )
}
