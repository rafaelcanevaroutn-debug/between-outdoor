'use client'

import {io, type Socket} from 'socket.io-client'

export interface MatiRenderEvent {
  jobId: string
  referenceId: string | null
  state: 'waiting' | 'active' | 'completed' | 'failed' | string
  progress?: number | null
  stage?: 'preparing_brand' | 'finding_photos' | 'preparing_design' | 'rendering_slides' | 'uploading' | 'completed' | string
  label?: string | null
  result?: {driveFolderId?: string; slides?: {fileId: string; name?: string}[]} | null
  error?: string | null
}

let matiSocket: Socket | null = null

export function getMatiSocket(): Socket | null {
  const url = process.env.NEXT_PUBLIC_MATI_SOCKET_URL?.trim()
  if (!url) return null

  if (!matiSocket) {
    matiSocket = io(url, {
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 750,
      reconnectionDelayMax: 4_000,
      timeout: 20_000,
    })
  }

  return matiSocket
}
