import { formatRemaining, formatTime } from '@/lib/format';
import { useCountdown } from '@/lib/useCountdown';
import ErrorNotice from './ErrorNotice';
import type { NoticeHeadingLevel, NoticeTone } from './ErrorNotice';

interface RateLimitNoticeProps {
  title: string;
  until: number;
  waitingMessage: (time: string, remaining: string) => string;
  readyMessage: string;
  tone?: NoticeTone;
  onRetry?: () => void;
  headingLevel?: NoticeHeadingLevel;
}

function Countdown({
  title,
  until,
  waitingMessage,
  readyMessage,
  tone,
  onRetry,
  headingLevel,
}: RateLimitNoticeProps) {
  const remaining = useCountdown(until);
  const waiting = remaining > 0;
  const message = waiting
    ? waitingMessage(formatTime(new Date(until)), formatRemaining(remaining))
    : readyMessage;

  return (
    <ErrorNotice
      title={title}
      message={message}
      tone={tone}
      onRetry={onRetry}
      retryDisabled={waiting}
      headingLevel={headingLevel}
    />
  );
}

function RateLimitNotice(props: RateLimitNoticeProps) {
  return <Countdown key={props.until} {...props} />;
}

export default RateLimitNotice;
