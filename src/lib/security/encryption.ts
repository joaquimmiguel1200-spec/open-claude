// @ts-nocheck
import 'server-only'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
const ALGORITHM = 'aes-256-gcm'
function key() {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) throw new Error('APP_ENCRYPTION_KEY is not configured.')
  const buffer = Buffer.from(raw, 'base64')
  if (buffer.length !== 32) throw new Error('APP_ENCRYPTION_KEY must be a base64-encoded 32-byte key.')
  return buffer
}
export function encryptSensitive(plaintext: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv(ALGORITHM, key(), iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${ciphertext.toString('base64url')}`
}
export function decryptSensitive(payload: string) {
  const [ivRaw, tagRaw, cipherRaw] = payload.split('.')
  if (!ivRaw || !tagRaw || !cipherRaw) throw new Error('Invalid encrypted payload.')
  const decipher = createDecipheriv(ALGORITHM, key(), Buffer.from(ivRaw, 'base64url'))
  decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'))
  return Buffer.concat([decipher.update(Buffer.from(cipherRaw, 'base64url')), decipher.final()]).toString('utf8')
}
// Compatibility exports used by the API credential routes.
export const encryptSecret = encryptSensitive
export const decryptSecret = decryptSensitive
export function maskSecret(secret: string) {
  const value = String(secret || '')
  return value.length <= 4 ? '••••' : `••••${value.slice(-4)}`
}
