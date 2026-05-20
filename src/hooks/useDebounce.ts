import { useEffect, useState } from 'react';

/**
 * Returns a debounced copy of `value` that only updates after `delayMs`
 * milliseconds have passed without `value` changing.
 *
 * Use this to keep a search <TextField> instant/responsive (bind the input
 * to raw state) while feeding the *debounced* value into the API call /
 * useEffect dependency — so the request fires ~once after the user stops
 * typing instead of on every keystroke.
 */
export default function useDebounce<T>(value: T, delayMs = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    // Cancel the pending update if `value` changes again before delayMs.
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
