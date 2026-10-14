import { apiClient } from './client'
import type { EntryDetail, ImageInfo } from '../types/competition'

export interface NewImage {
  file: File
  altText: string
}

export function createEntry(
  competitionId: number,
  payload: { title: string; description: string; images: NewImage[] },
): Promise<EntryDetail> {
  const form = new FormData()
  form.append('title', payload.title)
  form.append('description', payload.description)
  payload.images.forEach((img) => {
    form.append('images', img.file)
    form.append('altTexts', img.altText)
  })
  return apiClient.postForm<EntryDetail>(`/api/competitions/${competitionId}/entries`, form)
}

export function updateEntry(
  competitionId: number,
  entryId: number,
  payload: { title: string; description: string },
): Promise<EntryDetail> {
  return apiClient.put<EntryDetail>(`/api/competitions/${competitionId}/entries/${entryId}`, payload)
}

export function deleteEntry(competitionId: number, entryId: number): Promise<void> {
  return apiClient.delete<void>(`/api/competitions/${competitionId}/entries/${entryId}`)
}

export function addEntryImages(competitionId: number, entryId: number, images: NewImage[]): Promise<ImageInfo[]> {
  const form = new FormData()
  images.forEach((img) => {
    form.append('images', img.file)
    form.append('altTexts', img.altText)
  })
  return apiClient.postForm<ImageInfo[]>(`/api/competitions/${competitionId}/entries/${entryId}/images`, form)
}

export function removeEntryImage(competitionId: number, entryId: number, imageId: number): Promise<void> {
  return apiClient.delete<void>(`/api/competitions/${competitionId}/entries/${entryId}/images/${imageId}`)
}

export function reorderEntryImages(competitionId: number, entryId: number, imageIds: number[]): Promise<ImageInfo[]> {
  return apiClient.put<ImageInfo[]>(`/api/competitions/${competitionId}/entries/${entryId}/images/order`, { imageIds })
}

export function updateImageAltText(
  competitionId: number,
  entryId: number,
  imageId: number,
  altText: string,
): Promise<ImageInfo> {
  return apiClient.put<ImageInfo>(`/api/competitions/${competitionId}/entries/${entryId}/images/${imageId}`, { altText })
}
