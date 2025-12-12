import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const hdr = req.headers.authorization || ''
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null
  if (!token) return res.status(401).json({ message: 'Não autenticado' })
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as any
    ;(req as any).user = { id: payload.sub, role: payload.role }
    next()
  } catch {
    return res.status(401).json({ message: 'Token inválido' })
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user
    if (!user) return res.status(401).json({ message: 'Não autenticado' })
    if (!roles.includes(user.role)) return res.status(403).json({ message: 'Sem permissão' })
    next()
  }
}
