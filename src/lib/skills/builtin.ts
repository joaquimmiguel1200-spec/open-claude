// @ts-nocheck\nimport type { SkillDefinition } from '@/types/skills'
export const BUILTIN_SKILL_NAMES=['coding-agent','debugging','web-app-testing','web-artifacts-builder','mcp-builder','skill-creator','seo','data-analysis','pdf','docx','pptx','xlsx','token-optimizer','persistent-memory','cowork','open-claude-code','open-claude-cowork','omniroute'] as const
export const builtinSkillContext=(skills:SkillDefinition[])=>skills.filter(s=>s.enabled!==false).map(s=>`SKILL: ${s.name}\nDESCRIPTION: ${s.description}\nINSTRUCTIONS:\n${s.instructions}`).join('\n\n')
