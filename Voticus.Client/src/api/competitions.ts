import { apiClient } from './client'
import type { CompetitionDetail, CompetitionSummary, EntryDetail } from '../types/competition'

export function getCompetitions(): Promise<CompetitionSummary[]> {
  return apiClient.get<CompetitionSummary[]>('/api/competitions')
}

export function getCompetition(id: number): Promise<CompetitionDetail> {
  return apiClient.get<CompetitionDetail>(`/api/competitions/${id}`)
}

export function getEntry(competitionId: number, entryId: number): Promise<EntryDetail> {
  return apiClient.get<EntryDetail>(`/api/competitions/${competitionId}/entries/${entryId}`)
}
