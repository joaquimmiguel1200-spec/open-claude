export type RagEmbeddingStatus = 'pending' | 'ready' | 'failed';

export interface RagChunk {
  id: string;
  fileId: string;
  projectId: string | null;
  ownerId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  metadata: Record<string, unknown>;
  embeddingModel: 'Supabase/gte-small';
  embeddingStatus: RagEmbeddingStatus;
  embeddingError: string | null;
  contentHash: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RagSearchResult extends Omit<RagChunk, 'embeddingStatus' | 'embeddingError'> {
  similarity: number;
  keywordScore: number;
  score: number;
}

export interface RagEmbeddingResponse {
  model: 'Supabase/gte-small';
  dimensions: 384;
  embeddings: number[][];
}
