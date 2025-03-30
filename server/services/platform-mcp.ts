import { MCPService } from './mcp-service';
import { searchKnowledgeBase, mcpQuerySchema } from "./mcp-service";
import { storage } from "../storage";
import { z } from "zod";

// Schema for tag search
const tagSearchSchema = z.object({
  query: z.string(),
  limit: z.number().optional().default(10)
});

export class PlatformMCP {
  private mcpService: MCPService;

  constructor() {
    this.mcpService = new MCPService();
  }

  async getTags(query: string) {
    return this.mcpService.getTags(query);
  }

  async getContext(query: string) {
    return this.mcpService.getContext(query);
  }
}