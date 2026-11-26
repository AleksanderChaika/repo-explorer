import { useRateLimitBlockedUntil } from '@/features/rateLimit/rateLimitGateContext';
import { describeRepositoryAlert, describeRepositoryStatus } from './messages';
import styles from './RepositoryAnnouncements.module.scss';
import type { RepositoryState } from './useRepository';

interface RepositoryAnnouncementsProps {
  state: RepositoryState;
}

function RepositoryAnnouncements({ state }: RepositoryAnnouncementsProps) {
  const blockedUntil = useRateLimitBlockedUntil('core');

  return (
    <>
      <p role="status" className={styles.announcement}>
        {describeRepositoryStatus(state)}
      </p>
      <p role="alert" className={styles.announcement}>
        {describeRepositoryAlert(state, blockedUntil)}
      </p>
    </>
  );
}

export default RepositoryAnnouncements;
