import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  function validate(): string {
    if (!form.name.trim()) return 'Введите ваше имя'
    if (!form.email.trim()) return 'Введите email'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return 'Введите корректный email'
    if (form.password.length < 8) return 'Пароль должен быть не менее 8 символов'
    if (form.password !== form.confirm) return 'Пароли не совпадают'
    return ''
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const err = validate()
    if (err) { setError(err); return }

    setError('')
    setLoading(true)
    try {
      await register(form.name.trim(), form.email.trim(), form.password)
      navigate('/onboarding')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сервера. Попробуйте позже')
    } finally {
      setLoading(false)
    }
  }

  const EyeIcon = ({ open }: { open: boolean }) => open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.099-3.56M6.228 6.228A9.97 9.97 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-4.342 5.311M6.228 6.228L3 3m3.228 3.228l3.65 3.65M17.772 17.772l3.228 3.228m-3.228-3.228l-3.65-3.65" />
    </svg>
  )

  const field = (label: string, key: keyof typeof form, type = 'text', placeholder = '', show?: boolean, onToggle?: () => void) => (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <input
          type={type === 'password' ? (show ? 'text' : 'password') : type}
          placeholder={placeholder}
          value={form[key]}
          onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          className="w-full border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition"
          style={{ paddingRight: type === 'password' ? '48px' : undefined }}
          autoComplete={type === 'password' ? 'new-password' : undefined}
        />
        {type === 'password' && onToggle && (
          <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
            <EyeIcon open={!!show} />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--color-bg)' }}>
      <div className="w-full max-w-md">
        {/* Лого */}
        <div className="text-center mb-8">
          <h1 className="font-pixel text-xl mb-2" style={{ color: 'var(--color-primary)' }}>EduQuest</h1>
          <p className="text-gray-500 text-sm">AI-репетитор для 3 класса</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md p-5 sm:p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Создать аккаунт</h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {field('Ваше имя', 'name', 'text', 'Как вас зовут?')}
            {field('Email', 'email', 'email', 'example@mail.ru')}
            {field('Пароль', 'password', 'password', 'Минимум 8 символов', showPass, () => setShowPass(v => !v))}
            {field('Повторите пароль', 'confirm', 'password', 'Введите пароль ещё раз', showConfirm, () => setShowConfirm(v => !v))}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl font-bold text-white text-base transition active:scale-95 disabled:opacity-60"
              style={{
                background: 'var(--color-primary)',
                minHeight: 48,
                padding: '0 24px',
              }}
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </form>

          <p className="text-center text-gray-500 text-sm mt-6">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-semibold" style={{ color: 'var(--color-primary)' }}>
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
