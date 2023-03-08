export const clone = <T>(input: T): T => {
  if (typeof input !== 'object') {
    return input;
  }

  if (Array.isArray(input)) {
    return input.map(clone) as unknown as T;
  }

  const result: T = {} as unknown as T;

  for (const [key, value] of Object.entries(input) as [keyof T, T[keyof T]][]) {
    result[key] = clone(value);
  }

  return result;
};
