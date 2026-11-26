import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { NavigationType, useLocation, useNavigationType } from 'react-router';

export function useRouteFocus(containerRef: RefObject<HTMLElement | null>) {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }
    previousPathname.current = pathname;
    if (navigationType !== NavigationType.Replace) {
      containerRef.current
        ?.querySelector('h1')
        ?.focus({ preventScroll: navigationType === NavigationType.Pop });
    }
  }, [pathname, navigationType, containerRef]);
}
