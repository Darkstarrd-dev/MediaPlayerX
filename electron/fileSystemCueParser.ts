import { promises as fs } from 'node:fs'
import path from 'node:path'

export interface CueTrackRecord {
  cuePath: string
  sourceAudioPath: string
  trackNo: number
  title: string
  performer: string
  album: string
  startSec: number
  endSec: number | null
}

interface MutableCueTrack {
  cuePath: string
  sourceAudioPath: string | null
  trackNo: number
  title: string
  performer: string
  album: string
  startSec: number | null
}

function parseCueToken(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) {
    return ''
  }

  if (!trimmed.startsWith('"')) {
    return trimmed
  }

  const endQuoteIndex = trimmed.indexOf('"', 1)
  if (endQuoteIndex <= 0) {
    return trimmed.slice(1).trim()
  }

  return trimmed.slice(1, endQuoteIndex).trim()
}

function parseCueTimeToSec(raw: string): number | null {
  const matched = /^(\d+):(\d{2}):(\d{2})$/.exec(raw.trim())
  if (!matched) {
    return null
  }

  const minutes = Number(matched[1])
  const seconds = Number(matched[2])
  const frames = Number(matched[3])
  if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || !Number.isFinite(frames)) {
    return null
  }
  if (minutes < 0 || seconds < 0 || seconds > 59 || frames < 0 || frames > 74) {
    return null
  }

  return minutes * 60 + seconds + frames / 75
}

function parseCueFileCommandRemainder(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('"')) {
    const endQuoteIndex = trimmed.indexOf('"', 1)
    if (endQuoteIndex <= 0) {
      return null
    }
    const fileToken = trimmed.slice(1, endQuoteIndex).trim()
    return fileToken.length > 0 ? fileToken : null
  }

  const segments = trimmed.split(/\s+/)
  if (segments.length <= 1) {
    return null
  }
  segments.pop()
  const fileToken = segments.join(' ').trim()
  return fileToken.length > 0 ? fileToken : null
}

function computeCueTrackEnds(tracks: MutableCueTrack[]): CueTrackRecord[] {
  const grouped = new Map<string, MutableCueTrack[]>()
  for (const track of tracks) {
    if (!track.sourceAudioPath || typeof track.startSec !== 'number' || track.startSec < 0) {
      continue
    }
    const list = grouped.get(track.sourceAudioPath) ?? []
    list.push(track)
    grouped.set(track.sourceAudioPath, list)
  }

  const results: CueTrackRecord[] = []
  for (const list of grouped.values()) {
    list.sort((left, right) => {
      if ((left.startSec ?? 0) !== (right.startSec ?? 0)) {
        return (left.startSec ?? 0) - (right.startSec ?? 0)
      }
      return left.trackNo - right.trackNo
    })

    for (let index = 0; index < list.length; index += 1) {
      const current = list[index]
      const next = list[index + 1]
      const currentStartSec = current.startSec ?? 0
      const nextStartSec = next?.startSec ?? null
      const endSec = typeof nextStartSec === 'number' && nextStartSec > currentStartSec ? nextStartSec : null
      results.push({
        cuePath: current.cuePath,
        sourceAudioPath: current.sourceAudioPath as string,
        trackNo: current.trackNo,
        title: current.title,
        performer: current.performer,
        album: current.album,
        startSec: currentStartSec,
        endSec,
      })
    }
  }

  return results
}

export async function parseCueFile(cuePath: string): Promise<CueTrackRecord[]> {
  const raw = await fs.readFile(cuePath, 'utf8').catch(() => '')
  if (!raw) {
    return []
  }

  const lines = raw.replace(/^\uFEFF/, '').split(/\r?\n/)
  const cueDirectory = path.dirname(cuePath)

  let globalAlbum = ''
  let globalPerformer = ''
  let currentFilePath: string | null = null
  let currentTrack: MutableCueTrack | null = null
  const tracks: MutableCueTrack[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const fileMatched = /^FILE\s+(.+)$/i.exec(trimmed)
    if (fileMatched) {
      const fileToken = parseCueFileCommandRemainder(fileMatched[1] ?? '')
      currentFilePath = fileToken ? path.resolve(cueDirectory, fileToken) : null
      currentTrack = null
      continue
    }

    const trackMatched = /^TRACK\s+(\d{1,3})\s+AUDIO\b/i.exec(trimmed)
    if (trackMatched) {
      const trackNo = Number(trackMatched[1])
      if (!Number.isFinite(trackNo) || trackNo <= 0) {
        currentTrack = null
        continue
      }
      currentTrack = {
        cuePath,
        sourceAudioPath: currentFilePath,
        trackNo,
        title: '',
        performer: '',
        album: globalAlbum,
        startSec: null,
      }
      tracks.push(currentTrack)
      continue
    }

    const titleMatched = /^TITLE\s+(.+)$/i.exec(trimmed)
    if (titleMatched) {
      const value = parseCueToken(titleMatched[1] ?? '')
      if (currentTrack) {
        currentTrack.title = value
      } else {
        globalAlbum = value
      }
      continue
    }

    const performerMatched = /^PERFORMER\s+(.+)$/i.exec(trimmed)
    if (performerMatched) {
      const value = parseCueToken(performerMatched[1] ?? '')
      if (currentTrack) {
        currentTrack.performer = value
      } else {
        globalPerformer = value
      }
      continue
    }

    const indexMatched = /^INDEX\s+01\s+(\d+:\d{2}:\d{2})$/i.exec(trimmed)
    if (indexMatched && currentTrack) {
      const startSec = parseCueTimeToSec(indexMatched[1] ?? '')
      if (typeof startSec === 'number' && startSec >= 0) {
        currentTrack.startSec = startSec
      }
    }
  }

  const mergedTracks = tracks.map((track) => ({
    ...track,
    album: track.album.trim().length > 0 ? track.album : globalAlbum,
    performer: track.performer.trim().length > 0 ? track.performer : globalPerformer,
  }))

  return computeCueTrackEnds(mergedTracks)
}
