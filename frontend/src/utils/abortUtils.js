/**
 * Returns true when an error comes from an aborted or canceled request
 * (Fetch AbortError, Axios CanceledError / ERR_CANCELED).
 */
export function isAbortError(err) {
  return (
    err?.name === "AbortError" ||
    err?.name === "CanceledError" ||
    err?.code === "ERR_CANCELED"
  );
}
