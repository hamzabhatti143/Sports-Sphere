import { jwtDecode } from 'jwt-decode';

export interface TokenPayload {
  sub: number;
  role: string;
  name?: string;
  exp: number;
}

export interface AuthResponse {
  access_token: string;
  role: string;
  user_id?: number;
  full_name?: string | null;
}

/** Persist everything the UI needs after a successful login/registration. */
export function saveAuth(res: AuthResponse, email?: string): void {
  if (typeof window === 'undefined') return;
  saveToken(res.access_token);
  localStorage.setItem('userRole', res.role);
  if (res.full_name) localStorage.setItem('userName', res.full_name);
  if (res.role === 'venue_owner' && res.full_name) localStorage.setItem('ownerName', res.full_name);
  if (email) localStorage.setItem('userEmail', email);
}

/** Where a user lands after authenticating, based on their role. */
export function dashboardPathForRole(role: string): string {
  switch (role) {
    case 'venue_owner':
      return '/venues/dashboard';
    case 'player':
      return '/player/dashboard';
    case 'general':
      return '/player/dashboard';
    default:
      return '/';
  }
}

export function getStoredName(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('userName') || localStorage.getItem('ownerName') || '';
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function saveToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', token);
}

export function removeToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('userRole');
  localStorage.removeItem('userName');
  localStorage.removeItem('userEmail');
  localStorage.removeItem('ownerName');
}

export function isTokenValid(token: string): boolean {
  try {
    const decoded = jwtDecode<TokenPayload>(token);
    return decoded.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function getTokenPayload(token: string): TokenPayload | null {
  try {
    return jwtDecode<TokenPayload>(token);
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  const token = getToken();
  if (!token || !isTokenValid(token)) {
    return null;
  }
  const payload = getTokenPayload(token);
  return payload
    ? { userId: payload.sub, role: payload.role, name: payload.name || getStoredName() }
    : null;
}
