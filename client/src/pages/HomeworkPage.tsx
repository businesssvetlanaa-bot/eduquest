import { useRef, useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { sessionsApi } from '../api/sessions'

type InputMode = 'choose' | 'preview' | 'text'
type Subject = 'math' | 'russian' | 'english'

const SUBJECT_LABELS: Record<Subject, string> = {
  math:    'Математика',
  russian: 'Русский',
  english: 'English',
}

const SUBJECT_COLORS: Record<Subject, string> = {
  math:    'var(--biome-math)',
  russian: 'var(--biome-russian)',
  english: 'var(--biome-english)',
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // убираем data:image/...;base64, — оставляем только данные
      resolve(result.split(',')[1] ?? result)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function HomeworkPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const location = useLocation()
  const locationSubject = (location.state as { subject?: Subject } | null)?.subject

  const cameraRef  = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)

  const [mode, setMode]           = useState<InputMode>('choose')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')
  const [taskText, setTaskText]   = useState('')
  const [taskHint, setTaskHint]   = useState('')
  const [subject, setSubject]     = useState<Subject>(locationSubject ?? 'math')
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  function handleFileSelect(file: File) {
    if (!file.type.startsWith('image/')) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setMode('preview')
    setError('')
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
    e.target.value = ''
  }

  async function submitPhoto() {
    if (!imageFile || !id) return
    setLoading(true)
    setError('')
    try {
      const base64 = await fileToBase64(imageFile)
      const mimeType = imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'
      const res = await sessionsApi.start({
        child_id:        id,
        image_base64:    base64,
        image_mime_type: mimeType,
        task_hint:       taskHint.trim() || undefined,
      })
      navigate(`/child/${id}/session/${res.session_id}`, { state: { photoPreview: imagePreview } })
    } catch (e) {
      setError('Не удалось прочитать задание. Сделай фото чётче или напиши текст вручную')
      setLoading(false)
    }
  }

  async function submitText() {
    if (!taskText.trim() || !id) return
    setLoading(true)
    setError('')
    try {
      const res = await sessionsApi.start({
        child_id:  id,
        task_text: taskText.trim(),
        subject,
      })
      navigate(`/child/${id}/session/${res.session_id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сервера')
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: 'var(--color-bg)' }}
      >
        <div className="text-7xl animate-bounce">🎓</div>
        <p className="text-xl font-bold text-gray-700 text-center px-4">
          Профессор Куб читает задание...
        </p>
        <div className="flex gap-2 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-3 h-3 rounded-full"
              style={{
                background: 'var(--color-primary)',
                animation: `bounce 1s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center px-4 py-8"
      style={{ background: 'var(--color-bg)' }}
    >
      {/* Скрытые input-элементы */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onInputChange}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />

      {/* Шапка */}
      <div className="w-full max-w-lg mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">
          Покажи своё домашнее задание 📚
        </h1>
        <p className="text-gray-500 text-sm">
          Профессор Куб поможет тебе разобраться!
        </p>
      </div>

      <div className="w-full max-w-lg flex flex-col gap-4">

        {/* ─── Режим выбора способа ─── */}
        {mode === 'choose' && (
          <>
            <button
              onClick={() => cameraRef.current?.click()}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white shadow-sm border-2 border-transparent hover:border-[var(--color-primary)] transition-all text-left"
            >
              <span className="text-4xl">📷</span>
              <div>
                <div className="font-bold text-gray-800 text-lg">Сфотографировать</div>
                <div className="text-gray-500 text-sm">Открою камеру</div>
              </div>
            </button>

            <button
              onClick={() => galleryRef.current?.click()}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white shadow-sm border-2 border-transparent hover:border-[var(--color-primary)] transition-all text-left"
            >
              <span className="text-4xl">🖼️</span>
              <div>
                <div className="font-bold text-gray-800 text-lg">Выбрать из галереи</div>
                <div className="text-gray-500 text-sm">Выберу фото с устройства</div>
              </div>
            </button>

            <button
              onClick={() => { setMode('text'); setError('') }}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white shadow-sm border-2 border-transparent hover:border-[var(--color-primary)] transition-all text-left"
            >
              <span className="text-4xl">✏️</span>
              <div>
                <div className="font-bold text-gray-800 text-lg">Написать текст</div>
                <div className="text-gray-500 text-sm">Введу задание вручную</div>
              </div>
            </button>
          </>
        )}

        {/* ─── Режим превью фото ─── */}
        {mode === 'preview' && (
          <>
            <div className="rounded-2xl overflow-hidden shadow-md bg-white p-2">
              <img
                src={imagePreview}
                alt="Превью задания"
                className="w-full rounded-xl object-contain max-h-64"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm font-bold text-gray-700">
                Какое задание разбираем? <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={taskHint}
                onChange={e => setTaskHint(e.target.value)}
                placeholder="Например: задание 3, упражнение 5, первый абзац..."
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3 text-base outline-none focus:border-[var(--color-primary)] transition bg-white"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={submitPhoto}
              disabled={!taskHint.trim()}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg shadow-md active:scale-95 transition-transform disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}
            >
              Отправить репетитору →
            </button>

            <button
              onClick={() => { setMode('choose'); setImageFile(null); setImagePreview(''); setTaskHint(''); setError('') }}
              className="w-full py-3 rounded-2xl font-semibold text-gray-600 bg-white border border-gray-200"
            >
              ← Выбрать другой способ
            </button>
          </>
        )}

        {/* ─── Режим текстового ввода ─── */}
        {mode === 'text' && (
          <>
            {/* Выбор предмета */}
            <div className="flex gap-3">
              {(Object.keys(SUBJECT_LABELS) as Subject[]).map(s => (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  className="flex-1 py-3 rounded-xl font-bold text-white text-sm transition-all active:scale-95"
                  style={{
                    background: subject === s ? SUBJECT_COLORS[s] : '#e5e7eb',
                    color: subject === s ? 'white' : '#6b7280',
                  }}
                >
                  {SUBJECT_LABELS[s]}
                </button>
              ))}
            </div>

            <textarea
              value={taskText}
              onChange={e => setTaskText(e.target.value)}
              placeholder="Напиши сюда текст задания..."
              rows={5}
              className="w-full p-4 rounded-2xl border-2 border-gray-200 focus:border-[var(--color-primary)] outline-none resize-none text-gray-800 text-base bg-white"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={submitText}
              disabled={!taskText.trim()}
              className="w-full py-4 rounded-2xl font-bold text-white text-lg shadow-md active:scale-95 transition-transform disabled:opacity-40"
              style={{ background: 'var(--color-primary)' }}
            >
              Отправить →
            </button>

            <button
              onClick={() => { setMode('choose'); setError('') }}
              className="w-full py-3 rounded-2xl font-semibold text-gray-600 bg-white border border-gray-200"
            >
              ← Назад
            </button>
          </>
        )}
      </div>
    </div>
  )
}
