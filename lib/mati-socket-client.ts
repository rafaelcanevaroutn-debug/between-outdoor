'use client'

import {io, type Socket} from 'socket.io-client'

export interface MatiRenderEvent {
  jobId: string
  referenceId: string | null
  state: 'waiting' | 'active' | 'completed' | 'failed' | string
  progress?: number | null
  result?: {driveFolderId?: string} | null
  error?: string | null
}

let matiSocket: Socket | null = null

export function getMatiSocket(): Socket | null {
  const url = process.env.NEXT_PUBLIC_MATI_SOCKET_URL?.trim()
  if (!url) return null

  if (!matiSocket) {
    matiSocket = io(url, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 750,
      reconnectionDelayMax: 4_000,
    })
  }

  return matiSocket
}
