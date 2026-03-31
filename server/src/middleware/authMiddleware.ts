import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface JwtPayload {
  id: string
  email?: string
  role: 'parent' | 'child'
}

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Необходима авторизация' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
    req.user = payload
    next()
  } catch {
    res.status(401).json({ error: 'Сессия истекла. Войдите снова' })
  }
}

export function requireParent(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'parent') {
    res.status(403).json({ error: 'Доступ только для родителей' })
    return
  }
  next()
}

export function requireChild(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'child') {
    res.status(403).json({ error: 'Доступ только для детей' })
    return
  }
  next()
}
