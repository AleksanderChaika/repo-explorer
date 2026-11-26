import { useId } from 'react';
import type { Ref } from 'react';
import RateLimitNotice from '@/components/ErrorNotice/RateLimitNotice';
import LanguageBar from './LanguageBar';
import styles from './LanguagesSection.module.scss';
import { LANGUAGES_UNAVAILABLE_TITLE } from './messages';
import RequestErrorNotice from './RequestErrorNotice';
import type { LanguagesState } from './useRepositoryLanguages';

interface LanguagesContentProps {
  state: LanguagesState;
  onRetry: () => void;
}

function LanguagesContent({ state, onRetry }: LanguagesContentProps) {
  switch (state.kind) {
    case 'loading':
      return (
        <div className={styles.skeleton} aria-hidden="true">
          <span className={styles.bar} />
          <span className={styles.line} />
        </div>
      );
    case 'success':
      return <LanguageBar languages={state.languages} />;
    case 'paused':
      return (
        <RateLimitNotice
          title="Languages paused"
          headingLevel={3}
          tone="neutral"
          until={state.blockedUntil}
          waitingMessage={(time, remaining) =>
            `GitHub is limiting requests. The languages will load at ${time} (in ${remaining}).`
          }
          readyMessage="GitHub is limiting requests. The languages will load now."
        />
      );
    case 'error':
      return (
        <RequestErrorNotice
          title={LANGUAGES_UNAVAILABLE_TITLE}
          headingLevel={3}
          error={state.error}
          onRetry={onRetry}
        />
      );
  }
}

interface LanguagesSectionProps extends LanguagesContentProps {
  ref?: Ref<HTMLHeadingElement>;
}

function LanguagesSection({ state, onRetry, ref }: LanguagesSectionProps) {
  const headingId = useId();

  return (
    <section className={styles.root} aria-labelledby={headingId}>
      <h2 ref={ref} id={headingId} className={styles.heading} tabIndex={-1}>
        Languages
      </h2>
      <LanguagesContent state={state} onRetry={onRetry} />
    </section>
  );
}

export default LanguagesSection;
