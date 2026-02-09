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

function createNodePosition(
  packageId: string,
  packageIndex: number,
  imageIndex: number,
  featureVector: number[],
): [number, number, number] {
  const seed = hashText(`${packageId}:${imageIndex}`)
  const fx = featureVector[0] ?? 0
  const fy = featureVector[1] ?? 0
  const fz = featureVector[2] ?? 0
  const fw = featureVector[3] ?? 0
  const fv = featureVector[4] ?? 0

  const orbitRadius = 20 + (packageIndex % 9) * 7
  const orbitAngle = packageIndex * 0.71 + imageIndex * 0.19 + ((seed & 1023) / 1023) * Math.PI
  const jitterX = (((seed >>> 0) & 255) / 255 - 0.5) * 6
  const jitterY = (((seed >>> 8) & 255) / 255 - 0.5) * 8
  const jitterZ = (((seed >>> 16) & 255) / 255 - 0.5) * 6

  const x = fx * 58 + fw * 24 + Math.cos(orbitAngle) * orbitRadius + jitterX
  const y = fy * 34 + fv * 12 + jitterY
  const z = fz * 58 + fw * 18 + Math.sin(orbitAngle) * orbitRadius + jitterZ

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
      originImage.featureVector,
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
    const rawPosition = createNodePosition(source.id, packageIndex, ref.imageIndex, image.featureVector)
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
