type SdkErrorShape = Error & {
  code?: number;
  traceId?: string;
  problem?: { code?: number; traceId?: string; detail?: string; title?: string };
};

/** Surfaces SDK v3 ProblemDetail fields when present on thrown errors. */
export function formatSdkError(cause: unknown): string {
  if (!(cause instanceof Error)) {
    return "Request failed";
  }
  const error = cause as SdkErrorShape;
  const traceId = error.traceId ?? error.problem?.traceId;
  const code = error.code ?? error.problem?.code;
  const detail = error.problem?.detail ?? error.message;
  const parts = [detail];
  if (code !== undefined) {
    parts.push(`code=${code}`);
  }
  if (traceId) {
    parts.push(`traceId=${traceId}`);
  }
  return parts.join(" · ");
}
