import { lazy } from 'react';

/**
 * Enhanced lazy loader that catches dynamic import / chunk loading errors
 * (e.g., when a new deployment invalidates old JS bundle hashes on the server)
 * and triggers a page refresh to load the latest index.html and assets.
 */
export function lazyWithRetry(componentImport) {
  return lazy(async () => {
    const pageHasBeenReloaded = sessionStorage.getItem('bubu_chunk_reload');

    try {
      const module = await componentImport();
      // Reset session storage key on successful import
      sessionStorage.removeItem('bubu_chunk_reload');
      return module;
    } catch (error) {
      const isChunkError =
        error?.name === 'TypeError' ||
        error?.message?.includes('Failed to fetch dynamically imported module') ||
        error?.message?.includes('Importing a module script failed') ||
        error?.message?.includes('Loading chunk') ||
        error?.message?.includes('net::ERR_ABORTED');

      if (isChunkError && !pageHasBeenReloaded) {
        sessionStorage.setItem('bubu_chunk_reload', 'true');
        window.location.reload();
        return new Promise(() => {});
      }

      throw error;
    }
  });
}
