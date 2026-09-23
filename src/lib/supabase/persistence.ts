import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemoryItem } from '@/types/memory'
import type { PermissionRule, PermissionStore } from '@/types/permissions'

export function createPersistence(client: SupabaseClient) {
  const memoryStore = {
    async insertMemory(input: Omit<MemoryItem,'id'|'created_at'|'updated_at'>) {
      const { data,error }=await client.from('memories').insert({ ...input, memory_type: input.category }).select('*').single()
      if(error) throw new Error(`Memory insert failed: ${error.message}`)
      return data as MemoryItem
    },
    async findByDedupeKey(input:{userId:string;dedupeKey:string;projectId?:string|null}) {
      let q=client.from('memories').select('*').eq('user_id',input.userId).eq('dedupe_key',input.dedupeKey)
      q=input.projectId ? q.eq('project_id',input.projectId) : q.is('project_id',null)
      const {data,error}=await q.maybeSingle(); if(error) throw new Error(`Memory lookup failed: ${error.message}`); return data as MemoryItem|null
    },
    async updateMemory(id:string,patch:Partial<Pick<MemoryItem,'content'|'category'|'importance'|'metadata'|'expires_at'>>) {
      const payload={...patch, ...(patch.category?{memory_type:patch.category}:{})}
      const {data,error}=await client.from('memories').update(payload).eq('id',id).select('*').single()
      if(error) throw new Error(`Memory update failed: ${error.message}`); return data as MemoryItem
    },
    async listMemories(input:{userId:string;projectId?:string|null;chatId?:string|null;limit?:number}) {
      let q=client.from('memories').select('*').eq('user_id',input.userId).order('importance',{ascending:false}).limit(input.limit??50)
      if(input.projectId) q=q.or(`project_id.is.null,project_id.eq.${input.projectId}`)
      if(input.chatId) q=q.or(`chat_id.is.null,chat_id.eq.${input.chatId}`)
      const {data,error}=await q; if(error) throw new Error(`Memory retrieval failed: ${error.message}`); return (data??[]) as MemoryItem[]
    }
  }
  const permissionStoreForUser = (userId:string): PermissionStore => ({
    async listRules(context={}) {
      let q=client.from('permission_grants').select('*')
      if(context.userId) q=q.eq('user_id',context.userId)
      if(context.projectId) q=q.or(`project_id.is.null,project_id.eq.${context.projectId}`)
      const {data,error}=await q; if(error) throw new Error(`Permission lookup failed: ${error.message}`)
      return (data??[]).map((r:any)=>({id:r.id,action:r.action,resource:r.resource_id??undefined,decision:r.effect==='deny'?'deny':'allow',scope:r.project_id?'project':'user',expiresAt:r.expires_at??undefined,createdAt:r.created_at}))
    },
    async addRule(rule:PermissionRule) {
      const {error}=await client.from('permission_grants').upsert({id:rule.id,user_id:userId,project_id:rule.scope==='project'?rule.resource:null,resource_type:'permission',resource_id:null,action:rule.action,effect:rule.decision==='deny'?'deny':'allow',expires_at:rule.expiresAt??null})
      if(error) throw new Error(`Permission grant failed: ${error.message}`)
    },
    async removeRule(ruleId:string) { const {error}=await client.from('permission_grants').delete().eq('id',ruleId); if(error) throw new Error(`Permission revoke failed: ${error.message}`); return true }
  })
  return { memoryStore, permissionStore: permissionStoreForUser(''), permissionStoreForUser,
    async getOrCreateChat(userId:string, projectId?:string|null, title?:string, model?:string) {
      let q=client.from('chats').select('*').eq('owner_id',userId).order('updated_at',{ascending:false}).limit(1)
      if(projectId) q=q.eq('project_id',projectId)
      const {data,error}=await q.maybeSingle(); if(error) throw new Error(`Chat lookup failed: ${error.message}`)
      if(data) return data
      const inserted=await client.from('chats').insert({owner_id:userId,project_id:projectId??null,title:title??'New chat',model:model??null}).select('*').single()
      if(inserted.error) throw new Error(`Chat create failed: ${inserted.error.message}`); return inserted.data
    },
    async appendMessage(input:{chatId:string;userId:string;role:string;content:string;metadata?:Record<string,unknown>}) {
      const {data,error}=await client.from('messages').insert(input).select('*').single(); if(error) throw new Error(`Message save failed: ${error.message}`); return data
    },
    async recentMessages(chatId:string,limit=40) { const {data,error}=await client.from('messages').select('role,content').eq('chat_id',chatId).order('created_at',{ascending:false}).limit(limit); if(error) throw new Error(`Message history failed: ${error.message}`); return (data??[]).reverse() },
    async searchChunks(userId:string,query:string,limit=8) { const {data,error}=await client.from('file_chunks').select('*,files!inner(owner_id)').eq('files.owner_id',userId).ilike('content',`%${query.slice(0,80).replace(/[%_]/g,'')}%`).limit(limit); if(error) return []; return (data??[]).map((r:any)=>({id:r.id,fileId:r.file_id,projectId:null,ownerId:userId,chunkIndex:r.chunk_index,content:r.content,tokenCount:null,metadata:r.metadata??{},embeddingModel:'Supabase/gte-small' as const,embeddingStatus:'ready' as const,contentHash:null,createdAt:r.created_at,updatedAt:r.created_at,similarity:0,keywordScore:1,score:1})) },
    async audit(input:{userId:string;projectId?:string|null;action:string;resourceType?:string;resourceId?:string;metadata?:Record<string,unknown>}) { await client.from('audit_logs').insert({user_id:input.userId,project_id:input.projectId??null,action:input.action,resource_type:input.resourceType??null,resource_id:input.resourceId??null,metadata:input.metadata??{}}) }
  }
}
