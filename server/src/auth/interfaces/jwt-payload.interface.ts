/**
 * Payload embedded in access and refresh JWTs.
 *  - sub:   the user's UUID (standard JWT "subject" claim)
 *  - email: the user's email address
 */
export interface JwtPayload {
  sub: string;
  email: string;
}
