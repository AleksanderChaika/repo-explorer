import type { RepositoryLanguages } from '@/api/types';
import styles from './LanguageBar.module.scss';
import { languageShares } from './languageShares';

interface LanguageBarProps {
  languages: RepositoryLanguages;
}

function LanguageBar({ languages }: LanguageBarProps) {
  const shares = languageShares(languages);

  if (shares.length === 0) {
    return <p className={styles.empty}>No languages detected</p>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.bar} aria-hidden="true">
        {shares.map(({ name, bytes, isOther }) => (
          <span
            key={name}
            className={`${styles.segment} ${isOther ? styles.other : ''}`}
            style={{ flexGrow: bytes }}
          />
        ))}
      </div>
      <ul className={styles.list}>
        {shares.map(({ name, percent, isOther }) => (
          <li
            key={name}
            className={`${styles.item} ${isOther ? styles.other : ''}`}
          >
            <span className={styles.dot} />
            <span>{name}</span>{' '}
            <span className={styles.percent}>{percent}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default LanguageBar;
