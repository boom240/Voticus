// src/api/polls.ts
import { apiClient } from "./client";
import type { PollDto, EntryDto } from "../types/poll";

export function getPolls(): Promise<PollDto[]> {
  return apiClient.get<PollDto[]>("/api/polls");
}

export function getPollById(id: number): Promise<PollDto> {
  return apiClient.get<PollDto>(`/api/polls/${id}`);
}

export function createPoll(payload: {
  title: string;
  description?: string;
  imageUrl?: string;
  }): Promise<PollDto> {
    return apiClient.post<PollDto>("/api/polls", payload);
}

export function createEntry(
  pollId: number,
  payload: { description: string; imageUrl?: string }
): Promise<EntryDto> {
  return apiClient.post<EntryDto>(`/api/polls/${pollId}/entries`, payload);
}

export function voteForEntry(pollId: number, entryId: number): Promise<void> {
  return apiClient.post<void>(`/api/polls/${pollId}/entries/${entryId}/vote`, {});
}

