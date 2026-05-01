import jwt, { SignOptions } from 'jsonwebtoken';
import type { JwtPayload, RefreshTokenPayload } from '../types';

const JWT_SECRET = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET is not set');
  return s;
};

export function signAccessToken(
  payload: Omit<JwtPayload, 'iat' | 'exp'>,
  expiresIn = process.env.JWT_ACCESS_EXPIRES || '15m'
): string {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn } as SignOptions);
}

export function signRefreshToken(
  payload: Omit<RefreshTokenPayload, 'iat' | 'exp'>,
  expiresIn = process.env.JWT_REFRESH_EXPIRES || '7d'
): string {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn } as SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET()) as JwtPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, JWT_SECRET()) as RefreshTokenPayload;
}
