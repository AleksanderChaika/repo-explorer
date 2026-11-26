import { Link, useLocation } from 'react-router';
import { parseReturnState } from './returnState';
import type { FocusState } from './returnState';

function BackToResults() {
  const location = useLocation();
  const origin = parseReturnState(location.state);

  if (origin === null) {
    return <Link to="/">Search repositories</Link>;
  }

  const focusState: FocusState = { focusRepository: origin.repository };

  return (
    <Link to={{ pathname: '/', search: origin.search }} state={focusState}>
      Back to results
    </Link>
  );
}

export default BackToResults;
