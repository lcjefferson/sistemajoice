
import React, { useEffect, useState } from 'react'
import { Box, Button, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material'
import { useTranslation } from 'react-i18next'
import { api } from '../../shared/api'

type Message = {
  id: string
  name: string
  email: string
  message: string
  type: string
  createdAt: string
  read: boolean
}

const MessagesPage: React.FC = () => {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMessages()
  }, [])

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/api/contact')
      setMessages(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  const markRead = async (id: string, read: boolean) => {
    await api.patch(`/api/contact/${id}/read`, { read })
    await fetchMessages()
  }

  const remove = async (id: string) => {
    await api.delete(`/api/contact/${id}`)
    await fetchMessages()
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        {t('messages.title')}
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('messages.date')}</TableCell>
              <TableCell>{t('messages.name')}</TableCell>
              <TableCell>{t('messages.email')}</TableCell>
              <TableCell>{t('messages.type')}</TableCell>
              <TableCell>{t('messages.message')}</TableCell>
              <TableCell>{t('common.actions')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {messages.map((msg) => (
              <TableRow key={msg.id}>
                <TableCell>{formatDate(msg.createdAt)}</TableCell>
                <TableCell>{msg.name}</TableCell>
                <TableCell>{msg.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={msg.type === 'email' ? t('contact.type_email') : t('contact.type_internal')} 
                    color={msg.type === 'email' ? 'primary' : 'secondary'} 
                    size="small" 
                  />
                  <Chip
                    label={msg.read ? t('messages.read') : t('messages.unread')}
                    color={msg.read ? 'success' : 'warning'}
                    size="small"
                    sx={{ ml: 1 }}
                  />
                </TableCell>
                <TableCell>{msg.message}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button size="small" onClick={() => markRead(msg.id, !msg.read)}>
                      {msg.read ? t('messages.mark_unread') : t('messages.mark_read')}
                    </Button>
                    <Button size="small" color="error" onClick={() => remove(msg.id)}>
                      {t('common.delete')}
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            {messages.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  {t('messages.no_messages')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}

export default MessagesPage
