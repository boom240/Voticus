import { apiClient } from './client'
import type { CompetitionStatus } from '../types/competition'

export interface MyEntry {
  entryId: number
  competitionId: number
  competitionTitle: string
  competitionStatus: CompetitionStatus
  title: string
  createdAtUtc: string
  votesReceived: number | null
}

export interface MyVote {
  voteId: number
  competitionId: number
  competitionTitle: string
  competitionStatus: CompetitionStatus
  entryId: number
  entryTitle: string
  createdAtUtc: string
}

export function getMyEntries(): Promise<MyEntry[]> {
  return apiClient.get<MyEntry[]>('/api/account/entries')
}

export function getMyVotes(): Promise<MyVote[]> {
  return apiClient.get<MyVote[]>('/api/account/votes')
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return apiClient.post<void>('/api/account/change-password', { currentPassword, newPassword })
}

export function deleteAccount(password: string): Promise<void> {
  return apiClient.delete<void>('/api/account', { password })
}
