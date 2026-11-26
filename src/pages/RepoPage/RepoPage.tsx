import { useCallback, useRef } from 'react';
import { useParams } from 'react-router';
import RepositoryAnnouncements from '@/features/repository/RepositoryAnnouncements';
import RepositoryOverview from '@/features/repository/RepositoryOverview';
import RepositoryProblem from '@/features/repository/RepositoryProblem';
import RepositorySkeleton from '@/features/repository/RepositorySkeleton';
import { useRepository } from '@/features/repository/useRepository';
import type { RepositoryState } from '@/features/repository/useRepository';
import styles from './RepoPage.module.scss';

interface ContentProps {
  state: RepositoryState;
  focusHeading: () => void;
}

function Content({ state, focusHeading }: ContentProps) {
  switch (state.kind) {
    case 'loading':
      return (
        <>
          <p className={styles.loading}>Loading…</p>
          <RepositorySkeleton />
        </>
      );
    case 'success':
      return <RepositoryOverview repository={state.repository} />;
    case 'not-found':
    case 'paused':
    case 'error':
      return (
        <RepositoryProblem
          state={state}
          onRetry={() => {
            if (state.kind === 'error') {
              focusHeading();
              state.refetch();
            }
          }}
        />
      );
  }
}

function RepoPage() {
  const { owner = '', name = '' } = useParams();
  const repository = useRepository(owner, name);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useCallback(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.root}>
      <h1 ref={headingRef} className={styles.heading} tabIndex={-1}>
        {owner}/{name}
      </h1>
      <RepositoryAnnouncements state={repository} />
      <Content state={repository} focusHeading={focusHeading} />
    </div>
  );
}

export default RepoPage;
