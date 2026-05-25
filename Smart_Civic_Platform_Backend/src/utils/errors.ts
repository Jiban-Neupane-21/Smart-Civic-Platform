export class NotFoundError extends Error {
  statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  statusCode = 403;
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class ConflictError extends Error {
  statusCode = 409;
  constructor(message: string) {
    super(message);
    this.name = "ConflictError";
  }
}

export class UnauthorizedError extends Error {
  statusCode = 401;
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ValidationError extends Error {
  statusCode = 422;
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
