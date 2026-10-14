import { apiClient } from './client'
import type { CompetitionStatus, EntryDetail } from '../types/competition'

export interface AdminCompetition {
  id: number
  title: string
  description: string | null
  status: CompetitionStatus
  startsAtUtc: string
  endsAtUtc: string
  publishedAtUtc: string | null
  archivedAtUtc: string | null
  approvedMembersAtClose: number | null
  entryCount: number
  voteCount: number
  createdAtUtc: string
  updatedAtUtc: string
  canDelete: boolean
}

export interface CompetitionUpsert {
  title: string
  description: string | null
  startsAtUtc: string
  endsAtUtc: string
}

export interface AdminEntry {
  id: number
  title: string
  description: string
  ownerUserId: string | null
  ownerEmail: string
  ownerLabel: string
  imageCount: number
  voteCount: number
  createdAtUtc: string
  updatedAtUtc: string
}

export interface AdminVote {
  id: number
  userId: string
  voterEmail: string
  entryId: number
  entryTitle: string
  createdAtUtc: string
}

export interface AuditEntry {
  id: number
  actorEmail: string
  action: string
  entityType: string
  entityId: number
  oldValue: string | null
  newValue: string | null
  createdAtUtc: string
}

export interface AdminUser {
  id: string
  email: string
  isApproved: boolean
  isAdmin: boolean
  createdAtUtc: string | null
  entryCount: number
  voteCount: number
}

const base = '/api/admin/competitions'

export const adminApi = {
  listCompetitions: () => apiClient.get<AdminCompetition[]>(base),
  getCompetition: (id: number) => apiClient.get<AdminCompetition>(`${base}/${id}`),
  createCompetition: (body: CompetitionUpsert) => apiClient.post<AdminCompetition>(base, body),
  updateCompetition: (id: number, body: CompetitionUpsert) => apiClient.put<AdminCompetition>(`${base}/${id}`, body),
  publish: (id: number) => apiClient.post<AdminCompetition>(`${base}/${id}/publish`),
  unpublish: (id: number) => apiClient.post<AdminCompetition>(`${base}/${id}/unpublish`),
  close: (id: number) => apiClient.post<AdminCompetition>(`${base}/${id}/close`),
  archive: (id: number) => apiClient.post<AdminCompetition>(`${base}/${id}/archive`),
  unarchive: (id: number) => apiClient.post<AdminCompetition>(`${base}/${id}/unarchive`),
  deleteCompetition: (id: number) => apiClient.delete<void>(`${base}/${id}`),

  listEntries: (id: number) => apiClient.get<AdminEntry[]>(`${base}/${id}/entries`),
  createEntryOnBehalf: (id: number, form: FormData) => apiClient.postForm<EntryDetail>(`${base}/${id}/entries`, form),

  listVotes: (id: number) => apiClient.get<AdminVote[]>(`${base}/${id}/votes`),
  createVote: (id: number, userId: string, entryId: number) =>
    apiClient.post<AdminVote[]>(`${base}/${id}/votes`, { userId, entryId }),
  changeVote: (id: number, voteId: number, entryId: number) =>
    apiClient.put<AdminVote[]>(`${base}/${id}/votes/${voteId}`, { entryId }),
  deleteVote: (id: number, voteId: number) => apiClient.delete<void>(`${base}/${id}/votes/${voteId}`),

  audit: (id: number) => apiClient.get<AuditEntry[]>(`${base}/${id}/audit`),

  listUsers: () => apiClient.get<AdminUser[]>('/api/admin/users'),
  approve: (userId: string) => apiClient.post<void>(`/api/admin/users/${userId}/approve`),
  revokeApproval: (userId: string) => apiClient.post<void>(`/api/admin/users/${userId}/revoke-approval`),
  grantAdmin: (userId: string) => apiClient.post<void>(`/api/admin/users/${userId}/grant-admin`),
  revokeAdmin: (userId: string) => apiClient.post<void>(`/api/admin/users/${userId}/revoke-admin`),
}
