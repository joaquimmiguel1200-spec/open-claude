import type { SupabaseClient } from '@supabase/supabase-js'
import { createPermissionEngine } from '@/lib/permissions/permission-engine'
import { createToolPermissionChecker } from '@/lib/permissions/tool-permission-checker'
import { createToolEngine, type ToolEngineOptions } from '@/lib/tools/tool-engine'
import { createPersistence } from './persistence'

export function createSupabaseToolEngine(client: SupabaseClient, userId: string, options: Omit<ToolEngineOptions,'permissionChecker'> = {}) {
  const persistence=createPersistence(client)
  const permissionEngine=createPermissionEngine({store:persistence.permissionStoreForUser(userId)})
  return { engine:createToolEngine({...options,permissionChecker:createToolPermissionChecker(permissionEngine)}), permissionEngine }
}

export function createSupabaseConnectionStore(client: SupabaseClient, userId: string) {
  return {
    listMcp: async (projectId?:string|null) => { let q=client.from('mcp_connections').select('*').eq('user_id',userId); if(projectId)q=q.eq('project_id',projectId); const {data,error}=await q; if(error)throw new Error(error.message); return data??[] },
    listGitHub: async () => { const {data,error}=await client.from('github_connections').select('id,account_login,installation_id,scopes,metadata,created_at,updated_at').eq('user_id',userId); if(error)throw new Error(error.message); return data??[] },
    saveMcp: async (input:Record<string,unknown>) => { const {data,error}=await client.from('mcp_connections').upsert({...input,user_id:userId}).select('*').single(); if(error)throw new Error(error.message); return data },
    saveGitHub: async (input:Record<string,unknown>) => { const {data,error}=await client.from('github_connections').upsert({...input,user_id:userId}).select('id,account_login,installation_id,scopes,metadata,created_at,updated_at').single(); if(error)throw new Error(error.message); return data },
    createCoworkSession: async (projectId:string|null, metadata:Record<string,unknown>={}) => { const {data,error}=await client.from('cowork_sessions').insert({owner_id:userId,project_id:projectId,status:'active',metadata}).select('*').single(); if(error)throw new Error(error.message); return data },
    updateCoworkSession: async (id:string,status:string,metadata?:Record<string,unknown>) => { const patch:Record<string,unknown>={status,updated_at:new Date().toISOString()}; if(metadata)patch.metadata=metadata; const {data,error}=await client.from('cowork_sessions').update(patch).eq('id',id).eq('owner_id',userId).select('*').single(); if(error)throw new Error(error.message); return data },
    addCoworkMember: async (sessionId:string,memberId:string,role='member') => { const {data,error}=await client.from('cowork_members').upsert({session_id:sessionId,user_id:memberId,role}).select('*').single(); if(error)throw new Error(error.message); return data }
  }
}
