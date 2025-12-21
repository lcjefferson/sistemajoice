
import { Router } from 'express'
import { prisma } from '../db.js'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

router.get('/', requireAuth, async (req, res) => {
  try {
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: 'desc' }
    })
    res.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ message: 'Erro ao buscar mensagens' })
  }
})

router.post('/', async (req, res) => {
  const { name, email, message, type } = req.body

  if (!name || !email || !message || !type) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' })
  }

  try {
    const newMessage = await prisma.contactMessage.create({
      data: {
        name,
        email,
        message,
        type
      }
    })

    if (type === 'email') {
      // Simulate email sending
      console.log('Sending email to support@airwatch.com from', email, 'Message:', message)
      // In a real app, you would use nodemailer or an email service here
    }

    res.status(201).json({ message: 'Mensagem enviada com sucesso!', id: newMessage.id })
  } catch (error) {
    console.error('Error saving contact message:', error)
    res.status(500).json({ message: 'Erro ao enviar mensagem' })
  }
})

export default router
