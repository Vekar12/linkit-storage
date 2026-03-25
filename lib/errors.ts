/** Extracts status code and message from an axios-style error response. */
export function getApiError(err: unknown): { status?: number; message?: string } {
  const e = err as { response?: { status?: number; data?: { error?: string; message?: string } } };
  return {
    status: e?.response?.status,
    message: e?.response?.data?.error ?? e?.response?.data?.message,
  };
}
