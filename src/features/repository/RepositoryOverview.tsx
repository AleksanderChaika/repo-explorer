import type { RepositoryDetails } from '@/api/types';
import { avatarSrcSet, sizedAvatarUrl } from '@/lib/avatar';
import { formatCount, formatDate } from '@/lib/format';
import { homepageUrl } from './homepageUrl';
import styles from './RepositoryOverview.module.scss';

const AVATAR_SIZE = 48;

function ExternalLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {label} <span className={styles.hidden}>(opens in new tab)</span>
    </a>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DateStat({ label, iso }: { label: string; iso: string | null }) {
  if (iso === null) {
    return null;
  }
  const date = formatDate(iso);
  if (date === null) {
    return null;
  }
  return (
    <div className={styles.stat}>
      <dt>{label}</dt>
      <dd>
        <time dateTime={iso}>{date}</time>
      </dd>
    </div>
  );
}

interface RepositoryOverviewProps {
  repository: RepositoryDetails;
}

function RepositoryOverview({ repository }: RepositoryOverviewProps) {
  const { owner, topics, license } = repository;
  const homepage = homepageUrl(repository.homepage);

  return (
    <div className={styles.root}>
      <p className={styles.owner}>
        {owner ? (
          <>
            <img
              className={styles.avatar}
              src={sizedAvatarUrl(owner.avatar_url, AVATAR_SIZE)}
              srcSet={avatarSrcSet(owner.avatar_url, AVATAR_SIZE)}
              alt=""
              width={AVATAR_SIZE}
              height={AVATAR_SIZE}
            />
            <span>{owner.login}</span>
          </>
        ) : (
          <span>Unknown owner</span>
        )}
      </p>
      <p className={styles.description}>
        {repository.description || 'No description'}
      </p>
      {topics.length > 0 && (
        <ul className={styles.topics} aria-label="Topics">
          {topics.map((topic) => (
            <li key={topic} className={styles.topic}>
              {topic}
            </li>
          ))}
        </ul>
      )}
      <p className={styles.links}>
        <ExternalLink href={repository.html_url} label="View on GitHub" />
        {homepage !== null && (
          <ExternalLink href={homepage} label={new URL(homepage).hostname} />
        )}
      </p>
      <dl className={styles.stats}>
        <Stat label="Stars" value={formatCount(repository.stargazers_count)} />
        <Stat label="Forks" value={formatCount(repository.forks_count)} />
        <Stat
          label="Watchers"
          value={formatCount(repository.subscribers_count)}
        />
        <Stat
          label="Open issues & PRs"
          value={formatCount(repository.open_issues_count)}
        />
        {license !== null && <Stat label="License" value={license.name} />}
        <Stat label="Default branch" value={repository.default_branch} />
        <DateStat label="Created" iso={repository.created_at} />
        <DateStat label="Updated" iso={repository.updated_at} />
        <DateStat label="Last push" iso={repository.pushed_at} />
      </dl>
    </div>
  );
}

export default RepositoryOverview;
