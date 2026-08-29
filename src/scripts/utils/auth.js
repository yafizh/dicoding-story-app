const AUTH_KEY = 'STORY_APP_AUTH';

export function setAuthSession(authData) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
}

export function getAuthSession() {
  const data = localStorage.getItem(AUTH_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

export function getAuthToken() {
  const session = getAuthSession();
  return session ? session.token : null;
}

export function getAuthUser() {
  const session = getAuthSession();
  return session ? { name: session.name, userId: session.userId } : null;
}

export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}
