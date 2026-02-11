import type { FocusedImageRef, ImagePackage } from '../../types'
import { clamp } from '../../utils/ui'
import { getVectorUniverseTagColor } from './tagColor'
import type { VectorUniverseNode } from './types'

function hashText(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function toPositionTuple(value: [number, number, number]): [number, number, number] {
  return [
    Number(value[0].toFixed(3)),
    Number(value[1].toFixed(3)),
    Number(value[2].toFixed(3)),
  ]
}

function normalizeUnit(seed: number): number {
  return ((seed & 0xffff) / 0xffff) * 2 - 1
}

function buildSemanticSeed(
  packageId: string,
  imageIndex: number,
  tags: string[],
  workTitle: string,
  circle: string,
  author: string,
): string {
  const sortedTags = [...tags].map((tag) => tag.trim()).filter(Boolean).sort((a, b) => a.localeCompare(b))
  return [packageId, String(imageIndex), workTitle.trim(), circle.trim(), author.trim(), ...sortedTags].join('|')
}

function createNodePosition(
  packageId: string,
  packageIndex: number,
  imageIndex: number,
  tags: string[],
  workTitle: string,
  circle: string,
  author: string,
): [number, number, number] {
  const seed = hashText(`${packageId}:${imageIndex}`)
  const semanticSeed = hashText(buildSemanticSeed(packageId, imageIndex, tags, workTitle, circle, author))
  const semanticSeed2 = hashText(`${semanticSeed}:${packageIndex}`)
  const semanticSeed3 = hashText(`${semanticSeed2}:${seed}`)

  const sx = normalizeUnit(semanticSeed)
  const sy = normalizeUnit(semanticSeed2)
  const sz = normalizeUnit(semanticSeed3)
  const sw = normalizeUnit(semanticSeed ^ semanticSeed2)
  const sv = normalizeUnit(semanticSeed2 ^ semanticSeed3)

  const orbitRadius = 20 + (packageIndex % 9) * 7
  const orbitAngle = packageIndex * 0.71 + imageIndex * 0.19 + ((seed & 1023) / 1023) * Math.PI
  const jitterX = (((seed >>> 0) & 255) / 255 - 0.5) * 6
  const jitterY = (((seed >>> 8) & 255) / 255 - 0.5) * 8
  const jitterZ = (((seed >>> 16) & 255) / 255 - 0.5) * 6

  const x = sx * 58 + sw * 24 + Math.cos(orbitAngle) * orbitRadius + jitterX
  const y = sy * 34 + sv * 12 + jitterY
  const z = sz * 58 + sw * 18 + Math.sin(orbitAngle) * orbitRadius + jitterZ

  return toPositionTuple([x, y, z])
}

export function buildVectorUniverseNodes(imageSources: ImagePackage[]): VectorUniverseNode[] {
  return buildVectorUniverseNodesByScope(imageSources)
}

function buildDefaultScopeRefs(imageSources: ImagePackage[]): FocusedImageRef[] {
  const refs: FocusedImageRef[] = []
  for (const source of imageSources) {
    source.images.forEach((_, imageIndex) => {
      refs.push({
        packageId: source.id,
        imageIndex,
      })
    })
  }
  return refs
}

export function buildVectorUniverseNodesByScope(
  imageSources: ImagePackage[],
  scopeRefs?: FocusedImageRef[],
  originRef?: FocusedImageRef | null,
  dispersion = 1,
): VectorUniverseNode[] {
  const packageById = new Map(imageSources.map((source) => [source.id, source]))
  const packageIndexById = new Map(imageSources.map((source, index) => [source.id, index]))
  const refs = scopeRefs && scopeRefs.length > 0 ? scopeRefs : buildDefaultScopeRefs(imageSources)
  const normalizedDispersion = clamp(dispersion, 0.2, 6)

  const resolveOriginPosition = (): [number, number, number] => {
    if (!originRef) {
      return [0, 0, 0]
    }

    const originSource = packageById.get(originRef.packageId)
    if (!originSource) {
      return [0, 0, 0]
    }

    const originImage = originSource.images[originRef.imageIndex]
    if (!originImage) {
      return [0, 0, 0]
    }

    const originPackageIndex = packageIndexById.get(originSource.id) ?? 0
    return createNodePosition(
      originSource.id,
      originPackageIndex,
      originRef.imageIndex,
      originSource.tags,
      originSource.workTitle,
      originSource.circle,
      originSource.author,
    )
  }

  const originPosition = resolveOriginPosition()

  const nodes: VectorUniverseNode[] = []
  const seen = new Set<string>()

  for (const ref of refs) {
    const source = packageById.get(ref.packageId)
    if (!source) {
      continue
    }

    const image = source.images[ref.imageIndex]
    if (!image) {
      continue
    }

    const nodeId = `${source.id}:${ref.imageIndex}`
    if (seen.has(nodeId)) {
      continue
    }
    seen.add(nodeId)

    const packageIndex = packageIndexById.get(source.id) ?? 0
    const rawPosition = createNodePosition(
      source.id,
      packageIndex,
      ref.imageIndex,
      source.tags,
      source.workTitle,
      source.circle,
      source.author,
    )
    const normalizedPosition = toPositionTuple([
      (rawPosition[0] - originPosition[0]) * normalizedDispersion,
      (rawPosition[1] - originPosition[1]) * normalizedDispersion,
      (rawPosition[2] - originPosition[2]) * normalizedDispersion,
    ])

    nodes.push({
      id: nodeId,
      packageId: source.id,
      imageIndex: ref.imageIndex,
      width: image.width,
      height: image.height,
      tags: source.tags,
      position: normalizedPosition,
      tagColor: getVectorUniverseTagColor(source.tags),
      thumbnailColor: image.color,
    })
  }

  return nodes
}
