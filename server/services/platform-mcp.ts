
import { searchKnowledgeBase, mcpQuerySchema } from "./mcp-service";
import { storage } from "../storage";
import { z } from "zod";

// Schema for tag search
const tagSearchSchema = z.object({
  query: z.string(),
  limit: z.number().optional().default(10)
});

export class PlatformMCP {
  async getTags(query: string) {
    try {
      const tags = await storage.getTags();
      
      // Filter tags based on query
      const matchingTags = tags.filter(tag => {
        const tagName = tag.name.toLowerCase();
        const searchQuery = query.toLowerCase();
        return tagName.includes(searchQuery) || searchQuery.includes(tagName);
      });

      return matchingTags;
    } catch (err) {
      console.error("Error getting tags:", err);
      return [];
    }
  }

  async getContext(query: string) {
    try {
      // First get relevant tags
      const tags = await this.getTags(query);
      const tagNames = tags.map(t => t.name);

      // Search knowledge base with these tags and query
      const results = await searchKnowledgeBase({
        query,
        tags: tagNames,
        limit: 20 // Get more results for better context
      });

      // Format results for Cursor context
      return {
        tags: tags.map(tag => ({
          name: tag.name,
          relevance: query.toLowerCase().includes(tag.name.toLowerCase()) ? 1.0 : 0.5
        })),
        notes: results.notes.map(note => ({
          content: `Title: ${note.title}\n\n${note.content}`,
          relevance: note.relevanceScore,
          tags: note.tags.map(t => t.name).join(', ')
        })),
        links: results.links.map(link => ({
          content: `${link.title}\n${link.url}\n${link.description || ''}\n${link.summary || ''}`,
          relevance: link.relevanceScore,
          tags: link.tags.map(t => t.name).join(', ')
        }))
      };
    } catch (err) {
      console.error("Error getting context:", err);
      return { tags: [], notes: [], links: [] };
    }
  }
}
