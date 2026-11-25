import { formatRemaining, formatTime } from './format';
import { useCountdown } from './useCountdown';
import styles from './RateLimitBlocked.module.scss';

interface RateLimitBlockedProps {
  blockedUntil: number;
}

function BlockedCountdown({ blockedUntil }: RateLimitBlockedProps) {
  const remaining = useCountdown(blockedUntil);
  const message =
    remaining > 0
      ? `GitHub is limiting requests. Your search will start at ${formatTime(new Date(blockedUntil))} (in ${formatRemaining(remaining)}).`
      : 'GitHub is limiting requests. Your search will start now.';

  return (
    <div className={styles.root}>
      <h2 className={styles.title}>Search paused</h2>
      <p className={styles.message}>{message}</p>
    </div>
  );
}

function RateLimitBlocked({ blockedUntil }: RateLimitBlockedProps) {
  return <BlockedCountdown key={blockedUntil} blockedUntil={blockedUntil} />;
}

export default RateLimitBlocked;
