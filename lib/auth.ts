// Demo mode — auth is disabled; all functions are no-ops

export async function getSession(): Promise<null> {
  return null
}

export async function setSessionCookie(
  _userId: string,
  _email: string,
  _name?: string,
): Promise<void> {}

export async function clearSessionCookie(): Promise<void> {}

export async function signToken(_payload: {
  userId: string
  email: string
  name?: string
}): Promise<string> {
  return ''
}

export async function verifyToken(_token: string): Promise<null> {
  return null
}
