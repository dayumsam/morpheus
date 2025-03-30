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
  const results = {
    notes: [],
    links: [],
    relevanceScores: new Map()
  };

  // Get all items
  const allNotes = await storage.getNotes();
  const allLinks = await storage.getLinks();

  // Helper to calculate relevance score
  const calculateRelevance = (text: string) => {
    const queryTerms = query.toLowerCase().split(' ');
    const contentTerms = text.toLowerCase().split(' ');
    let matches = 0;
    for (const term of queryTerms) {
      if (contentTerms.includes(term)) matches++;
    }
    return matches / queryTerms.length;
  };

  // Process notes
  for (const note of allNotes) {
    const noteTags = await storage.getNoteTagsByNoteId(note.id);
    const relevance = calculateRelevance(note.title + ' ' + note.content);

    if (relevance > 0 || tags.some(t => noteTags.map(nt => nt.name).includes(t))) {
      results.notes.push({
        ...note,
        tags: noteTags,
        relevanceScore: relevance
      });
    }
  }

  // Process links
  for (const link of allLinks) {
    const linkTags = await storage.getLinkTagsByLinkId(link.id);
    const relevance = calculateRelevance(link.title + ' ' + (link.description || ''));

    if (relevance > 0 || tags.some(t => linkTags.map(lt => lt.name).includes(t))) {
      results.links.push({
        ...link,
        tags: linkTags,
        relevanceScore: relevance
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
    return tags.map(tag => ({
      name: tag.name,
      relevance: query.toLowerCase().includes(tag.name.toLowerCase()) ? 1.0 : 0.5,
      metadata: {
        color: tag.color,
        id: tag.id
      }
    }));
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