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
      const container = containerRef.current;
      const card = container?.querySelector<HTMLElement>('[data-return-focus]');
      if (card) {
        card.focus();
      } else {
        container
          ?.querySelector('h1')
          ?.focus({ preventScroll: navigationType === NavigationType.Pop });
      }
    }
  }, [pathname, navigationType, containerRef]);
}
