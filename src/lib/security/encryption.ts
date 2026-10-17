import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const TAG_BYTES = 16
const MAX_PAYLOAD_BYTES = 2 * 1024 * 1024

function key() {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) throw new Error('APP_ENCRYPTION_KEY is not configured.')
  const normalized = raw.trim()
  const buffer = /^[0-9a-f]{64}$/i.test(normalized) ? Buffer.from(normalized, 'hex') : Buffer.from(normalized, 'base64')
  if (buffer.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be a 32-byte key encoded as base64 or 64-character hex.')
  return buffer
}

/** Authenticated encryption for provider credentials and other server-side secrets.
 * New values use a versioned envelope; the legacy 3-part envelope remains readable.
 */
export function assertEncryptionConfigured() { void key() }

export function encryptSensitive(plaintext: string) {
  if (typeof plaintext !== 'string') throw new TypeError('Plaintext must be a string.')
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1.${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
}

export function decryptSensitive(payload: string) {
  if (typeof payload !== 'string' || payload.length > MAX_PAYLOAD_BYTES) {
    throw new Error('Invalid encrypted payload.')
  }
  const parts = payload.split('.')
  const versioned = parts.length === 4 && parts[0] === 'v1'
  const [ivRaw, tagRaw, cipherRaw] = versioned ? parts.slice(1) : parts
  if (!ivRaw || !tagRaw || cipherRaw === undefined || (parts.length !== 3 && !versioned)) {
    throw new Error('Invalid encrypted payload.')
  }
  const iv = Buffer.from(ivRaw, 'base64url')
  const tag = Buffer.from(tagRaw, 'base64url')
  const ciphertext = Buffer.from(cipherRaw, 'base64url')
  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw new Error('Invalid encrypted payload.')
  const decipher = createDecipheriv(ALGORITHM, key(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export const encryptSecret = encryptSensitive
export const decryptSecret = decryptSensitive

export function maskSecret(secret: string) {
  const value = String(secret || '')
  return value.length <= 4 ? '••••' : `••••${value.slice(-4)}`
}
