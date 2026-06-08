export type Ok<T> = [value: T, error: undefined];
export type Err<E> = [value: undefined, error: E];
export type Result<T, E> = Ok<T> | Err<E>;
export type ResultAsync<T, E> = Promise<Result<T, E>>;

export const ok = <T>(value: T): Ok<T> => [value, undefined];
export const err = <E>(err: E): Err<E> => [undefined, err];
export const fromPromise = async <T, E>(
  promise: Promise<T>,
  errorFn: (e: unknown) => E,
): ResultAsync<T, E> => {
  try {
    return ok(await promise);
  } catch (e) {
    return err(errorFn(e));
  }
};
