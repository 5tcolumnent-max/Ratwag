export type BiometricError =
  | 'NOT_SUPPORTED'
  | 'NOT_AVAILABLE'
  | 'USER_CANCELLED'
  | 'INVALID_STATE'
  | 'UNKNOWN';

export class BiometricAuthError extends Error {
  constructor(public code: BiometricError, message: string) {
    super(message);
    this.name = 'BiometricAuthError';
  }
}

function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.PublicKeyCredential &&
    typeof navigator.credentials?.create === 'function' &&
    typeof navigator.credentials?.get === 'function'
  );
}

async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export interface RegisteredCredential {
  credentialId: string;
  publicKey: string;
  userId: string;
  createdAt: string;
}

export async function registerCredential(
  userId: string,
  displayName: string
): Promise<RegisteredCredential> {
  if (!isWebAuthnSupported()) {
    throw new BiometricAuthError(
      'NOT_SUPPORTED',
      'WebAuthn is not supported in this browser. Please use a modern browser such as Chrome, Firefox, or Safari.'
    );
  }

  const available = await isPlatformAuthenticatorAvailable();
  if (!available) {
    throw new BiometricAuthError(
      'NOT_AVAILABLE',
      'No biometric hardware (fingerprint sensor, Face ID, etc.) was detected on this device. Please ensure your device has a compatible authenticator and try again.'
    );
  }

  const challenge = crypto.getRandomValues(new Uint8Array(32));
  const userIdBytes = new TextEncoder().encode(userId);

  let credential: PublicKeyCredential;
  try {
    credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Kingdom Guardian',
          id: window.location.hostname,
        },
        user: {
          id: userIdBytes,
          name: displayName,
          displayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'none',
      },
    })) as PublicKeyCredential;
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === 'NotAllowedError') {
        throw new BiometricAuthError('USER_CANCELLED', 'Biometric registration was cancelled or timed out.');
      }
      if (err.name === 'InvalidStateError') {
        throw new BiometricAuthError('INVALID_STATE', 'A credential is already registered for this device.');
      }
    }
    throw new BiometricAuthError('UNKNOWN', 'Biometric registration failed. Please try again.');
  }

  const response = credential.response as AuthenticatorAttestationResponse;

  const registered: RegisteredCredential = {
    credentialId: bufferToBase64url(credential.rawId),
    publicKey: bufferToBase64url(response.getPublicKey() ?? new ArrayBuffer(0)),
    userId,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem(`biometric_credential_${userId}`, JSON.stringify(registered));

  return registered;
}

export async function authenticate(userId: string): Promise<boolean> {
  if (!isWebAuthnSupported()) {
    throw new BiometricAuthError(
      'NOT_SUPPORTED',
      'WebAuthn is not supported in this browser. Please use a modern browser such as Chrome, Firefox, or Safari.'
    );
  }

  const available = await isPlatformAuthenticatorAvailable();
  if (!available) {
    throw new BiometricAuthError(
      'NOT_AVAILABLE',
      'No biometric hardware was detected on this device. Please ensure your device supports fingerprint or face authentication.'
    );
  }

  const stored = localStorage.getItem(`biometric_credential_${userId}`);
  if (!stored) {
    throw new BiometricAuthError(
      'INVALID_STATE',
      'No biometric credential found for this account. Please register your biometric first.'
    );
  }

  const registered: RegisteredCredential = JSON.parse(stored);
  const challenge = crypto.getRandomValues(new Uint8Array(32));

  let assertion: PublicKeyCredential;
  try {
    assertion = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: window.location.hostname,
        allowCredentials: [
          {
            id: base64urlToBuffer(registered.credentialId),
            type: 'public-key',
            transports: ['internal'],
          },
        ],
        userVerification: 'required',
        timeout: 60000,
      },
    })) as PublicKeyCredential;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotAllowedError') {
      throw new BiometricAuthError('USER_CANCELLED', 'Biometric verification was cancelled or timed out.');
    }
    throw new BiometricAuthError('UNKNOWN', 'Biometric verification failed. Please try again.');
  }

  return !!assertion;
}

export async function checkBiometricSupport(): Promise<{
  supported: boolean;
  available: boolean;
  message: string;
}> {
  if (!isWebAuthnSupported()) {
    return {
      supported: false,
      available: false,
      message: 'WebAuthn is not supported in this browser.',
    };
  }
  const available = await isPlatformAuthenticatorAvailable();
  return {
    supported: true,
    available,
    message: available
      ? 'Biometric authentication is available on this device.'
      : 'No biometric hardware detected on this device.',
  };
}

export function hasSavedCredential(userId: string): boolean {
  return !!localStorage.getItem(`biometric_credential_${userId}`);
}

export const PRIVILEGED_EMAIL = '5tcolumnent@gmail.com';

export function isPrivilegedUser(email: string): boolean {
  return email.trim().toLowerCase() === PRIVILEGED_EMAIL.toLowerCase();
}

export function storePrivilegedSession(refreshToken: string, credentialId: string): void {
  const key = btoa(credentialId).slice(0, 16);
  const encoded = btoa(
    Array.from(refreshToken).map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('')
  );
  localStorage.setItem('kg_priv_rt', encoded);
}

export function retrievePrivilegedSession(credentialId: string): string | null {
  const encoded = localStorage.getItem('kg_priv_rt');
  if (!encoded) return null;
  try {
    const key = btoa(credentialId).slice(0, 16);
    const raw = atob(encoded);
    return Array.from(raw).map((c, i) =>
      String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
    ).join('');
  } catch {
    return null;
  }
}

export function clearPrivilegedSession(): void {
  localStorage.removeItem('kg_priv_rt');
}

export function getStoredCredential(userId: string): RegisteredCredential | null {
  const stored = localStorage.getItem(`biometric_credential_${userId}`);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as RegisteredCredential;
  } catch {
    return null;
  }
}
