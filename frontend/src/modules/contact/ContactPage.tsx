
import React, { useState } from 'react'
import { Box, Paper, Typography, TextField, Button, RadioGroup, FormControlLabel, Radio, Snackbar, Alert, FormControl, FormLabel } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api } from '../../shared/api'

const ContactPage: React.FC = () => {
  const { t } = useTranslation()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
    type: 'email'
  })
  const [feedback, setFeedback] = useState<{ open: boolean; message: string; type: 'success' | 'error' }>({
    open: false,
    message: '',
    type: 'success'
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/contact', formData)
      setFeedback({ open: true, message: t('contact.success'), type: 'success' })
      setFormData({ name: '', email: '', message: '', type: 'email' })
    } catch (error) {
      console.error(error)
      setFeedback({ open: true, message: t('contact.error'), type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          {t('contact.title')}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label={t('contact.name')}
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label={t('contact.email')}
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              fullWidth
            />
            <TextField
              label={t('contact.message')}
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              multiline
              rows={4}
              fullWidth
            />
            
            <FormControl>
              <FormLabel id="contact-type-label">{t('contact.type')}</FormLabel>
              <RadioGroup
                row
                aria-labelledby="contact-type-label"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <FormControlLabel value="email" control={<Radio />} label={t('contact.type_email')} />
                <FormControlLabel value="internal" control={<Radio />} label={t('contact.type_internal')} />
              </RadioGroup>
            </FormControl>

            <Button variant="contained" type="submit" disabled={loading} size="large">
              {loading ? t('common.loading') : t('contact.submit')}
            </Button>
          </Box>
        </form>
      </Paper>

      <Snackbar open={feedback.open} autoHideDuration={6000} onClose={() => setFeedback({ ...feedback, open: false })}>
        <Alert onClose={() => setFeedback({ ...feedback, open: false })} severity={feedback.type} sx={{ width: '100%' }}>
          {feedback.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}

export default ContactPage
