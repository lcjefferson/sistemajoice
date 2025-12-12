import { CssBaseline, AppBar, Toolbar, Typography, Container, Box, Button, IconButton, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Chip } from '@mui/material'
import React from 'react'
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import MenuIcon from '@mui/icons-material/Menu'
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined'
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline'
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined'
import ApartmentOutlinedIcon from '@mui/icons-material/ApartmentOutlined'
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useServerStatus } from './shared/useServerStatus'
import LoginPage from './modules/auth/LoginPage'
import { useAuth } from './modules/auth/AuthContext'
import DashboardPage from './modules/dashboard/DashboardPage'
import UsersPage from './modules/users/UsersPage'
import InstitutionsPage from './modules/institutions/InstitutionsPage'
import SectorsPage from './modules/sectors/SectorsPage'
import MeasurementsPage from './modules/measurements/MeasurementsPage'
import RequireAuth from './modules/auth/RequireAuth'

function AppLayout() {
  const { token, logout } = useAuth()
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
    { to: '/dashboard', label: 'Dashboard', icon: <DashboardOutlinedIcon /> },
    { to: '/usuarios', label: 'Usuários', icon: <PeopleOutlineIcon /> },
    { to: '/instituicoes', label: 'Instituições', icon: <DomainOutlinedIcon /> },
    { to: '/setores', label: 'Setores', icon: <ApartmentOutlinedIcon /> },
    { to: '/medicoes', label: 'Medições', icon: <ScienceOutlinedIcon /> }
  ]
  return (
    <>
      <CssBaseline />
      <AppBar position="sticky" color="primary">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, letterSpacing: 0.4, color: 'common.white' }}>Sistema Ambiental</Typography>
          {token && (
            isMobile ? (
              <IconButton onClick={() => setOpen(true)} aria-label="menu">
                <MenuIcon sx={{ color: 'common.white' }} />
              </IconButton>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {navItems.map(item => {
                  const active = location.pathname.startsWith(item.to)
                  return (
                    <Button key={item.to} component={NavLink} to={item.to} variant={'text'} startIcon={item.icon} sx={{ color: 'common.white', borderRadius: 0, px: 1.25, '& .MuiButton-startIcon': { color: 'common.white' }, ...(active ? { borderBottom: '2px solid #fff', fontWeight: 700 } : {}) }}>
                      {item.label}
                    </Button>
                  )
                })}
                <Button onClick={handleLogout} sx={{ color: 'common.white' }}>Sair</Button>
                {!online && <Chip label="Servidor offline" color="default" sx={{ ml: 1, bgcolor: 'rgba(255,255,255,0.2)', color: '#fff' }} />}
              </Box>
            )
          )}
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
              <ListItemText primary="Sair" />
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
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Container>
    </>
  )
}

export default AppLayout
