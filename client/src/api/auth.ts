const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token')
  const res = await fetch(BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Ошибка сервера')
  return data
}

export const authApi = {
  register: (body: { name: string; email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    request<{ token: string; user: { id: string; name: string; email: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  childLogin: (body: { child_id: string; pin: string }) =>
    request<{ token: string; child: import('../types/auth').Child }>('/auth/child-login', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  me: () => request<{ role: 'parent' | 'child'; user?: import('../types/auth').User; child?: import('../types/auth').Child }>('/auth/me'),

  getChildren: (parentId: string) =>
    request<import('../types/auth').Child[]>(`/children?parent_id=${parentId}`),
}
