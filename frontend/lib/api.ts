export interface Todo {
  id: string
  title: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  completed: boolean
  completed_at: string | null
  created_at: string
}

export interface RewardSite {
  id: string
  url: string
  name: string
  is_preconfigured: boolean
  timed_cost: number
  timed_duration_minutes: number
  icon: string | null
}

export interface UnlockSession {
  id: string
  site_id: string
  points_spent: number
  started_at: string
  expires_at: string
  active: boolean
}

export interface PointTransaction {
  id: string
  amount: number
  type: 'earned' | 'spent'
  todo_id: string | null
  unlock_session_id: string | null
  created_at: string
}

export interface PointBalance {
  balance: number
}

export interface ActiveUnlock {
  url: string
  name: string
  expires_at: string
}

let authToken: string | null = null

async function getToken(): Promise<string | null> {
  if (authToken) return authToken
  try {
    const res = await fetch('/api/health')
    if (res.ok) {
      const data = await res.json()
      authToken = data.token
      return authToken
    }
  } catch (e) {
    // server not available
  }
  return null
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const token = await getToken()
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) {
    headers['X-FocusReward-Token'] = token
  }

  const res = await fetch(url, {
    headers,
    ...options,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  getTodos: (completed?: boolean) =>
    request<Todo[]>(`/api/todos${completed !== undefined ? `?completed=${completed}` : ''}`),

  createTodo: (title: string, difficulty: string) =>
    request<Todo>('/api/todos', {
      method: 'POST',
      body: JSON.stringify({ title, difficulty }),
    }),

  completeTodo: (id: string) =>
    request<Todo>(`/api/todos/${id}/complete`, { method: 'PATCH' }),

  deleteTodo: (id: string) =>
    request<void>(`/api/todos/${id}`, { method: 'DELETE' }),

  getSites: () => request<RewardSite[]>('/api/sites'),

  createSite: (data: { url: string; name: string; timed_cost: number; timed_duration_minutes: number }) =>
    request<RewardSite>('/api/sites', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteSite: (id: string) =>
    request<void>(`/api/sites/${id}`, { method: 'DELETE' }),

  timedUnlock: (site_id: string) =>
    request<UnlockSession>('/api/unlock/timed', {
      method: 'POST',
      body: JSON.stringify({ site_id }),
    }),

  getBalance: () => request<PointBalance>('/api/points/balance'),

  getHistory: () => request<PointTransaction[]>('/api/points/history'),

  getActiveUnlocks: () => request<ActiveUnlock[]>('/api/extension/active-unlocks'),
}
