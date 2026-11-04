import type { SupabaseClient } from '@supabase/supabase-js'
import { matchSkills } from '@/lib/skills/skill-loader'

export type WorkMode = 'chat' | 'code' | 'cowork'
const CODE_TERMS = /frontend|backend|react|next|typescript|javascript|python|sql|database|api|git|test|debug|security|architecture|devops|dependency|code|software|webapp|css|html|sandbox|refactor|review|deploy|performance/i
const COWORK_TERMS = /meeting|xlsx|spreadsheet|legal|document|internal|comms|podcast|kanban|task|docx|job-description|pptx|contract|compliance|pricing|product-description|lead|email|research|marketing|seo|content|presentation|office|administrative|project-management/i
const CODE_EXCLUDE = /meeting|xlsx|spreadsheet|legal-document|internal-comms|podcast|docx|job-description|pptx|contract|email-tone|cold-email|instagram|seo-content|marketing/i
const COWORK_EXCLUDE = /frontend|react|typescript|javascript|python|sql|database|api-docs|git-|code-review|webapp-testing|debug|devops|dependency-auditor|sandbox|refactor|architecture|css|html/i

export async function loadModeSkillInstructions(supabase: SupabaseClient, userId: string, mode: WorkMode, query: string): Promise<string[]> {
  const { data: skills, error } = await supabase.from('skills').select('id,name,description,instructions,enabled,tags,owner_id').or(`owner_id.is.null,owner_id.eq.${userId}`).eq('enabled', true)
  if (error || !skills?.length) return []
  const { data: overrides } = await supabase.from('user_skills').select('skill_id,enabled').eq('user_id', userId)
  const disabled = new Set((overrides ?? []).filter((item: any) => item.enabled === false).map((item: any) => item.skill_id))
  const enabled = skills.filter((skill: any) => !disabled.has(skill.id))
  const scoped = mode === 'chat' ? enabled : enabled.filter((skill: any) => {
    const descriptor = [skill.name, skill.description, ...(skill.tags ?? [])].join(' ')
    return mode === 'code' ? CODE_TERMS.test(descriptor) && !CODE_EXCLUDE.test(descriptor) : COWORK_TERMS.test(descriptor) && !COWORK_EXCLUDE.test(descriptor)
  })
  const matched = matchSkills(scoped.map((skill: any) => ({ ...skill, source: skill.owner_id ? 'user' : 'builtin' })), query, mode === 'chat' ? 8 : 6)
  return matched.map((entry: any) => `SKILL: ${entry.skill.name}\nDESCRIPTION: ${entry.skill.description}\nINSTRUCTIONS:\n${entry.skill.instructions}`)
}
