import type { CompetitionStatus } from '../theme/tokens'

export type { CompetitionStatus }

export interface CompetitionSummary {
  id: number
  title: string
  description?: string | null
  status: CompetitionStatus
  startsAtUtc: string
  endsAtUtc: string
  entryCount: number
}

export interface ImageInfo {
  id: number
  position: number
  key: string
  thumbnailKey: string
  placeholder: string
  altText: string
  width: number
  height: number
  contentType: string
}

export interface EntryCard {
  id: number
  title: string
  excerpt: string
  ownerLabel: string
  isMine: boolean
  coverImage: ImageInfo | null
  imageCount: number
  voteCount: number | null
}

export interface CompetitionDetail {
  id: number
  title: string
  description?: string | null
  status: CompetitionStatus
  startsAtUtc: string
  endsAtUtc: string
  entryCount: number
  entries: EntryCard[]
  myEntryId: number | null
  myVoteEntryId: number | null
  canEnter: boolean
  canVote: boolean
  resultsAvailable: boolean
}

export interface EntryDetail {
  id: number
  competitionId: number
  competitionTitle: string
  competitionStatus: CompetitionStatus
  title: string
  description: string
  ownerLabel: string
  isMine: boolean
  canEdit: boolean
  canVote: boolean
  myVoteEntryId: number | null
  createdAtUtc: string
  images: ImageInfo[]
  voteCount: number | null
}
