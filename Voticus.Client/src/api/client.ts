// Thin fetch wrapper. Errors arrive as RFC 7807 problem details and become ApiError.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL as string
const TOKEN_KEY = 'token'

export class ApiError extends Error {
  status: number
  title: string
  // Field name to messages, from validation problem details.
  errors: Record<string, string[]>

  constructor(status: number, title: string, detail: string, errors: Record<string, string[]> = {}) {
    super(detail || title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.errors = errors
  }

  // First message for a field, matching on a case-insensitive key.
  fieldError(field: string): string | undefined {
    const key = Object.keys(this.errors).find((k) => k.toLowerCase() === field.toLowerCase())
    return key ? this.errors[key][0] : undefined
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    // Storage blocked. The session will not survive a reload.
  }
}

export function imageUrl(key: string): string {
  return `${API_BASE_URL}/api/images/${key}`
}

async function toApiError(response: Response): Promise<ApiError> {
  let title = `Request failed (${response.status})`
  let detail = ''
  let errors: Record<string, string[]> = {}
  try {
    const body = await response.json()
    if (body && typeof body === 'object') {
      title = body.title ?? title
      detail = body.detail ?? ''
      if (body.errors && typeof body.errors === 'object') {
        errors = body.errors
        if (!detail) {
          const first = Object.values(errors).flat()[0]
          if (typeof first === 'string') detail = first
        }
      }
    }
  } catch {
    // Not JSON. Keep the generic message.
  }
  if (!detail && response.status === 401) detail = 'Please log in to continue.'
  if (!detail && response.status === 403) detail = 'You do not have permission to do that.'
  if (!detail && response.status === 429) detail = 'Too many requests. Please wait a minute and try again.'
  return new ApiError(response.status, title, detail, errors)
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string>) }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })

  if (!response.ok) {
    throw await toApiError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }
  return undefined as T
}

export const apiClient = {
  get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' })
  },
  post<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: body != null ? JSON.stringify(body) : undefined })
  },
  postForm<T>(path: string, form: FormData): Promise<T> {
    return request<T>(path, { method: 'POST', body: form })
  },
  put<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body: body != null ? JSON.stringify(body) : undefined })
  },
  delete<T>(path: string, body?: unknown): Promise<T> {
    return request<T>(path, { method: 'DELETE', body: body != null ? JSON.stringify(body) : undefined })
  },
}

export function errorMessage(err: unknown, fallback = 'Something went wrong.'): string {
  if (err instanceof ApiError) return err.message || fallback
  if (err instanceof Error) return err.message || fallback
  return fallback
}
