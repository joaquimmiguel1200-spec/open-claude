import type { SkillDefinition } from '@/types/skills'

export interface ValidatedSkill {
  skill: SkillDefinition
  warnings: string[]
}

const SECRET_PATTERNS = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password)\s*[:=]/i,
]

const UNSAFE_EXECUTION_PATTERNS = [
  /disable\s+(?:security|authentication|authorization)/i,
  /bypass\s+(?:permission|approval|safety)/i,
  /exfiltrat|steal\s+(?:credentials|tokens|secrets)/i,
]

export function validateSkill(skill: SkillDefinition): ValidatedSkill | null {
  if (!skill.name.trim() || !skill.description.trim() || !skill.instructions.trim()) return null
  const warnings: string[] = []
  const text = `${skill.description}\n${skill.instructions}`
  if (SECRET_PATTERNS.some((pattern) => pattern.test(text))) return null
  if (UNSAFE_EXECUTION_PATTERNS.some((pattern) => pattern.test(text))) warnings.push('Skill contains potentially unsafe execution instructions and requires explicit tool permissions.')
  if (skill.instructions.length > 50000) warnings.push('Skill instructions are unusually large; progressive loading is recommended.')
  return { skill, warnings }
}

export function sanitizeSkillForContext(skill: SkillDefinition): string {
  return `SKILL: ${skill.name}\nDESCRIPTION: ${skill.description}\nINSTRUCTIONS:\n${skill.instructions}`
}
