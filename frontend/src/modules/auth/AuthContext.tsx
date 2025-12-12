import { createContext, useContext, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

type User = { id: string; name: string; role: 'admin' | 'analyst' | 'viewer' }

type AuthCtx = {
  token: string | null
  user: User | null
  login: (t: string) => void
  logout: () => void
}

const Ctx = createContext<AuthCtx>({ token: null, user: null, login: () => {}, logout: () => {} })

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try { return localStorage.getItem('token') } catch { return null }
  })
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('token')
      if (!stored) return null
      const decoded: any = jwtDecode(stored)
      return { id: decoded.sub, name: decoded.name, role: decoded.role }
    } catch { return null }
  })

  const login = (t: string) => {
    localStorage.setItem('token', t)
    setToken(t)
    const decoded: any = jwtDecode(t)
    setUser({ id: decoded.sub, name: decoded.name, role: decoded.role })
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({ token, user, login, logout }), [token, user])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
