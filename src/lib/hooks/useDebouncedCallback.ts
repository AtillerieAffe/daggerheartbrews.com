'use client';

import * as React from 'react';

// Simple debounced callback hook. Last call wins; cancels on unmount.
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  cb: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const cbRef = React.useRef(cb);
  const timeoutRef = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    cbRef.current = cb;
  }, [cb]);

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current !== undefined) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return React.useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current !== undefined) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      cbRef.current(...args);
    }, delay);
  }, [delay]);
}

