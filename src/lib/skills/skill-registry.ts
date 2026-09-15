import type { SkillDefinition } from '@/types/skills'

export interface SkillRegistry {
  register(skill: SkillDefinition): void
  registerMany(skills: SkillDefinition[]): void
  get(name: string): SkillDefinition | undefined
  list(): SkillDefinition[]
}

export function createSkillRegistry(initial: SkillDefinition[] = []): SkillRegistry {
  const skills = new Map<string, SkillDefinition>()
  const register = (skill: SkillDefinition) => {
    const key = skill.name.trim().toLowerCase()
    if (!key || !skill.instructions.trim() || !skill.description.trim()) return
    skills.set(key, { ...skill, name: skill.name.trim(), description: skill.description.trim(), instructions: skill.instructions.trim() })
  }
  return {
    register,
    registerMany: (items) => items.forEach(register),
    get: (name) => skills.get(name.trim().toLowerCase()),
    list: () => [...skills.values()],
  }
}
