export class UserFacingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export class MissingKeyError extends UserFacingError {
  constructor(provider: "anthropic" | "replicate") {
    const v = provider === "anthropic" ? "ANTHROPIC_API_KEY" : "REPLICATE_API_TOKEN";
    super(`The ${provider === "anthropic" ? "Anthropic" : "Replicate"} key is missing. Add ${v}=… to the .env file at the root of the project, then restart the app.`, 503);
  }
}

/** Route handler helper: turns thrown errors into JSON responses the UI can show. */
export function errorResponse(err: unknown): Response {
  if (err instanceof UserFacingError) return Response.json({ error: err.message }, { status: err.status });
  console.error(err);
  const message = err instanceof Error ? err.message : "Something went wrong.";
  return Response.json({ error: message }, { status: 500 });
}
