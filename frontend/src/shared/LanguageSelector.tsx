import { IconButton, Menu, MenuItem, Tooltip } from '@mui/material'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import LanguageIcon from '@mui/icons-material/Language'
import { api } from '../shared/api'
import { useAuth } from '../modules/auth/AuthContext'

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const { token } = useAuth()

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const changeLanguage = async (lng: string) => {
    i18n.changeLanguage(lng)
    handleClose()
    
    // Save preference if logged in
    if (token) {
      try {
        await api.put('/api/auth/me/language', { language: lng })
      } catch (error) {
        console.error('Failed to save language preference', error)
      }
    }
  }

  return (
    <>
      <Tooltip title="Alterar idioma / Change language">
        <IconButton
          size="large"
          aria-label="change language"
          aria-controls="menu-appbar-lang"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
        >
          <LanguageIcon />
        </IconButton>
      </Tooltip>
      <Menu
        id="menu-appbar-lang"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={() => changeLanguage('pt')} selected={i18n.language === 'pt'}>Português</MenuItem>
        <MenuItem onClick={() => changeLanguage('en')} selected={i18n.language === 'en'}>English</MenuItem>
        <MenuItem onClick={() => changeLanguage('es')} selected={i18n.language === 'es'}>Español</MenuItem>
      </Menu>
    </>
  )
}
