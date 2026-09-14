export interface TextChunk {
  index: number;
  content: string;
  tokenCount: number;
}

const DEFAULT_TARGET_TOKENS = 400;
const DEFAULT_OVERLAP_TOKENS = 60;

/**
 * Conservative word-based chunker for the first RAG implementation.
 * gte-small truncates long inputs, so chunks intentionally stay well below
 * its 512-token input limit. A later tokenizer can replace this without
 * changing the database contract.
 */
export function chunkText(
  text: string,
  targetTokens = DEFAULT_TARGET_TOKENS,
  overlapTokens = DEFAULT_OVERLAP_TOKENS,
): TextChunk[] {
  const normalized = text.replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').trim();
  if (!normalized) return [];

  const words = normalized.split(/\s+/);
  const target = Math.max(100, Math.floor(targetTokens));
  const overlap = Math.min(Math.max(0, Math.floor(overlapTokens)), target - 1);
  const chunks: TextChunk[] = [];

  let start = 0;
  while (start < words.length) {
    const end = Math.min(words.length, start + target);
    const content = words.slice(start, end).join(' ');
    chunks.push({ index: chunks.length, content, tokenCount: end - start });
    if (end === words.length) break;
    start = end - overlap;
  }

  return chunks;
}
