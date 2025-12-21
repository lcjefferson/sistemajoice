import { createContext, useContext, useMemo, useState } from 'react'
import { jwtDecode } from 'jwt-decode'

type User = { id: string; name: string; role: 'admin' | 'analyst' | 'viewer' }

type AuthCtx = {
  token: string | null
  user: User | null
  login: (t: string, lang?: string) => void
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
      // Note: language is not in token usually, we might rely on 'login' action or separate fetch.
      // But if we put it in token at backend, we can use it here.
      // For now, let's assume we get it from login action or initial API call.
      return { id: decoded.sub, name: decoded.name, role: decoded.role }
    } catch { return null }
  })

  // We need access to i18n to set language
  // But we can't use hook inside this function easily if we want to keep it pure context provider?
  // Actually we can import the instance
  const login = (t: string, lang?: string) => {
    localStorage.setItem('token', t)
    setToken(t)
    const decoded: any = jwtDecode(t)
    setUser({ id: decoded.sub, name: decoded.name, role: decoded.role })
    
    if (lang) {
      import('../../i18n-config').then(({ default: i18n }) => {
        i18n.changeLanguage(lang)
      })
    }
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
