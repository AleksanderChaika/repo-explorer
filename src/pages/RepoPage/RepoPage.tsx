import { useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import LanguagesSection from '@/features/repository/LanguagesSection';
import { NOT_FOUND_TITLE } from '@/features/repository/messages';
import RepositoryAnnouncements from '@/features/repository/RepositoryAnnouncements';
import RepositoryOverview from '@/features/repository/RepositoryOverview';
import RepositoryProblem from '@/features/repository/RepositoryProblem';
import RepositorySkeleton from '@/features/repository/RepositorySkeleton';
import { useRepository } from '@/features/repository/useRepository';
import type { RepositoryState } from '@/features/repository/useRepository';
import { useRepositoryLanguages } from '@/features/repository/useRepositoryLanguages';
import BackToResults from '@/features/search/BackToResults';
import { useDocumentTitle } from '@/lib/useDocumentTitle';
import styles from './RepoPage.module.scss';

interface ContentProps {
  state: RepositoryState;
  focusHeading: () => void;
  children: ReactNode;
}

function Content({ state, focusHeading, children }: ContentProps) {
  switch (state.kind) {
    case 'loading':
      return (
        <>
          <p className={styles.loading}>Loading…</p>
          <RepositorySkeleton />
        </>
      );
    case 'success':
      return (
        <>
          <RepositoryOverview repository={state.repository} />
          {children}
        </>
      );
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

function useCanonicalAddress(requested: string, fullName: string | null) {
  const navigate = useNavigate();
  const location = useLocation();
  const { search, hash } = location;
  const state: unknown = location.state;

  useEffect(() => {
    if (fullName !== null && fullName !== requested) {
      void navigate(
        { pathname: `/repo/${fullName}`, search, hash },
        { replace: true, state, preventScrollReset: true },
      );
    }
  }, [requested, fullName, search, hash, state, navigate]);
}

function RepoPage() {
  const { owner = '', name = '' } = useParams();
  const repository = useRepository(owner, name);
  const fullName =
    repository.kind === 'success' ? repository.repository.full_name : null;
  const languages = useRepositoryLanguages(fullName);
  useCanonicalAddress(`${owner}/${name}`, fullName);
  useDocumentTitle(
    repository.kind === 'not-found' ? NOT_FOUND_TITLE : `${owner}/${name}`,
  );
  const headingRef = useRef<HTMLHeadingElement>(null);
  const languagesHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusHeading = useCallback(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className={styles.root}>
      <div>
        <BackToResults />
      </div>
      <h1 ref={headingRef} className={styles.heading} tabIndex={-1}>
        {owner}/{name}
      </h1>
      <RepositoryAnnouncements state={repository} languages={languages} />
      <Content state={repository} focusHeading={focusHeading}>
        <LanguagesSection
          ref={languagesHeadingRef}
          state={languages}
          onRetry={() => {
            if (languages.kind === 'error') {
              languagesHeadingRef.current?.focus();
              languages.refetch();
            }
          }}
        />
      </Content>
    </div>
  );
}

export default RepoPage;
