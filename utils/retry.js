/**
 * Retries `operation` when it fails with a transient network error, waiting a
 * little longer before each attempt (250 ms, 500 ms, ...).
 *
 * Only use it for operations that are safe to repeat, such as database reads:
 * a write that failed on the way back might already have been applied.
 */
export async function withRetry(operation, { retries = 2, baseDelayMs = 250, isRetryable = isTransientNetworkError } = {}) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= retries || !isRetryable(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
    }
  }
}

const TRANSIENT_PATTERN = /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|ENOTFOUND|socket hang up|other side closed|network error/i;

/**
 * True for connection-level failures (DNS, reset, timeout) that usually
 * succeed on retry. Looks through `cause` chains, because the database driver
 * wraps the original fetch error.
 */
export function isTransientNetworkError(error) {
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    if (TRANSIENT_PATTERN.test(`${current.message ?? ""} ${current.code ?? ""}`)) return true;
    current = current.cause ?? current.sourceError;
  }
  return false;
}
