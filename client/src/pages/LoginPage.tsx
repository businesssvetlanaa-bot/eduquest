import { useState, type FormEvent, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import type { Child } from '../types/auth'

const AVATAR_EMOJI: Record<string, string> = {
  explorer: '🧭',
  witch: '🔮',
  builder: '🔨',
  ranger: '🗺️',
}

const COLOR_BG: Record<string, string> = {
  blue: '#DBEAFE',
  green: '#DCFCE7',
  orange: '#FFEDD5',
  purple: '#EDE9FE',
}

type Tab = 'parent' | 'child'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, childLogin } = useAuth()

  const [tab, setTab] = useState<Tab>('parent')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // для детского входа
  const [parentEmail, setParentEmail] = useState(() => localStorage.getItem('childLogin_parentEmail') ?? '')
  const [children, setChildren] = useState<Child[]>([])
  const [childrenLoading, setChildrenLoading] = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [pin, setPin] = useState('')

  useEffect(() => { setError('') }, [tab])

  async function handleParentLogin(e: FormEvent) {
    e.preventDefault()
    if (!email || !password) { setError('Введите email и пароль'); return }
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/parent/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сервера. Попробуйте позже')
    } finally {
      setLoading(false)
    }
  }

  async function loadChildren(e: FormEvent) {
    e.preventDefault()
    if (!parentEmail) { setError('Введите email родителя'); return }
    setError(''); setChildrenLoading(true)
    try {
      const resp = await fetch(`/api/children/by-parent-email?email=${encodeURIComponent(parentEmail)}`)
      if (!resp.ok) throw new Error('Родитель не найден')
      const data = await resp.json()
      setChildren(data)
      if (data.length === 0) setError('У этого родителя нет созданных профилей детей')
      else localStorage.setItem('childLogin_parentEmail', parentEmail)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Родитель не найден')
    } finally {
      setChildrenLoading(false)
    }
  }

  async function handleChildLogin() {
    if (!selectedChild) { setError('Выберите профиль'); return }
    setError(''); setLoading(true)
    try {
      const data = await childLogin(selectedChild.id, pin || '0000')
      navigate(`/child/${data.child.id}/world`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка входа')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-pixel text-xl mb-2" style={{ color: 'var(--color-primary)' }}>EduQuest</h1>
          <p className="text-gray-500 text-sm">AI-репетитор для 3 класса</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md overflow-hidden">
          {/* Вкладки */}
          <div className="flex border-b border-gray-100">
            {(['parent', 'child'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError('') }}
                className="flex-1 py-4 font-bold text-sm transition"
                style={{
                  color: tab === t ? 'var(--color-primary)' : '#9CA3AF',
                  borderBottom: tab === t ? '2px solid var(--color-primary)' : '2px solid transparent',
                }}
              >
                {t === 'parent' ? '👤 Я родитель' : '🎮 Я ребёнок'}
              </button>
            ))}
          </div>

          <div className="p-5 sm:p-8">
            {tab === 'parent' ? (
              <form onSubmit={handleParentLogin} className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Вход для родителей</h2>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-gray-700">Email</label>
                  <input
                    type="email"
                    placeholder="example@mail.ru"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-semibold text-gray-700">Пароль</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Ваш пароль"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full border border-gray-300 rounded-xl px-4 py-3 pr-12 text-base outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition"
                    />
                    <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                      {showPassword ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.099-3.56M6.228 6.228A9.97 9.97 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-4.342 5.311M6.228 6.228L3 3m3.228 3.228l3.65 3.65M17.772 17.772l3.228 3.228m-3.228-3.228l-3.65-3.65" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-xl font-bold text-white text-base transition active:scale-95 disabled:opacity-60"
                  style={{ background: 'var(--color-primary)', minHeight: 48, padding: '0 24px' }}
                >
                  {loading ? 'Вход...' : 'Войти'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold text-gray-800 mb-2">Вход для детей</h2>

                {children.length === 0 ? (
                  <form onSubmit={loadChildren} className="flex flex-col gap-3">
                    <p className="text-sm text-gray-500">Введите email родителя, чтобы найти свой профиль</p>
                    <div className="flex flex-col gap-1">
                      <label className="text-sm font-semibold text-gray-700">Email родителя</label>
                      <input
                        type="email"
                        placeholder="Email мамы или папы"
                        value={parentEmail}
                        onChange={(e) => setParentEmail(e.target.value)}
                        className="border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition"
                      />
                    </div>
                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
                    )}
                    <button
                      type="submit"
                      disabled={childrenLoading}
                      className="rounded-xl font-bold text-white text-base transition active:scale-95 disabled:opacity-60"
                      style={{ background: 'var(--color-secondary)', minHeight: 48, padding: '0 24px' }}
                    >
                      {childrenLoading ? 'Ищем...' : 'Найти профили →'}
                    </button>
                  </form>
                ) : (
                  <div className="flex flex-col gap-4">
                    <p className="text-sm text-gray-500">Выбери свой персонаж:</p>
                    <div className="grid grid-cols-2 gap-3">
                      {children.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setSelectedChild(c)}
                          className="rounded-xl p-4 text-center transition border-2"
                          style={{
                            background: COLOR_BG[c.avatar_color] || '#F3F4F6',
                            borderColor: selectedChild?.id === c.id ? 'var(--color-primary)' : 'transparent',
                            boxShadow: selectedChild?.id === c.id ? '0 0 0 2px var(--color-primary)' : 'none',
                          }}
                        >
                          <div className="text-4xl mb-1">{AVATAR_EMOJI[c.avatar_type] || '🎮'}</div>
                          <div className="font-bold text-gray-800 text-sm">{c.name}</div>
                          <div className="text-xs text-gray-500">Ур. {c.level} · {c.xp} XP</div>
                        </button>
                      ))}
                    </div>

                    {selectedChild && (
                      <div className="flex flex-col gap-1">
                        <label className="text-sm font-semibold text-gray-700">PIN-код (если установлен)</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          maxLength={4}
                          placeholder="1234"
                          value={pin}
                          onChange={(e) => setPin(e.target.value.replace(/\D/, ''))}
                          className="border border-gray-300 rounded-xl px-4 py-3 text-base text-center tracking-widest outline-none focus:border-[var(--color-primary)] transition"
                        />
                      </div>
                    )}

                    {error && (
                      <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">{error}</div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => { setChildren([]); setSelectedChild(null); setPin(''); setError('') }}
                        className="flex-1 rounded-xl font-semibold text-gray-600 border border-gray-300 transition active:scale-95"
                        style={{ minHeight: 48 }}
                      >
                        ← Назад
                      </button>
                      <button
                        onClick={handleChildLogin}
                        disabled={!selectedChild || loading}
                        className="flex-1 rounded-xl font-bold text-white transition active:scale-95 disabled:opacity-60"
                        style={{ background: 'var(--color-secondary)', minHeight: 48 }}
                      >
                        {loading ? 'Вход...' : 'Играть! 🎮'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <p className="text-center text-gray-500 text-sm mt-6">
              Нет аккаунта?{' '}
              <Link to="/register" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                Зарегистрироваться
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
