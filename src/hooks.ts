export function patchImdbId<T extends { id: number; imdbId?: string }>(
  itemId: number,
  fetch: Promise<string | null>,
  current: T[],
  save: (next: T[]) => void,
): void {
  fetch
    .then(imdbId => {
      if (!imdbId) return
      save(current.map(item => item.id === itemId ? { ...item, imdbId } : item))
    })
    .catch(e => console.warn(`[follow-links] Failed to fetch IMDB ID for item ${itemId}:`, e))
}
