import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { childrenApi } from '../api/children'

// ─── Конфигурация персонажей и цветов ────────────────────────────────────────

const AVATARS = [
  { type: 'explorer', name: 'Искатель',   emoji: '🧭', hint: 'мальчик-исследователь' },
  { type: 'witch',    name: 'Волшебница', emoji: '🔮', hint: 'девочка с книгой' },
  { type: 'builder',  name: 'Строитель',  emoji: '🔨', hint: 'мальчик с инструментами' },
  { type: 'ranger',   name: 'Следопыт',   emoji: '🗺️', hint: 'девочка с картой' },
]

const COLORS = [
  { id: 'blue',   label: 'Синий',      bg: '#DBEAFE', border: '#3B82F6', dot: '#3B82F6' },
  { id: 'green',  label: 'Зелёный',    bg: '#DCFCE7', border: '#22C55E', dot: '#22C55E' },
  { id: 'orange', label: 'Оранжевый',  bg: '#FFEDD5', border: '#F97316', dot: '#F97316' },
  { id: 'purple', label: 'Фиолетовый', bg: '#EDE9FE', border: '#8B5CF6', dot: '#8B5CF6' },
]

const GRADES = [
  { label: '1 класс', available: false },
  { label: '2 класс', available: false },
  { label: '3 класс', available: true },
  { label: '4 класс', available: false },
]

// ─── Компонент карточки персонажа ─────────────────────────────────────────────

function AvatarCard({
  avatar,
  color,
  selected,
  onClick,
}: {
  avatar: (typeof AVATARS)[0]
  color: (typeof COLORS)[0]
  selected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.97 }}
      className="relative flex flex-col items-center gap-1 p-3 rounded-2xl transition-all"
      style={{
        background: color.bg,
        border: selected ? `2.5px solid var(--color-primary)` : `2px solid transparent`,
        boxShadow: selected ? `0 0 0 3px rgba(79,70,229,0.18)` : `0 1px 4px rgba(0,0,0,0.06)`,
        outline: 'none',
      }}
    >
      {selected && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-2 -right-2 w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: 'var(--color-primary)' }}
        >
          ✓
        </motion.span>
      )}
      <span className="text-3xl leading-none">{avatar.emoji}</span>
      <span className="text-xs font-bold text-gray-700 leading-tight text-center">{avatar.name}</span>
      <span
        className="w-4 h-4 rounded-full border-2 border-white"
        style={{ background: color.dot, boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }}
      />
    </motion.button>
  )
}

// ─── Главная страница ──────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [avatarType, setAvatarType] = useState<string | null>(null)
  const [avatarColor, setAvatarColor] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // редирект если дети уже есть
  useEffect(() => {
    childrenApi.list().then((children) => {
      if (children.length > 0) navigate('/parent/dashboard', { replace: true })
    }).catch(() => {})
  }, [navigate])

  const canSubmit = name.trim().length >= 2 && avatarType && avatarColor

  async function handleCreate() {
    if (!canSubmit) return
    setError('')
    setLoading(true)
    try {
      const child = await childrenApi.create({
        name: name.trim(),
        avatar_type: avatarType!,
        avatar_color: avatarColor!,
      })
      navigate(`/child/${child.id}/world`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Ошибка сервера. Попробуйте позже')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-lg mx-auto">

        {/* Заголовок */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="font-pixel text-lg mb-2" style={{ color: 'var(--color-primary)' }}>
            EduQuest
          </h1>
          <h2 className="text-2xl font-bold text-gray-800">Расскажите о вашем ребёнке</h2>
          <p className="text-gray-500 text-sm mt-1">Вместе создадим героя для его приключений!</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl shadow-md p-6 flex flex-col gap-6"
        >

          {/* Имя ребёнка */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Имя ребёнка</label>
            <input
              type="text"
              placeholder="Например: Маша или Витя"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={30}
              className="border border-gray-300 rounded-xl px-4 py-3 text-base outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 transition"
            />
          </div>

          {/* Класс */}
          <div className="flex flex-col gap-2">
            <label className="font-bold text-gray-700">Класс</label>
            <div className="flex gap-2 flex-wrap">
              {GRADES.map((g) => (
                <div
                  key={g.label}
                  className="px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1"
                  style={{
                    background: g.available ? 'var(--color-primary)' : '#F3F4F6',
                    color: g.available ? '#fff' : '#9CA3AF',
                    cursor: g.available ? 'default' : 'not-allowed',
                  }}
                >
                  {g.label}
                  {!g.available && <span className="text-xs opacity-70">· скоро</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Выбор персонажа — сетка 4×4 */}
          <div className="flex flex-col gap-3">
            <label className="font-bold text-gray-700">Выберите персонажа</label>
            <p className="text-sm text-gray-400 -mt-1">4 героя × 4 цвета — выбери своего!</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AVATARS.map((avatar) =>
                COLORS.map((color) => (
                  <AvatarCard
                    key={`${avatar.type}-${color.id}`}
                    avatar={avatar}
                    color={color}
                    selected={avatarType === avatar.type && avatarColor === color.id}
                    onClick={() => {
                      setAvatarType(avatar.type)
                      setAvatarColor(color.id)
                    }}
                  />
                ))
              )}
            </div>

            {/* Подпись выбранного */}
            {avatarType && avatarColor && (() => {
              const av = AVATARS.find((a) => a.type === avatarType)!
              const cl = COLORS.find((c) => c.id === avatarColor)!
              return (
                <motion.div
                  key={`${avatarType}-${avatarColor}`}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: cl.bg }}
                >
                  <span className="text-3xl">{av.emoji}</span>
                  <div>
                    <div className="font-bold text-gray-800">{av.name}</div>
                    <div className="text-sm text-gray-500">{av.hint} · {cl.label} цвет</div>
                  </div>
                </motion.div>
              )
            })()}
          </div>

          {/* Ошибка */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Кнопка */}
          <motion.button
            onClick={handleCreate}
            disabled={!canSubmit || loading}
            whileTap={canSubmit ? { scale: 0.97 } : {}}
            className="w-full rounded-2xl font-bold text-white text-lg transition"
            style={{
              minHeight: 56,
              background: canSubmit ? 'var(--color-primary)' : '#D1D5DB',
              cursor: canSubmit ? 'pointer' : 'not-allowed',
            }}
          >
            {loading ? 'Создаём героя...' : '⚔️ Создать героя!'}
          </motion.button>

          {!canSubmit && (
            <p className="text-center text-sm text-gray-400 -mt-3">
              {!name.trim() ? 'Введите имя ребёнка' : 'Выберите персонажа'}
            </p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
