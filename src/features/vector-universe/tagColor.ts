const VECTOR_UNIVERSE_TAG_COLORS = [
  '#E86D6D',
  '#E2A74B',
  '#79B95C',
  '#4FAE93',
  '#4B88DA',
  '#8F6EDB',
  '#D95FA6',
  '#58A9C4',
]

const FALLBACK_TAG = 'untagged'

function hashTag(tag: string): number {
  let hash = 2166136261
  for (let index = 0; index < tag.length; index += 1) {
    hash ^= tag.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

export function pickVectorUniversePrimaryTag(tags: string[]): string {
  const firstValidTag = tags.find((tag) => tag.trim().length > 0)
  return firstValidTag ?? FALLBACK_TAG
}

export function getVectorUniverseTagColor(tagsOrTag: string[] | string): string {
  const primaryTag = Array.isArray(tagsOrTag)
    ? pickVectorUniversePrimaryTag(tagsOrTag)
    : tagsOrTag.trim() || FALLBACK_TAG

  const colorIndex = hashTag(primaryTag) % VECTOR_UNIVERSE_TAG_COLORS.length
  return VECTOR_UNIVERSE_TAG_COLORS[colorIndex]
}
