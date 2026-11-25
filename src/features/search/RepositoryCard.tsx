import { useId } from 'react';
import type { Repository } from '@/api/types';
import { formatCount, formatDate } from './format';
import styles from './RepositoryCard.module.scss';

const AVATAR_SIZE = 20;
const AVATAR_DENSITIES = [1, 2, 3];

function sizedAvatarUrl(avatarUrl: string, size: number): string {
  const url = new URL(avatarUrl);
  url.searchParams.set('s', String(size));
  return url.toString();
}

function avatarSrcSet(avatarUrl: string): string {
  return AVATAR_DENSITIES.map(
    (density) =>
      `${sizedAvatarUrl(avatarUrl, AVATAR_SIZE * density)} ${density}x`,
  ).join(', ');
}

interface RepositoryCardProps {
  repository: Repository;
}

function RepositoryCard({ repository }: RepositoryCardProps) {
  const titleId = useId();
  const updated = formatDate(repository.updated_at);

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      <h3 className={styles.title}>
        <a
          className={styles.link}
          href={repository.html_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span id={titleId}>{repository.full_name}</span>{' '}
          <span className={styles.hidden}>(opens in new tab)</span>
        </a>
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
              srcSet={avatarSrcSet(repository.owner.avatar_url)}
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
