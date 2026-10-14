import { apiClient } from './client'
import type { CurrentUser, LoginResponse } from '../types/auth'

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiClient.post<LoginResponse>('/api/auth/login', { email, password })
}

export function register(email: string, password: string): Promise<void> {
  return apiClient.post<void>('/api/auth/register', { email, password })
}

export function getMe(): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>('/api/auth/me')
}
