import type { SandboxRunRequest, SandboxRunResult, SandboxRunner } from '@/types/sandbox'

export interface SandboxProfile {
  name: string
  image: string
  allowedCommands: string[]
}

export interface SandboxService {
  run(request: Omit<SandboxRunRequest, 'image'> & { profile: string }): Promise<SandboxRunResult>
}

export function createSandboxService(runner: SandboxRunner, profiles: SandboxProfile[]): SandboxService {
  const profileMap = new Map(profiles.map((profile) => [profile.name, profile]))
  return {
    async run(request) {
      const profile = profileMap.get(request.profile)
      if (!profile) throw new Error(`Unknown sandbox profile: ${request.profile}`)
      if (!request.command.length || !profile.allowedCommands.includes(request.command[0])) {
        throw new Error(`Command is not allowed by sandbox profile ${profile.name}.`)
      }
      return runner.run({ ...request, image: profile.image })
    },
  }
}
