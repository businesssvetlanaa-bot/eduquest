const BASE = '/api'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, { headers: authHeaders(), ...options })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера')
  return data
}

export interface Message {
  id: string
  session_id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface SessionData {
  id: string
  child_id: string
  subject: 'math' | 'russian' | 'english'
  task_text: string | null
  completed: boolean
  xp_earned: number
  coins_earned: number
  messages: Message[]
  topic: { id: string; title: string; rules: string } | null
  child: { name: string }
}

export const sessionsApi = {
  start: (body: {
    child_id: string
    image_base64?: string
    image_mime_type?: string
    task_text?: string
    task_hint?: string
    subject?: string
  }) =>
    request<{
      session_id: string
      first_message: string
      subject: string
      topic: string
      task_text: string
    }>('/sessions/start', { method: 'POST', body: JSON.stringify(body) }),

  get: (sessionId: string) =>
    request<SessionData>(`/sessions/${sessionId}`),

  sendMessage: (sessionId: string, payload: { content?: string; image_base64?: string; image_mime_type?: string }) =>
    request<{
      message: string
      session_complete: boolean
      xp_earned?: number
      coins_earned?: number
      user_content: string
    }>(`/sessions/${sessionId}/message`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
