/** A single budget covers headers AND the complete JSON body. Never retries. */
export async function fetchJsonWithDeadline<T = Record<string, unknown>>(
  input: string,
  init: Omit<RequestInit, "signal"> & { deadlineMs: number },
): Promise<{ response: Response; payload: T }> {
  const { deadlineMs, ...request } = init;
  const controller = new AbortController();
  let deadline: ReturnType<typeof setTimeout> | undefined;
  const expired = new Promise<never>((_, reject) => {
    deadline = setTimeout(() => {
      reject(new DOMException("Request deadline exceeded", "TimeoutError"));
      controller.abort();
    }, deadlineMs);
  });

  try {
    return await Promise.race([
      (async () => {
        const response = await fetch(input, { ...request, signal: controller.signal });
        let payload: unknown = {};
        if (response.status !== 204) {
          try {
            payload = await response.json();
          } catch (error) {
            // A non-JSON HTTP error still needs its status classified by the
            // caller. An interrupted or malformed success is never success.
            if (controller.signal.aborted || response.ok || !(error instanceof SyntaxError)) throw error;
          }
        }
        if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
          throw new TypeError("Invalid JSON response");
        }
        return { response, payload: payload as T };
      })(),
      expired,
    ]);
  } finally {
    clearTimeout(deadline);
  }
}
