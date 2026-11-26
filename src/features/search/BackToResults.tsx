import { Link, useLocation } from 'react-router';
import { parseReturnState } from './returnState';

function BackToResults() {
  const location = useLocation();
  const origin = parseReturnState(location.state);

  if (origin === null) {
    return <Link to="/">Search repositories</Link>;
  }

  return (
    <Link to={{ pathname: '/', search: origin.search }}>Back to results</Link>
  );
}

export default BackToResults;
