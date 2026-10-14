import { apiClient } from './client'

export function castVote(competitionId: number, entryId: number): Promise<void> {
  return apiClient.post<void>(`/api/competitions/${competitionId}/votes`, { entryId })
}
