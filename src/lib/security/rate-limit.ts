type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export interface RateLimitResult { allowed: boolean; limit: number; remaining: number; resetAt: number }

export function rateLimit(key: string, limit = 20, windowMs = 60_000): RateLimitResult {
  const now = Date.now()
  const current = buckets.get(key)
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + windowMs }
    buckets.set(key, next)
    return { allowed: true, limit, remaining: limit - 1, resetAt: next.resetAt }
  }
  if (current.count >= limit) return { allowed: false, limit, remaining: 0, resetAt: current.resetAt }
  current.count += 1
  return { allowed: true, limit, remaining: Math.max(0, limit - current.count), resetAt: current.resetAt }
}

export function clientKey(request: Request, userId?: string) {
  if (userId) return `user:${userId}`
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return `ip:${forwarded || request.headers.get('x-real-ip') || 'unknown'}`
}
