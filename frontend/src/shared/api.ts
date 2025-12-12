import axios from 'axios'

const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
const defaultBase = `http://${host}:4000`
export const api = axios.create({
  baseURL: (import.meta as any).env?.VITE_API_URL || defaultBase
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
