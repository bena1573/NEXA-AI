-- Approximate-nearest-neighbour index for retrieval. Prisma cannot express
-- pgvector index types, so it is applied as a manual migration.
CREATE INDEX IF NOT EXISTS "KnowledgeChunk_embedding_hnsw_idx"
  ON "KnowledgeChunk" USING hnsw ("embedding" vector_cosine_ops);
