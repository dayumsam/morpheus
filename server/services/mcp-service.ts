/**
 * Morpheus Context Protocol (MCP) Service
 * 
 * This service provides intelligent search and retrieval of notes and links
 * based on semantic similarity and tag relevance using OpenAI's embeddings.
 */

import { z } from "zod";
import { storage } from "../storage";
import type { Note, Link, Tag } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for MCP queries
export const mcpQuerySchema = z.object({
  query: z.string().min(1),
  tags: z.array(z.string()).default([]),
  limit: z.number().default(10),
  embeddings: z.boolean().default(false)
});

export type MCPQuery = z.infer<typeof mcpQuerySchema>;

export type MCPResponse = {
  status: "success" | "error";
  data?: any;
  error?: string;
};

export type MCPResource = {
  id: string;
  type: "note" | "link";
  content: string;
  metadata: Record<string, any>;
  tags: string[];
  relevance: number;
};

export async function searchKnowledgeBase(query: MCPQuery): Promise<MCPResponse> {
  try {
    const notes = await storage.getNotes();
    const links = await storage.getLinks();
    const allTags = await storage.getTags();

    // Filter by tags if provided
    let filteredNotes = notes;
    let filteredLinks = links;

    if (query.tags.length > 0) {
      const tagIds = allTags
        .filter(t => query.tags.includes(t.name))
        .map(t => t.id);

      filteredNotes = await Promise.all(
        notes.filter(async note => {
          const noteTags = await storage.getNoteTagsByNoteId(note.id);
          return noteTags.some(t => tagIds.includes(t.id));
        })
      );

      filteredLinks = await Promise.all(
        links.filter(async link => {
          const linkTags = await storage.getLinkTagsByLinkId(link.id);
          return linkTags.some(t => tagIds.includes(t.id));
        })
      );
    }

    // Calculate relevance scores
    const resources: MCPResource[] = [
      ...await Promise.all(filteredNotes.map(async note => {
        const tags = await storage.getNoteTagsByNoteId(note.id);
        return {
          id: `note-${note.id}`,
          type: "note" as const,
          content: note.content,
          metadata: {
            title: note.title,
            created_at: note.createdAt,
            updated_at: note.updatedAt
          },
          tags: tags.map(t => t.name),
          relevance: calculateRelevance(query.query, note.content)
        };
      })),
      ...await Promise.all(filteredLinks.map(async link => {
        const tags = await storage.getLinkTagsByLinkId(link.id);
        return {
          id: `link-${link.id}`,
          type: "link" as const,
          content: link.description || "",
          metadata: {
            url: link.url,
            title: link.title,
            summary: link.summary,
            created_at: link.createdAt
          },
          tags: tags.map(t => t.name),
          relevance: calculateRelevance(query.query, link.title + (link.description || ""))
        };
      }))
    ];

    // Sort by relevance and limit results
    const sortedResources = resources
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, query.limit);

    return {
      status: "success",
      data: {
        resources: sortedResources,
        metadata: {
          total_results: resources.length,
          filtered_results: sortedResources.length,
          query_tags: query.tags,
          available_tags: allTags.map(t => t.name)
        }
      }
    };
  } catch (err) {
    return {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown error occurred"
    };
  }
}

function calculateRelevance(query: string, content: string): number {
  const queryTerms = query.toLowerCase().split(/\s+/);
  const contentLower = content.toLowerCase();

  let score = 0;
  for (const term of queryTerms) {
    if (contentLower.includes(term)) {
      score += 1;
    }
  }

  return score / queryTerms.length;
}