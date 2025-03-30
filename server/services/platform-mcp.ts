import { MCPService } from './mcp-service';
import { searchKnowledgeBase, mcpQuerySchema } from "./mcp-service";
import { storage } from "../storage";
import { z } from "zod";
import { Note, Tag, Link } from "@shared/schema";

// Schema for tag search
const tagSearchSchema = z.object({
  query: z.string(),
  limit: z.number().optional().default(10)
});

export class PlatformMCP {
  private mcpService: MCPService;
  private MAX_RESULTS = 4; // Limit to 3-4 notes as requested

  constructor() {
    this.mcpService = new MCPService();
  }

  async getTags(query: string) {
    return this.mcpService.getTags(query);
  }

  /**
   * Enhanced context retrieval that prioritizes tag matching and limits results
   * This is specifically for /api/mcp/platform/* endpoints
   */
  async getContext(query: string) {
    // Step 1: Get tags related to the query
    const relatedTags = await this.mcpService.getTags(query);
    const mostRelevantTagNames = relatedTags
      .slice(0, 5) // Take top 5 most relevant tags
      .map(tag => tag.name);
    
    // Step 2: Search for notes and links with tag priority
    const searchResults = await searchKnowledgeBase({
      query: query,
      tags: mostRelevantTagNames, // Add relevant tags to prioritize tag matching
      limit: 20 // Get more results initially, then we'll filter and prioritize
    });
    
    // Step 3: Re-prioritize results to favor tag matches
    const prioritizedNotes = this.prioritizeResults(searchResults.notes, mostRelevantTagNames);
    const prioritizedLinks = this.prioritizeResults(searchResults.links, mostRelevantTagNames);

    // Step 4: Limit to requested number of results
    return {
      context: {
        notes: prioritizedNotes.slice(0, this.MAX_RESULTS).map(note => ({
          content: `Title: ${note.title}\n\n${note.content}`,
          relevance: note.relevanceScore,
          metadata: {
            id: note.id,
            tags: note.tags.map(t => t.name)
          }
        })),
        links: prioritizedLinks.slice(0, this.MAX_RESULTS).map(link => ({
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

  /**
   * Prioritizes results by tag matching first, then by semantic relevance
   */
  private prioritizeResults<T extends { tags: Tag[], relevanceScore: number }>(
    items: T[],
    priorityTags: string[]
  ): T[] {
    return [...items].sort((a, b) => {
      // Count matching tags for each item
      const aTagMatches = a.tags.filter(tag => priorityTags.includes(tag.name)).length;
      const bTagMatches = b.tags.filter(tag => priorityTags.includes(tag.name)).length;
      
      // First sort by number of matching tags (descending)
      if (aTagMatches !== bTagMatches) {
        return bTagMatches - aTagMatches;
      }
      
      // Then by semantic relevance if tag matches are equal
      return b.relevanceScore - a.relevanceScore;
    });
  }
}