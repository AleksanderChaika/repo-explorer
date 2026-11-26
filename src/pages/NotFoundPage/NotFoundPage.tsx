import { Link } from 'react-router';
import { useDocumentTitle } from '@/lib/useDocumentTitle';

function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <>
      <h1 tabIndex={-1}>Page not found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/">Go to the home page</Link>
    </>
  );
}

export default NotFoundPage;
