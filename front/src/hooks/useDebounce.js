import { useEffect, useState } from "react";

export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [delay, value]);

  return debouncedValue;
};
