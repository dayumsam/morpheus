/**
 * Morpheus Context Protocol (MCP) Service
 * 
 * This service provides intelligent search and retrieval of notes and links
 * based on semantic similarity and tag relevance using OpenAI's embeddings.
 */

import { z } from 'zod';
import { storage } from '../storage';
import { Note, Tag, Link } from "@shared/schema";

// MCP response schemas
const mcpTagResponse = z.object({
  name: z.string(),
  relevance: z.number(),
  metadata: z.record(z.string(), z.any()).optional()
});

const mcpContentResponse = z.object({
  content: z.string(),
  relevance: z.number(),
  metadata: z.record(z.string(), z.any()).optional()
});

export const mcpQuerySchema = z.object({
  query: z.string(),
  tags: z.array(z.string()).optional(),
  limit: z.number().optional().default(10)
});

export async function searchKnowledgeBase({ query, tags = [], limit = 10 }: {query: string, tags?: string[], limit?: number}): Promise<{notes: (Note & { tags: Tag[]; relevanceScore: number })[], links: (Link & { tags: Tag[]; relevanceScore: number })[]}> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key is required for semantic search");
  }

  const OpenAI = await import("openai");
  const openai = new OpenAI.OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  // Get query embedding
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query
  });
  const queryVector = queryEmbedding.data[0].embedding;

  const results = {
    notes: [],
    links: []
  };

  // Get all notes and links
  const allNotes = await storage.getNotes();
  const allLinks = await storage.getLinks();

  // Process notes with embeddings
  const noteEmbeddings = await Promise.all(
    allNotes.map(async (note) => {
      const content = `${note.title}\n${note.content}`;
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: content
      });
      return {
        note,
        embedding: embedding.data[0].embedding
      };
    })
  );

  //Process links with embeddings
  const linkEmbeddings = await Promise.all(
    allLinks.map(async (link) => {
      const content = `${link.title}\n${link.description || ''}\n${link.url}`;
      const embedding = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: content
      });
      return {
        link,
        embedding: embedding.data[0].embedding
      };
    })
  );


  //Helper function to calculate cosine similarity
  const cosineSimilarity = (vec1: number[], vec2: number[]): number => {
    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (mag1 * mag2);
  };


  // Calculate similarity scores and filter
  // Need to use for...of loop instead of forEach since we need to use await inside the loop
  for (const { note, embedding } of noteEmbeddings) {
    const similarity = cosineSimilarity(queryVector, embedding);
    const noteTags = await storage.getNoteTagsByNoteId(note.id);
    if (similarity > 0 || tags.some(t => noteTags.map(nt => nt.name).includes(t))) {
      results.notes.push({
        ...note,
        tags: noteTags,
        relevanceScore: similarity
      });
    }
  }

  // Need to use for...of loop instead of forEach since we need to use await inside the loop
  for (const { link, embedding } of linkEmbeddings) {
    const similarity = cosineSimilarity(queryVector, embedding);
    const linkTags = await storage.getLinkTagsByLinkId(link.id);
    if (similarity > 0 || tags.some(t => linkTags.map(lt => lt.name).includes(t))) {
      results.links.push({
        ...link,
        tags: linkTags,
        relevanceScore: similarity
      });
    }
  }

  // Sort by relevance and limit results
  results.notes.sort((a, b) => b.relevanceScore - a.relevanceScore);
  results.links.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    notes: results.notes.slice(0, limit),
    links: results.links.slice(0, limit)
  };
}

export class MCPService {
  async getTags(query: string) {
    const tags = await storage.getTags();

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is required for semantic tag matching");
    }

    // Create embeddings for the query and tags
    const OpenAI = await import("openai");
    const openai = new OpenAI.OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Get query embedding
    const queryEmbedding = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: query
    });

    // Get embeddings for all tags
    const tagEmbeddings = await Promise.all(
      tags.map(async (tag) => {
        const embedding = await openai.embeddings.create({
          model: "text-embedding-ada-002",
          input: tag.name
        });
        return {
          tag,
          embedding: embedding.data[0].embedding
        };
      })
    );

    // Calculate cosine similarity between query and each tag
    const queryVector = queryEmbedding.data[0].embedding;
    const tagScores = tagEmbeddings.map(({ tag, embedding }) => {
      const similarity = this.cosineSimilarity(queryVector, embedding);
      return {
        name: tag.name,
        relevance: similarity,
        metadata: {
          color: tag.color,
          id: tag.id
        }
      };
    });

    // Sort by relevance and return
    return tagScores.sort((a, b) => b.relevance - a.relevance);
  }

  // Helper function to calculate cosine similarity
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (mag1 * mag2);
  }

  async getContext(query: string) {
    const results = await searchKnowledgeBase({
      query,
      limit: 20
    });

    return {
      context: {
        notes: results.notes.map(note => ({
          content: `Title: ${note.title}\n\n${note.content}`,
          relevance: note.relevanceScore,
          metadata: {
            id: note.id,
            tags: note.tags.map(t => t.name)
          }
        })),
        links: results.links.map(link => ({
          content: `${link.title}\n${link.url}\n${link.description || ''}\n${link.summary || ''}`,
          relevance: link.relevanceScore,
          metadata: {
            id: link.id,
            tags: link.tags.map(t => t.name)
          }
        }))
      }
    };
  }
}