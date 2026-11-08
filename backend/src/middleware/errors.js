
export function notFound(req, res) {
  return res.status(404).json({
    success: false,
    message: 'Route not found'
  });
}

export function errorHandler(err, req, res, next) {
  // If the response has already started, pass the error to Express.
  if (res.headersSent) {
    return next(err);
  }

  // Log detailed error information on the server.
  console.error(`[${new Date().toISOString()}]`, {
    method: req.method,
    path: req.originalUrl,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // MongoDB duplicate key error.
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this value already exists'
    });
  }

  // Mongoose validation error.
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed'
    });
  }

  // Invalid MongoDB ObjectId.
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid resource identifier'
    });
  }

  // Zod validation error.
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data',
      errors: err.issues?.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message
      })) || []
    });
  }

  // Invalid JSON request body.
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON request body'
    });
  }

  // Determine HTTP status.
  const status = Number.isInteger(err.status) &&
    err.status >= 400 &&
    err.status <= 599
    ? err.status
    : 500;

  // Avoid exposing internal server errors.
  return res.status(status).json({
    success: false,
    message: status === 500
      ? 'Internal server error'
      : err.message
  });
}
