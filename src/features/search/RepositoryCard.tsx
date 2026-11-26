import { useContext, useId } from 'react';
import type { MouseEvent } from 'react';
import { Link, useLocation } from 'react-router';
import type { Repository } from '@/api/types';
import { avatarSrcSet, sizedAvatarUrl } from '@/lib/avatar';
import { formatCount, formatDate } from '@/lib/format';
import { parseFocusRepository } from './returnState';
import type { ReturnState } from './returnState';
import { ReturnTargetsContext } from './returnTargetsContext';
import styles from './RepositoryCard.module.scss';

const AVATAR_SIZE = 20;

interface RepositoryCardProps {
  repository: Repository;
}

function RepositoryCard({ repository }: RepositoryCardProps) {
  const titleId = useId();
  const location = useLocation();
  const returnTargets = useContext(ReturnTargetsContext);
  const returnState: ReturnState = {
    search: location.search,
    repository: repository.full_name,
  };
  const isReturnTarget =
    (returnTargets?.get(location.key) ??
      parseFocusRepository(location.state)) === repository.full_name;
  const updated = formatDate(repository.updated_at);

  function rememberCard(event: MouseEvent) {
    if (!event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      returnTargets?.set(location.key, repository.full_name);
    }
  }

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <h3 className={styles.title}>
        <Link
          id={titleId}
          className={styles.link}
          to={`/repo/${repository.full_name}`}
          state={returnState}
          onClick={rememberCard}
          data-return-focus={isReturnTarget ? '' : undefined}
        >
          {repository.full_name}
        </Link>
      </h3>
      <p className={styles.description}>
        {repository.description || 'No description'}
      </p>
      <p className={styles.owner}>
        {repository.owner ? (
          <>
            <img
              className={styles.avatar}
              src={sizedAvatarUrl(repository.owner.avatar_url, AVATAR_SIZE)}
              srcSet={avatarSrcSet(repository.owner.avatar_url, AVATAR_SIZE)}
              alt=""
              loading="lazy"
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
            />
            <span>{repository.owner.login}</span>
          </>
        ) : (
          <span>Unknown owner</span>
        )}
      </p>
      <dl className={styles.stats}>
        {repository.language !== null && (
          <div className={styles.stat}>
            <dt>Language</dt>
            <dd>{repository.language}</dd>
          </div>
        )}
        <div className={styles.stat}>
          <dt>Stars</dt>
          <dd>{formatCount(repository.stargazers_count)}</dd>
        </div>
        <div className={styles.stat}>
          <dt>Forks</dt>
          <dd>{formatCount(repository.forks_count)}</dd>
        </div>
        {updated !== null && (
          <div className={styles.stat}>
            <dt>Updated</dt>
            <dd>
              <time dateTime={repository.updated_at}>{updated}</time>
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export default RepositoryCard;
