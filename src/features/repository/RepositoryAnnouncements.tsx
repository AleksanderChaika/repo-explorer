import { useRateLimitBlockedUntil } from '@/features/rateLimit/rateLimitGateContext';
import { describeRepositoryAlert, describeRepositoryStatus } from './messages';
import styles from './RepositoryAnnouncements.module.scss';
import type { RepositoryState } from './useRepository';
import type { LanguagesState } from './useRepositoryLanguages';

interface RepositoryAnnouncementsProps {
  state: RepositoryState;
  languages: LanguagesState;
}

function RepositoryAnnouncements({
  state,
  languages,
}: RepositoryAnnouncementsProps) {
  const blockedUntil = useRateLimitBlockedUntil('core');

  return (
    <>
      <p role="status" className={styles.announcement}>
        {describeRepositoryStatus(state)}
      </p>
      <p role="alert" className={styles.announcement}>
        {describeRepositoryAlert(state, languages, blockedUntil)}
      </p>
    </>
  );
}

export default RepositoryAnnouncements;
