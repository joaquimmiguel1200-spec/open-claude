import 'server-only'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { SkillDefinition, SkillMatch } from '@/types/skills'

function parseSkill(content: string, source: SkillDefinition['source']): SkillDefinition | null {
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (!match) return null
  const frontmatter = match[1]
  const instructions = match[2].trim()
  const name = frontmatter.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  const description = frontmatter.match(/^description:\s*(.+)$/m)?.[1]?.trim()
  if (!name || !description) return null
  return { name, description, instructions, source }
}

export async function loadSkills(root: string, source: SkillDefinition['source'] = 'project'): Promise<SkillDefinition[]> {
  const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => [])
  const result: SkillDefinition[] = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const file = path.join(root, entry.name, 'SKILL.md')
    const text = await fs.readFile(file, 'utf8').catch(() => null)
    if (!text) continue
    const skill = parseSkill(text, source)
    if (skill) result.push(skill)
  }
  return result
}

export function matchSkills(skills: SkillDefinition[], query: string, limit = 5): SkillMatch[] {
  const terms = query.toLowerCase().split(/\W+/).filter(Boolean)
  return skills.map((skill) => {
    const haystack = `${skill.name} ${skill.description} ${skill.tags?.join(' ') ?? ''}`.toLowerCase()
    const hits = terms.filter((term) => haystack.includes(term)).length
    return { skill, score: terms.length ? hits / terms.length : 0 }
  }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score).slice(0, limit)
}
