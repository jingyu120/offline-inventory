/**
 * Executes an asynchronous operation, catching any exceptions and returning a
 * type-safe tuple [result, error].
 *
 * This is the single error-isolation primitive for the codebase: all repository
 * writes, network transactions, and database operations should wrap their
 * execution with `guardAsync` instead of bespoke try/catch blocks.
 */
export async function guardAsync<T, E = Error>(
  promise: Promise<T>,
): Promise<[T, null] | [null, E]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, error as E];
  }
}
