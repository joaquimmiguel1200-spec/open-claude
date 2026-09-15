import type { ToolParameterSchema } from '@/types/tools'

export interface ToolValidationResult {
  valid: boolean
  errors: string[]
}

function typeMatches(value: unknown, type: ToolParameterSchema['type']): boolean {
  if (type === 'null') return value === null
  if (type === 'array') return Array.isArray(value)
  if (type === 'integer') return typeof value === 'number' && Number.isInteger(value)
  if (type === 'number') return typeof value === 'number' && Number.isFinite(value)
  return typeof value === type
}

function validate(value: unknown, schema: ToolParameterSchema, path: string, errors: string[]) {
  if (!typeMatches(value, schema.type)) {
    errors.push(`${path} must be ${schema.type}.`)
    return
  }

  if (schema.enum && !schema.enum.some((item) => Object.is(item, value))) {
    errors.push(`${path} must be one of the allowed values.`)
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) errors.push(`${path} is shorter than ${schema.minLength}.`)
    if (schema.maxLength !== undefined && value.length > schema.maxLength) errors.push(`${path} is longer than ${schema.maxLength}.`)
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be >= ${schema.minimum}.`)
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be <= ${schema.maximum}.`)
  }

  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => validate(item, schema.items!, `${path}[${index}]`, errors))
  }

  if (schema.type === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const objectValue = value as Record<string, unknown>
    for (const key of schema.required ?? []) {
      if (!(key in objectValue)) errors.push(`${path}.${key} is required.`)
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in objectValue) validate(objectValue[key], childSchema, `${path}.${key}`, errors)
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(objectValue)) {
        if (!(key in (schema.properties ?? {}))) errors.push(`${path}.${key} is not allowed.`)
      }
    }
  }
}

export function validateToolInput(input: unknown, schema: ToolParameterSchema): ToolValidationResult {
  const errors: string[] = []
  validate(input, schema, '$', errors)
  return { valid: errors.length === 0, errors }
}
