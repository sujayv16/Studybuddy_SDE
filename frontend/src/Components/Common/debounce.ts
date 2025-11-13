// Simple debounce util for event handlers
export function debounce<T extends (...args: any[]) => void>(fn: T, wait = 250) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

export default debounce;
