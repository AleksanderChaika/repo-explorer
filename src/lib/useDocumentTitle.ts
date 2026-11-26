import { useEffect } from 'react';

const SITE_NAME = 'repo-explorer';

export function useDocumentTitle(page: string | null) {
  useEffect(() => {
    document.title = page === null ? SITE_NAME : `${page} · ${SITE_NAME}`;
  }, [page]);
}
