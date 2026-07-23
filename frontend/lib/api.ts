const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ApiError {
  detail: string;
}

async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    try {
      const error: ApiError = await response.json();
      throw new Error(error.detail || `HTTP ${response.status}`);
    } catch {
      throw new Error(`HTTP ${response.status}`);
    }
  }

  // 204 No Content (e.g. DELETE) or empty body — nothing to parse.
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  auth: {
    // Unified registration for all 3 user types (venue_owner | player | general).
    register: (data: Record<string, unknown>) =>
      apiCall('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    registerVenueOwner: (data: { email: string; password: string; full_name: string; whatsapp: string }) =>
      apiCall('/auth/register-venue-owner', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    login: (email: string, password: string) =>
      apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    me: () => apiCall('/auth/me'),
    updateMe: (data: any) => apiCall('/auth/me', { method: 'PATCH', body: JSON.stringify(data) }),
  },
  venues: {
    create: (data: any) =>
      apiCall('/venues', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMyVenues: () => apiCall('/venues/me'),
    getBySlug: (slug: string) => apiCall(`/venues/slug/${slug}`),
    get: (venueId: number) => apiCall(`/venues/${venueId}`),
    update: (venueId: number, data: any) =>
      apiCall(`/venues/${venueId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    remove: (venueId: number) =>
      apiCall(`/venues/${venueId}`, {
        method: 'DELETE',
      }),
    getDiscount: (venueId: number) => apiCall(`/venues/${venueId}/discount`),
    saveDiscount: (venueId: number, data: any) =>
      apiCall(`/venues/${venueId}/discount`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    createSlot: (venueId: number, data: any) =>
      apiCall(`/venues/${venueId}/slots`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateSlot: (venueId: number, slotId: number, data: any) =>
      apiCall(`/venues/${venueId}/slots/${slotId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    deleteSlot: (venueId: number, slotId: number) =>
      apiCall(`/venues/${venueId}/slots/${slotId}`, {
        method: 'DELETE',
      }),
  },
  slots: {
    search: (params: {
      date?: string;
      city?: string;
      area?: string;
      sport?: number;
      skip?: number;
      limit?: number;
    }) => {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
      return apiCall(`/slots/search?${queryParams}`);
    },
    get: (slotId: number) => apiCall(`/slots/${slotId}`),
    availability: (slotId: number, date: string) =>
      apiCall(`/slots/${slotId}/availability?date=${encodeURIComponent(date)}`),
  },
  bookings: {
    create: (data: any) =>
      apiCall('/bookings', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMine: () => apiCall('/bookings/me'),           // signed-in customer's bookings
    owner: () => apiCall('/bookings/owner'),          // venue owner's incoming bookings
    cancel: (bookingId: number) =>
      apiCall(`/bookings/${bookingId}/cancel`, { method: 'PATCH' }),
    updateStatus: (bookingId: number, status: string) =>
      apiCall(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },
  players: {
    create: (data: any) =>
      apiCall('/players', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: (params: { sport?: number; position?: string; city?: string; search?: string; skip?: number; limit?: number }) => {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      return apiCall(`/players?${queryParams}`);
    },
    get: (id: number) => apiCall(`/players/${id}`),
    me: () => apiCall('/players/me'),
    updateMe: (data: any) => apiCall('/players/me', { method: 'PUT', body: JSON.stringify(data) }),
    stats: () => apiCall('/players/me/stats'),
  },
  opponents: {
    create: (data: any) => apiCall('/opponents', { method: 'POST', body: JSON.stringify(data) }),
    list: (params: { sport?: number; city?: string; position?: string; search?: string; skip?: number; limit?: number }) => {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      return apiCall(`/opponents?${queryParams}`);
    },
    get: (id: number) => apiCall(`/opponents/${id}`),
    mine: () => apiCall('/opponents/me'),
    remove: (id: number) => apiCall(`/opponents/${id}`, { method: 'DELETE' }),
  },
};
