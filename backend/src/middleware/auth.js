
import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  // Ensure the JWT secret is configured.
  if (!process.env.JWT_SECRET) {
    console.error('JWT_SECRET is not configured');

    return res.status(500).json({
      message: 'Authentication service is not configured'
    });
  }

  // Read the authentication token from the HTTP-only cookie.
  let token = req.cookies?.mailflow_token;

  // If no cookie exists, check the Authorization header.
  if (!token) {
    const authorization = req.get('authorization');

    if (authorization) {
      const match = authorization.match(/^Bearer\s+(\S+)$/i);
      token = match?.[1];
    }
  }

  if (!token) {
    return res.status(401).json({
      message: 'Authentication required'
    });
  }

  try {
    // Verify JWT signature and expiration.
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET,
      {
        algorithms: ['HS256'],
        maxAge: '8h'
      }
    );

    // Validate required JWT claims.
    if (
      !payload ||
      typeof payload !== 'object' ||
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string' ||
      !Number.isInteger(payload.iat) ||
      !Number.isInteger(payload.exp) ||
      payload.exp <= payload.iat ||
      payload.exp - payload.iat > 8 * 60 * 60
    ) {
      return res.status(401).json({
        message: 'Invalid authentication token'
      });
    }

    // Attach authenticated administrator information.
    req.admin = {
      id: payload.sub,
      email: payload.email,
      name: payload.name
    };

    return next();

  } catch (error) {
    // Invalid, expired or not-yet-valid tokens.
    if (
      error instanceof jwt.JsonWebTokenError ||
      error instanceof jwt.TokenExpiredError ||
      error instanceof jwt.NotBeforeError
    ) {
      return res.status(401).json({
        message: 'Session is invalid or expired'
      });
    }

    // Unexpected authentication errors.
    console.error('Authentication error:', error.message);

    return res.status(500).json({
      message: 'Authentication service error'
    });
  }
}
