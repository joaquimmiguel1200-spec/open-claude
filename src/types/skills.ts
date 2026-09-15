export interface SkillDefinition {
  name: string
  description: string
  instructions: string
  version?: string
  tags?: string[]
  source?: 'builtin' | 'project' | 'user' | 'imported'
}

export interface SkillMatch {
  skill: SkillDefinition
  score: number
}
