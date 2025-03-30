
import { searchKnowledgeBase, type MCPResponse } from "./mcp-service";
import { storage } from "../storage";
import type { Tag } from "@shared/schema";

export class PlatformMCP {
  async getTags(query: string): Promise<MCPResponse> {
    try {
      const tags = await storage.getTags();
      
      // Filter tags based on query
      const matchingTags = tags.filter(tag => {
        const tagName = tag.name.toLowerCase();
        const searchQuery = query.toLowerCase();
        return tagName.includes(searchQuery) || searchQuery.includes(tagName);
      });

      return {
        status: "success",
        data: {
          tags: matchingTags.map(tag => ({
            name: tag.name,
            relevance: query.toLowerCase().includes(tag.name.toLowerCase()) ? 1.0 : 0.5
          }))
        }
      };
    } catch (err) {
      return {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error occurred"
      };
    }
  }

  async getContext(query: string): Promise<MCPResponse> {
    try {
      // First get relevant tags
      const tagsResponse = await this.getTags(query);
      if (tagsResponse.status === "error") {
        return tagsResponse;
      }

      const tagNames = tagsResponse.data.tags.map((t: any) => t.name);

      // Search knowledge base with these tags and query
      const results = await searchKnowledgeBase({
        query,
        tags: tagNames,
        limit: 20
      });

      return results;
    } catch (err) {
      return {
        status: "error",
        error: err instanceof Error ? err.message : "Unknown error occurred"
      };
    }
  }
}
