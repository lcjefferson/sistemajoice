import { useEffect, useState } from 'react'
import { api } from './api'

export function useServerStatus() {
  const [online, setOnline] = useState<boolean>(true)
  useEffect(() => {
    let mounted = true
    const check = async () => {
      try {
        await api.get('/api/health', { timeout: 3000 })
        if (mounted) setOnline(true)
      } catch {
        if (mounted) setOnline(false)
      }
    }
    check()
    const id = setInterval(check, 5000)
    return () => { mounted = false; clearInterval(id) }
  }, [])
  return online
}
