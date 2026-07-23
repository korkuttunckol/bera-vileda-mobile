const STORAGE_KEYS = {
  isLoggedIn: 'isLoggedIn',
  username: 'username',
} as const;

export function saveLocalSession(username: string): void {
  localStorage.setItem(STORAGE_KEYS.isLoggedIn, 'true');
  localStorage.setItem(STORAGE_KEYS.username, username);
}

export function clearLocalSession(): void {
  localStorage.removeItem(STORAGE_KEYS.isLoggedIn);
  localStorage.removeItem(STORAGE_KEYS.username);
}

export function getLocalSession(): { username: string } | null {
  if (localStorage.getItem(STORAGE_KEYS.isLoggedIn) !== 'true') {
    return null;
  }

  const username = localStorage.getItem(STORAGE_KEYS.username);
  if (!username) {
    return null;
  }

  return { username };
}
