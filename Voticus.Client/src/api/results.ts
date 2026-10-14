import { apiClient } from './client'
import type { CompetitionStatus, ImageInfo } from '../types/competition'

export interface ResultEntry {
  entryId: number
  title: string
  ownerLabel: string
  coverImage: ImageInfo | null
  votes: number
  sharePercent: number
  isWinner: boolean
}

export interface TimelinePoint {
  atUtc: string
  cumulativeVotes: number
}

export interface Results {
  competitionId: number
  title: string
  status: CompetitionStatus
  endsAtUtc: string
  available: boolean
  totalVotes: number
  entryCount: number
  approvedMembers: number | null
  turnoutPercent: number | null
  winners: ResultEntry[]
  entries: ResultEntry[]
  timeline: TimelinePoint[]
}

export function getResults(competitionId: number): Promise<Results> {
  return apiClient.get<Results>(`/api/competitions/${competitionId}/results`)
}
