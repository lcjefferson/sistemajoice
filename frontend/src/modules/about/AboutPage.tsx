import { Box, Paper, Typography, Container, Button } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useTranslation, Trans } from 'react-i18next'

export default function AboutPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <Container maxWidth="md">
      <Paper sx={{ p: { xs: 3, md: 5 }, mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <img src="/logo.png" alt="Air Watch Logo" style={{ width: 150, height: 'auto', marginBottom: 24 }} />
        
        <Typography variant="h3" component="h1" gutterBottom color="primary" fontWeight="bold">
          {t('about.title')}
        </Typography>
        
        <Typography variant="h5" gutterBottom sx={{ fontStyle: 'italic', color: 'text.secondary', mb: 4 }}>
          {t('app.slogan')}
        </Typography>

        <Box sx={{ textAlign: 'left', width: '100%', mb: 4 }}>
          <Typography variant="body1" paragraph>
            <Trans i18nKey="about.description_1" components={{ strong: <strong /> }} />
          </Typography>
          
          <Typography variant="body1" paragraph>
            {t('about.description_2')}
          </Typography>

          <Typography variant="body1" paragraph>
            {t('about.description_3')}
          </Typography>
        </Box>

        <Button variant="contained" size="large" onClick={() => navigate('/dashboard')}>
          {t('about.access_dashboard')}
        </Button>
      </Paper>
    </Container>
  )
}
