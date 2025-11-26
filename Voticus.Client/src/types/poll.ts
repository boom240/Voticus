// src/types/poll.ts

export interface EntryDto {
  id: number;
  pollId: number;
  description: string;
  imageUrl?: string;
  voteCount: number; // not optional now
}

export interface PollDto {
  id: number;
  title: string;
  description?: string;
  imageUrl?: string;
  finishAtUtc?: string; // ISO string from backend
  entries?: EntryDto[]; // populated in GET /api/polls/{id}
}
