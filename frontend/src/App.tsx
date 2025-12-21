import { CssBaseline, AppBar, Toolbar, Container, Box, Button, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Chip } from '@mui/material'
import React from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined'
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined'
import ContactSupportOutlinedIcon from '@mui/icons-material/ContactSupportOutlined'
import MessageOutlinedIcon from '@mui/icons-material/MessageOutlined'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTranslation } from 'react-i18next'

import { useServerStatus } from './shared/useServerStatus'
import LoginPage from './modules/auth/LoginPage'
import { useAuth } from './modules/auth/AuthContext'
import DashboardPage from './modules/dashboard/DashboardPage'
import UsersPage from './modules/users/UsersPage'
import InstitutionsPage from './modules/institutions/InstitutionsPage'
import SectorsPage from './modules/sectors/SectorsPage'
import MeasurementsPage from './modules/measurements/MeasurementsPage'
import AboutPage from './modules/about/AboutPage'
import ContactPage from './modules/contact/ContactPage'
import MessagesPage from './modules/contact/MessagesPage'
import RequireAuth from './modules/auth/RequireAuth'
import LanguageSelector from './shared/LanguageSelector'

function AppLayout() {
  const { token, logout, user } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useMediaQuery('(max-width:600px)')
  const [open, setOpen] = React.useState(false)
  const online = useServerStatus()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const navItems = [
    { to: '/dashboard', label: t('menu.dashboard'), icon: <DashboardOutlinedIcon /> },
    { to: '/usuarios', label: t('menu.users'), icon: <PeopleOutlineIcon /> },
    { to: '/instituicoes', label: t('menu.institutions'), icon: <DomainOutlinedIcon /> },
    { to: '/setores', label: t('menu.sectors'), icon: <ApartmentOutlinedIcon /> },
    { to: '/medicoes', label: t('menu.measurements'), icon: <ScienceOutlinedIcon /> },
    ...(user?.role === 'admin' ? [{ to: '/mensagens', label: t('menu.messages'), icon: <MessageOutlinedIcon /> }] : []),
    { to: '/fale-conosco', label: t('menu.contact'), icon: <ContactSupportOutlinedIcon /> },
    { to: '/quem-somos', label: t('menu.about'), icon: <InfoOutlinedIcon /> }
  ]

  return (
    <>
      <CssBaseline />
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <Box component="img" src="/logo.png" alt="Air Watch" sx={{ height: 48, width: 'auto', mr: 2 }} />
          
          {token && !isMobile ? (
            <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', gap: 1 }}>
              {navItems.map(item => {
                const active = location.pathname.startsWith(item.to)
                return (
                  <Button key={item.to} component={NavLink} to={item.to} variant={'text'} startIcon={item.icon} sx={{ fontSize: '16px', color: 'common.white', borderRadius: 0, px: 2, '& .MuiButton-startIcon': { color: 'common.white' }, ...(active ? { borderBottom: '2px solid #fff', fontWeight: 700 } : {}) }}>
                    {item.label}
                  </Button>
                )
              })}
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1 }} />
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LanguageSelector />
            {token && !isMobile && (
              <>
                <Button onClick={handleLogout} sx={{ color: 'common.white', fontSize: '16px', ml: 1 }}>{t('menu.logout')}</Button>
                {!online && <Chip label={t('common.server_offline') || 'Offline'} color="default" sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />}
              </>
            )}
            {token && isMobile && (
              <IconButton onClick={() => setOpen(true)} aria-label="menu">
                <MenuIcon sx={{ color: 'common.white' }} />
              </IconButton>
            )}
          </Box>
        </Toolbar>
      </AppBar>
      <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
        <Box sx={{ width: 280 }} role="presentation" onClick={() => setOpen(false)}>
          <List>
            {navItems.map(item => {
              const active = location.pathname.startsWith(item.to)
              return (
                <ListItemButton key={item.to} component={NavLink} to={item.to} selected={active}>
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              )
            })}
            <ListItemButton onClick={handleLogout}>
              <ListItemText primary={t('menu.logout')} />
            </ListItemButton>
          </List>
        </Box>
      </Drawer>
      <Container sx={{ mt: { xs: 2, sm: 3 }, mb: 5, px: { xs: 1, sm: 3 } }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/usuarios" element={<RequireAuth><UsersPage /></RequireAuth>} />
          <Route path="/instituicoes" element={<RequireAuth><InstitutionsPage /></RequireAuth>} />
          <Route path="/setores" element={<RequireAuth><SectorsPage /></RequireAuth>} />
          <Route path="/medicoes" element={<RequireAuth><MeasurementsPage /></RequireAuth>} />
          <Route path="/mensagens" element={<RequireAuth><MessagesPage /></RequireAuth>} />
          <Route path="/fale-conosco" element={<ContactPage />} />
          <Route path="/quem-somos" element={<AboutPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Container>
    </>
  )
}

export default AppLayout