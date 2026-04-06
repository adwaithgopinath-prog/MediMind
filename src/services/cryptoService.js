// Zero-Knowledge AES-256-GCM Encryption using Web Crypto API
// Only the user's browser (with their passphrase) can decrypt vault data

const PBKDF2_ITERATIONS = 200000;

/** Derive a CryptoKey from a user passphrase + salt */
async function deriveKey(passphrase, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', encoder.encode(passphrase), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/** Encrypt a string. Returns a base64-encoded bundle (salt+iv+ciphertext) */
export async function encryptText(plaintext, passphrase) {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(passphrase, salt);

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  // Pack: [16 bytes salt][12 bytes iv][rest = ciphertext]
  const packed = new Uint8Array(16 + 12 + ciphertext.byteLength);
  packed.set(salt,                  0);
  packed.set(iv,                    16);
  packed.set(new Uint8Array(ciphertext), 28);

  return btoa(String.fromCharCode(...packed));
}

/** Decrypt a base64 bundle produced by encryptText */
export async function decryptText(bundle, passphrase) {
  const packed = Uint8Array.from(atob(bundle), c => c.charCodeAt(0));

  const salt       = packed.slice(0,  16);
  const iv         = packed.slice(16, 28);
  const ciphertext = packed.slice(28);

  const key = await deriveKey(passphrase, salt);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(plainBuffer);
}

/** Quick passphrase verification: encrypt + decrypt a known string */
export async function verifyPassphrase(passphrase, testBundle) {
  try {
    const result = await decryptText(testBundle, passphrase);
    return result === 'medimind-verify-ok';
  } catch {
    return false;
  }
}

/** Create a verification bundle for a new passphrase */
export async function createVerifyBundle(passphrase) {
  return encryptText('medimind-verify-ok', passphrase);
}
