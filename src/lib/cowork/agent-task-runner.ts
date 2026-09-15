import type { AgentRuntime } from '@/types/agent'
import type { CoworkRunInput, CoworkTask, CoworkTaskRunner } from '@/types/cowork'

export function createAgentTaskRunner(agent: AgentRuntime): CoworkTaskRunner {
  return {
    async run(task: CoworkTask, input: CoworkRunInput, signal) {
      const result = await agent.run({ userId: input.userId, projectId: input.projectId, chatId: input.chatId, goal: `${task.objective}\nOverall goal: ${input.goal}`, signal })
      if (result.status !== 'completed') throw new Error(result.error ?? `Agent task ${task.title} did not complete.`)
      return result.response?.content ?? result
    },
  }
}
