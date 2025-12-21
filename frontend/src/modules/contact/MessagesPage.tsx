
import React, { useEffect, useState } from 'react'
import { Box, Paper, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip } from '@mui/material'
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
                </TableCell>
                <TableCell>{msg.message}</TableCell>
              </TableRow>
            ))}
            {messages.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} align="center">
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
