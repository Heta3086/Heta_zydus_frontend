const API_BASE = 'http://localhost:8080';
const LOGIN_AES_KEY = 'heta-zydus-secret-key-32-bytes!!';

const toBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

async function encryptLoginPassword(password: string): Promise<string> {
  // Keep login working even if Web Crypto is unavailable.
  if (!globalThis.crypto?.subtle) {
    return password;
  }

  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(LOGIN_AES_KEY);
  const cryptoKey = await crypto.subtle.importKey('raw', keyMaterial, { name: 'AES-GCM' }, false, ['encrypt']);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = encoder.encode(password);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, cryptoKey, plaintext);

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);

  return `enc:${toBase64(combined)}`;
}

export type LoginResponse = {
  token: string;
  role?: string;
};

export type ProfileResponse = {
  user_id: number;
  role: string;
  name?: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  phone: string;
  gender: string;
  blood_type: string;
  address: string;
  password: string;
  role?: string;
};

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  const encryptedPassword = await encryptLoginPassword(password);

  const res = await fetch(`${API_BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: encryptedPassword }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }

  return data as LoginResponse;
}

export async function fetchProfile(token: string): Promise<ProfileResponse> {
  const res = await fetch(`${API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Profile fetch failed');
  }

  return data as ProfileResponse;
}

export async function registerUser(payload: RegisterPayload): Promise<void> {
  const normalizedPhone = String(payload.phone || '').replace(/\D/g, '').trim();
  if (!/^\d{10}$/.test(normalizedPhone)) {
    throw new Error('Phone number must be exactly 10 digits');
  }

  const gender = String(payload.gender || '').trim();
  const bloodType = String(payload.blood_type || '').trim().toUpperCase();
  const address = String(payload.address || '').trim();

  if (!gender || !bloodType || !address) {
    throw new Error('Please fill all patient details');
  }

  const res = await fetch(`${API_BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name,
      email: payload.email,
      phone: normalizedPhone,
      gender,
      blood_type: bloodType,
      address,
      password: payload.password,
      role: 'patient',
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error || 'Registration failed');
  }
}

export async function logoutUser(token: string): Promise<void> {
  const res = await fetch(`${API_BASE}/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.error || 'Logout failed');
  }
}
