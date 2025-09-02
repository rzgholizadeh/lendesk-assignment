export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export class ConflictError extends HttpError {
  constructor(message = 'Username already exists') {
    super(409, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(message = 'Invalid credentials') {
    super(401, message);
  }
}
