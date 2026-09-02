export function selectVideoMaterialCandidate<T extends { id: string; name: string; hasVideos: boolean }>(
  candidates: T[],
  selectionIndex = 0,
): T | null {
  if (candidates.length === 0) return null
  const videoFolders = candidates.filter(candidate => candidate.hasVideos)
  const pool = (videoFolders.length > 0 ? videoFolders : candidates)
    .slice()
    .sort((left, right) => left.name.localeCompare(right.name, 'es'))
  return pool[Math.abs(selectionIndex) % pool.length] ?? null
}
