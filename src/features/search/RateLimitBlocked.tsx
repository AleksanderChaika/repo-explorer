import RateLimitNotice from '@/components/ErrorNotice/RateLimitNotice';

interface RateLimitBlockedProps {
  blockedUntil: number;
}

function RateLimitBlocked({ blockedUntil }: RateLimitBlockedProps) {
  return (
    <RateLimitNotice
      title="Search paused"
      tone="neutral"
      until={blockedUntil}
      waitingMessage={(time, remaining) =>
        `GitHub is limiting requests. Your search will start at ${time} (in ${remaining}).`
      }
      readyMessage="GitHub is limiting requests. Your search will start now."
    />
  );
}

export default RateLimitBlocked;
