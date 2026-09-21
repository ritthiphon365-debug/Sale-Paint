import { NextFunction, Request, Response } from 'express';
import { verifyFirebaseIdToken, VerifiedFirebaseUser } from './firebaseAuth';

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: VerifiedFirebaseUser;
    }
  }
}

export async function requireFirebaseAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Valid Firebase authentication is required.' } });
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Bearer token is missing.' } });
  }

  try {
    const user = await verifyFirebaseIdToken(token);
    if (user.isAnonymous) {
      return res.status(403).json({ success: false, error: { code: 'ANONYMOUS_AUTH_NOT_ALLOWED', message: 'Anonymous Firebase sessions cannot access the production data API.' } });
    }
    req.authenticatedUser = user;
    return next();
  } catch (error: any) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: error?.message || 'Invalid Firebase authentication.' } });
  }
}
