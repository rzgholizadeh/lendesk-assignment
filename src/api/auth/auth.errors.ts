export class DuplicateKeyError extends Error {
  constructor(
    public readonly key: string,
    message?: string
  ) {
    super(message || `Duplicate key: ${key}`);
    this.name = 'DuplicateKeyError';
  }
}
