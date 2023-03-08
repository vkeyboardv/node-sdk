export class LambdaError extends Error {
  constructor(message: string, protected context?: any) {
    super(message);
  }
}
