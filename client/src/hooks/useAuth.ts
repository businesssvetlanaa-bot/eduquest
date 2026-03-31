import { useState, useEffect, useCallback } from 'react'
import { authApi } from '../api/auth'
import type { User, Child } from '../types/auth'

interface AuthState {
  token: string | null
  role: 'parent' | 'child' | null
  user: User | null
  child: Child | null
  loading: boolean
}

// Читаем localStorage при каждом вызове хука — не при загрузке модуля.
// Это важно: каждый компонент получает актуальное состояние после логина.
function readStorage(): AuthState {
  return {
    token: localStorage.getItem('token'),
    role: localStorage.getItem('role') as 'parent' | 'child' | null,
    user: null,
    child: null,
    loading: true,
  }
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(readStorage)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      setState((s) => ({ ...s, loading: false }))
      return
    }
    authApi
      .me()
      .then((data) => {
        setState((s) => ({
          ...s,
          role: data.role,
          user: data.user ?? null,
          child: data.child ?? null,
          loading: false,
        }))
      })
      .catch(() => {
        localStorage.removeItem('token')
        localStorage.removeItem('role')
        setState({ token: null, role: null, user: null, child: null, loading: false })
      })
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const data = await authApi.register({ name, email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('role', 'parent')
    setState({ token: data.token, role: 'parent', user: data.user, child: null, loading: false })
    return data
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password })
    localStorage.setItem('token', data.token)
    localStorage.setItem('role', 'parent')
    setState({ token: data.token, role: 'parent', user: data.user, child: null, loading: false })
    return data
  }, [])

  const childLogin = useCallback(async (child_id: string, pin: string) => {
    const data = await authApi.childLogin({ child_id, pin })
    localStorage.setItem('token', data.token)
    localStorage.setItem('role', 'child')
    setState({ token: data.token, role: 'child', user: null, child: data.child, loading: false })
    return data
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    setState({ token: null, role: null, user: null, child: null, loading: false })
  }, [])

  return { ...state, register, login, childLogin, logout }
}
