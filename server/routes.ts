import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  insertNoteSchema,
  insertLinkSchema,
  insertTagSchema,
  insertConnectionSchema,
  insertDailyPromptSchema,
  type Note,
  type Link,
  type Tag,
} from "@shared/schema";
import { ZodError } from "zod";
import { processLink } from "./lib/cheerio";
import { generateSummary, generateDailyPrompt } from "./lib/openai";
import {
  analyzeImage,
  createNoteFromImage,
  suggestTagsFromImage,
} from "./lib/image-recognition";
import {
  generateTagsFromContent,
  generateTagsFromMarkdown,
} from "./lib/auto-tagging";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import { searchKnowledgeBase, mcpQuerySchema } from "./services/mcp-service";
import { PlatformMCP } from "./services/platform-mcp";

export async function registerRoutes(app: Express): Promise<Server> {
  // Error handling middleware
  const handleError = (err: any, res: Response) => {
    console.error(err);
    if (err instanceof ZodError) {
      return res.status(400).json({
        message: "Validation error",
        errors: fromZodError(err).message,
      });
    }
    return res
      .status(500)
      .json({ message: err.message || "Internal server error" });
  };

  // Helper to validate request body
  const validateBody = <T>(schema: z.ZodSchema<T>, body: any): T => {
    return schema.parse(body);
  };

  // ================================
  // Notes routes
  // ================================
  app.get("/api/notes", async (req: Request, res: Response) => {
    try {
      const notes = await storage.getNotes();
      return res.json(notes);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/notes/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const note = await storage.getNote(id);

      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Get tags for this note
      const tags = await storage.getNoteTagsByNoteId(id);

      return res.json({ ...note, tags });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/notes", async (req: Request, res: Response) => {
    try {
      const noteData = validateBody(insertNoteSchema, req.body);
      const note = await storage.createNote(noteData);

      // Add tags if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        for (const tagId of req.body.tags) {
          await storage.addTagToNote(note.id, tagId);
        }
      }

      return res.status(201).json(note);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/notes/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const noteData = validateBody(insertNoteSchema.partial(), req.body);

      const updatedNote = await storage.updateNote(id, noteData);

      if (!updatedNote) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Update tags if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        // First remove all existing tags
        const existingTags = await storage.getNoteTagsByNoteId(id);
        for (const tag of existingTags) {
          await storage.removeTagFromNote(id, tag.id);
        }

        // Then add the new tags
        for (const tagId of req.body.tags) {
          await storage.addTagToNote(id, tagId);
        }
      }

      return res.json(updatedNote);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/notes/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteNote(id);

      if (!success) {
        return res.status(404).json({ message: "Note not found" });
      }

      return res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // Links routes
  // ================================
  app.get("/api/links/metadata", async (req: Request, res: Response) => {
    try {
      const url = req.query.url as string;
      if (!url) {
        return res.status(400).json({ message: "URL is required" });
      }

      // Process URL to extract metadata
      const metadata = await processLink(url);

      // Generate tags from content if available
      let tags: string[] = [];
      if (metadata.content && process.env.OPENAI_API_KEY) {
        // Generate tags from content
        const suggestedTags = await generateTagsFromContent(metadata.content);

        // Find existing tags
        const existingTags = await storage.getTags();
        const existingTagNames = existingTags.map((tag) =>
          tag.name.toLowerCase(),
        );

        // Create any new tags
        const tagsToCreate = suggestedTags.filter(
          (tag) => !existingTagNames.includes(tag.toLowerCase()),
        );
        const newTags = [];

        for (const tagName of tagsToCreate) {
          // Generate a random color for the tag
          const colors = [
            "#805AD5",
            "#3182CE",
            "#38A169",
            "#DD6B20",
            "#E53E3E",
            "#6B46C1",
          ];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];

          const newTag = await storage.createTag({
            name: tagName,
            color: randomColor,
          });
          newTags.push(newTag);
        }

        // Get all tag IDs (both existing and new)
        const allTags = [...existingTags, ...newTags];
        tags = suggestedTags
          .map((tagName) => {
            const tag = allTags.find(
              (t) => t.name.toLowerCase() === tagName.toLowerCase(),
            );
            return tag?.id.toString() || "";
          })
          .filter(Boolean);
      }

      return res.json({
        ...metadata,
        tags,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/links", async (req: Request, res: Response) => {
    try {
      const links = await storage.getLinks();
      return res.json(links);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/links/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const link = await storage.getLink(id);

      if (!link) {
        return res.status(404).json({ message: "Link not found" });
      }

      // Get tags for this link
      const tags = await storage.getLinkTagsByLinkId(id);

      return res.json({ ...link, tags });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/links", async (req: Request, res: Response) => {
    try {
      // Check if URL is already in storage
      if (req.body.url) {
        const existingLink = await storage.getLinkByUrl(req.body.url);
        if (existingLink) {
          const tags = await storage.getLinkTagsByLinkId(existingLink.id);
          return res
            .status(200)
            .json({ ...existingLink, tags, existing: true });
        }
      }

      // Process URL to extract metadata
      let linkData = req.body;

      if (req.body.url && !req.body.title) {
        try {
          const metadata = await processLink(req.body.url);
          linkData = { ...req.body, ...metadata };

          // Generate summary if OpenAI API key is available
          if (process.env.OPENAI_API_KEY && metadata.description) {
            const summary = await generateSummary(
              metadata.description,
              req.body.url,
              metadata.title,
            );
            linkData.summary = summary;
          }
        } catch (error) {
          console.error("Error processing link:", error);
          // Continue with available data
        }
      }

      const validatedData = validateBody(insertLinkSchema, linkData);
      const link = await storage.createLink(validatedData);

      // Add tags if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        for (const tagId of req.body.tags) {
          await storage.addTagToLink(link.id, tagId);
        }
      }

      return res.status(201).json(link);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/links/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const linkData = validateBody(insertLinkSchema.partial(), req.body);

      const updatedLink = await storage.updateLink(id, linkData);

      if (!updatedLink) {
        return res.status(404).json({ message: "Link not found" });
      }

      // Update tags if provided
      if (req.body.tags && Array.isArray(req.body.tags)) {
        // First remove all existing tags
        const existingTags = await storage.getLinkTagsByLinkId(id);
        for (const tag of existingTags) {
          await storage.removeTagFromLink(id, tag.id);
        }

        // Then add the new tags
        for (const tagId of req.body.tags) {
          await storage.addTagToLink(id, tagId);
        }
      }

      return res.json(updatedLink);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/links/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteLink(id);

      if (!success) {
        return res.status(404).json({ message: "Link not found" });
      }

      return res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // Tags routes
  // ================================
  app.get("/api/tags", async (req: Request, res: Response) => {
    try {
      const tags = await storage.getTags();
      return res.json(tags);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/tags/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const tag = await storage.getTag(id);

      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }

      return res.json(tag);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get notes by tag
  app.get("/api/tags/:id/notes", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const tag = await storage.getTag(id);

      if (!tag) {
        return res.status(404).json({ message: "Tag not found" });
      }

      const notes = await storage.getNoteTagsByTagId(id);
      return res.json(notes);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/tags", async (req: Request, res: Response) => {
    try {
      const tagData = validateBody(insertTagSchema, req.body);

      // Check if tag with this name already exists
      const existingTag = await storage.getTagByName(tagData.name);
      if (existingTag) {
        return res
          .status(400)
          .json({ message: "Tag with this name already exists" });
      }

      const tag = await storage.createTag(tagData);
      return res.status(201).json(tag);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/tags/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const tagData = validateBody(insertTagSchema.partial(), req.body);

      // Check if name is being updated and already exists
      if (tagData.name) {
        const existingTag = await storage.getTagByName(tagData.name);
        if (existingTag && existingTag.id !== id) {
          return res
            .status(400)
            .json({ message: "Tag with this name already exists" });
        }
      }

      const updatedTag = await storage.updateTag(id, tagData);

      if (!updatedTag) {
        return res.status(404).json({ message: "Tag not found" });
      }

      return res.json(updatedTag);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/tags/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteTag(id);

      if (!success) {
        return res.status(404).json({ message: "Tag not found" });
      }

      // Return a JSON response instead of a 204 No Content
      return res.status(200).json({ success: true });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // Connections routes
  // ================================
  app.get("/api/connections", async (req: Request, res: Response) => {
    try {
      const connections = await storage.getConnections();
      return res.json(connections);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/connections", async (req: Request, res: Response) => {
    try {
      const connectionData = validateBody(insertConnectionSchema, req.body);
      const connection = await storage.createConnection(connectionData);
      return res.status(201).json(connection);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/connections/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteConnection(id);

      if (!success) {
        return res.status(404).json({ message: "Connection not found" });
      }

      return res.status(204).send();
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // Daily Prompts routes
  // ================================
  app.get("/api/daily-prompts", async (req: Request, res: Response) => {
    try {
      const prompts = await storage.getDailyPrompts();
      return res.json(prompts);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.get("/api/daily-prompts/latest", async (req: Request, res: Response) => {
    try {
      let prompt = await storage.getLatestDailyPrompt();

      // If no prompt exists or the latest prompt is more than 24 hours old, generate new one
      const now = new Date();
      if (
        !prompt ||
        now.getTime() - new Date(prompt.date).getTime() > 24 * 60 * 60 * 1000
      ) {
        // Get all notes and links for context
        const notes = await storage.getNotes();
        const links = await storage.getLinks();

        const promptText = await generateDailyPrompt(notes, links);
        prompt = await storage.createDailyPrompt({ prompt: promptText });
      }

      return res.json(prompt);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/daily-prompts", async (req: Request, res: Response) => {
    try {
      // If no prompt is provided in the request body, generate one using OpenAI
      if (!req.body.prompt) {
        const notes = await storage.getNotes();
        const links = await storage.getLinks();
        const promptText = await generateDailyPrompt(notes, links);
        req.body.prompt = promptText;
      }
      const promptData = validateBody(insertDailyPromptSchema, req.body);
      const prompt = await storage.createDailyPrompt(promptData);
      return res.status(201).json(prompt);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.put("/api/daily-prompts/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);

      // For answering prompts, we expect at least the answer field
      if (!req.body.answer && req.body.isAnswered) {
        return res.status(400).json({ message: "Answer is required" });
      }

      const updatedPrompt = await storage.updateDailyPrompt(id, req.body);

      if (!updatedPrompt) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      return res.json(updatedPrompt);
    } catch (err) {
      handleError(err, res);
    }
  });

  app.delete("/api/daily-prompts/:id", async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      const success = await storage.deleteDailyPrompt(id);

      if (!success) {
        return res.status(404).json({ message: "Prompt not found" });
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      console.error("Error deleting daily prompt:", err);
      return res.status(500).json({
        message: "Failed to delete prompt",
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  // ================================
  // Activities routes
  // ================================
  app.get("/api/activities", async (req: Request, res: Response) => {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const activities = await storage.getActivities(limit);
      return res.json(activities);
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // Graph Data route
  // ================================
  app.get("/api/graph", async (req: Request, res: Response) => {
    try {
      const graphData = await storage.getGraphData();
      return res.json(graphData);
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // Image Recognition routes
  // ================================

  // Schema for image upload requests
  const imageUploadSchema = z.object({
    base64Image: z.string(),
    title: z.string().optional(),
    prompt: z.string().optional(),
  });

  // Analyze image and return analysis
  app.post("/api/image/analyze", async (req: Request, res: Response) => {
    try {
      const { base64Image, prompt } = validateBody(imageUploadSchema, req.body);

      if (!process.env.OPENAI_API_KEY) {
        return res
          .status(400)
          .json({ message: "OpenAI API key is required for image analysis" });
      }

      const analysis = await analyzeImage(base64Image, prompt);
      return res.json({ analysis });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Create a note from image
  app.post("/api/image/create-note", async (req: Request, res: Response) => {
    try {
      const { base64Image, title } = validateBody(imageUploadSchema, req.body);

      if (!process.env.OPENAI_API_KEY) {
        return res
          .status(400)
          .json({ message: "OpenAI API key is required for image analysis" });
      }

      // Create note from image
      const noteData = await createNoteFromImage(base64Image, title);
      const note = await storage.createNote(noteData);

      // Generate suggested tags
      const suggestedTagNames = await suggestTagsFromImage(base64Image);

      // Check if tags exist, create them if not, and add to note
      const tags = [];
      for (const tagName of suggestedTagNames) {
        let tag = await storage.getTagByName(tagName);

        if (!tag) {
          // Generate a random color for the tag
          const colors = [
            "#805AD5",
            "#3182CE",
            "#38A169",
            "#DD6B20",
            "#E53E3E",
            "#6B46C1",
          ];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];

          tag = await storage.createTag({ name: tagName, color: randomColor });
        }

        await storage.addTagToNote(note.id, tag.id);
        tags.push(tag);
      }

      return res.status(201).json({ ...note, tags });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // Auto-tagging route
  // ================================

  // Schema for auto-tagging request
  const autoTagSchema = z.object({
    content: z.string(),
  });

  // Generate tags for content
  app.post("/api/auto-tag", async (req: Request, res: Response) => {
    try {
      const { content } = validateBody(autoTagSchema, req.body);

      if (!process.env.OPENAI_API_KEY) {
        return res
          .status(400)
          .json({ message: "OpenAI API key is required for auto-tagging" });
      }

      // Generate tags from content
      const suggestedTags = await generateTagsFromContent(content);

      // Find existing tags
      const existingTags = await storage.getTags();
      const existingTagNames = existingTags.map((tag) =>
        tag.name.toLowerCase(),
      );

      // Create any new tags
      const tagsToCreate = suggestedTags.filter(
        (tag) => !existingTagNames.includes(tag.toLowerCase()),
      );
      const newTags = [];

      for (const tagName of tagsToCreate) {
        // Generate a random color for the tag
        const colors = [
          "#805AD5",
          "#3182CE",
          "#38A169",
          "#DD6B20",
          "#E53E3E",
          "#6B46C1",
        ];
        const randomColor = colors[Math.floor(Math.random() * colors.length)];

        const newTag = await storage.createTag({
          name: tagName,
          color: randomColor,
        });
        newTags.push(newTag);
      }

      return res.json({
        suggestedTags,
        newTags,
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Suggest tags for an image
  app.post("/api/image/suggest-tags", async (req: Request, res: Response) => {
    try {
      const { base64Image } = validateBody(imageUploadSchema, req.body);

      if (!process.env.OPENAI_API_KEY) {
        return res
          .status(400)
          .json({ message: "OpenAI API key is required for tag suggestions" });
      }

      const suggestedTags = await suggestTagsFromImage(base64Image);
      return res.json({ tags: suggestedTags });
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // Graph Data route
  // ================================
  app.get("/api/graph-data", async (req: Request, res: Response) => {
    try {
      const graphData = await storage.getGraphData();
      return res.json(graphData);
    } catch (err) {
      handleError(err, res);
    }
  });

  // ================================
  // MCP (Morpheus Context Protocol) routes
  // ================================

  // Initialize Platform MCP
  const platformMCP = new PlatformMCP();

  // Platform MCP endpoints
  app.post("/api/mcp/platform/tags", async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }
      const tags = await platformMCP.getTags(query);
      return res.json({ tags });
    } catch (err) {
      handleError(err, res);
    }
  });

  app.post("/api/mcp/platform/context", async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }
      const context = await platformMCP.getContext(query);
      return res.json(context);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Cursor context endpoint
  app.post("/api/mcp/cursor-context", async (req: Request, res: Response) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ message: "Query is required" });
      }

      // Use MCP search with optimized settings for Cursor
      const results = await searchKnowledgeBase({
        query,
        tags: [], // Don't filter by tags for broader context
        limit: 20 // Get more results for comprehensive context
      });

      // Format results for Cursor
      const formattedResults = {
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

      return res.json(formattedResults);
    } catch (err) {
      handleError(err, res);
    }
  });

  // Get all available tags
  app.get("/api/mcp/tags", async (req: Request, res: Response) => {
    try {
      const tags = await storage.getTags();
      return res.json({ tags });
    } catch (err) {
      handleError(err, res);
    }
  });

  // Enhanced query endpoint with semantic search and AI-powered tag relations
  app.post("/api/mcp/query", async (req: Request, res: Response) => {
    try {
      // Validate input using our schema with defaults
      const validatedQuery = mcpQuerySchema.parse(req.body);
      
      // Use our MCP service to search knowledge base with semantic search
      const results = await searchKnowledgeBase(validatedQuery);
      
      // Return the enriched results
      return res.json(results);
      
    } catch (err) {
      handleError(err, res);
    }
  });
  
  // Legacy MCP implementation for backward compatibility
  app.post("/api/mcp/legacy-query", async (req: Request, res: Response) => {
    try {
      const {
        query,
        tags: requestedTags,
        includeRelatedTags = true,
      } = req.body;

      if (!query && !requestedTags) {
        return res
          .status(400)
          .json({ message: "Either query or tags must be provided" });
      }

      // Get all available tags first
      const allTags = await storage.getTags();

      // Determine which tags to use
      let tagsToUse: Tag[] = [];

      // If specific tags were requested by ID or name
      if (
        requestedTags &&
        Array.isArray(requestedTags) &&
        requestedTags.length > 0
      ) {
        for (const tag of requestedTags) {
          if (typeof tag === "number") {
            const tagObj = await storage.getTag(tag);
            if (tagObj) tagsToUse.push(tagObj);
          } else if (typeof tag === "string") {
            const tagObj = await storage.getTagByName(tag);
            if (tagObj) tagsToUse.push(tagObj);
          }
        }
      }

      // If there's a query and we should include related tags, find potential tag matches in the query
      if (query && typeof query === "string" && includeRelatedTags) {
        const queryLower = query.toLowerCase();

        // Find tags that might be related to the query
        const relatedTags = allTags.filter((tag) => {
          // Check if tag name appears in query
          if (queryLower.includes(tag.name.toLowerCase())) return true;

          // Check common synonyms or related terms for common categories
          const tagNameLower = tag.name.toLowerCase();

          // Travel related
          if (
            (tagNameLower === "travel" || tagNameLower === "vacation") &&
            (queryLower.includes("trip") ||
              queryLower.includes("holiday") ||
              queryLower.includes("journey") ||
              queryLower.includes("destination"))
          ) {
            return true;
          }

          // Design related
          if (
            (tagNameLower === "design" || tagNameLower === "ui") &&
            (queryLower.includes("interface") ||
              queryLower.includes("layout") ||
              queryLower.includes("visual") ||
              queryLower.includes("ux"))
          ) {
            return true;
          }

          // Color related
          if (
            tagNameLower === "color" &&
            (queryLower.includes("palette") ||
              queryLower.includes("theme") ||
              queryLower.includes("scheme") ||
              queryLower.includes("hue"))
          ) {
            return true;
          }

          return false;
        });

        // Add related tags to our list, avoiding duplicates
        for (const relatedTag of relatedTags) {
          if (!tagsToUse.some((t) => t.id === relatedTag.id)) {
            tagsToUse.push(relatedTag);
          }
        }
      }

      const tagIds = tagsToUse.map((t) => t.id);

      const results: { notes: Note[]; links: Link[] } = {
        notes: [],
        links: [],
      };

      // Get all notes and links
      const allNotes = await storage.getNotes();
      const allLinks = await storage.getLinks();

      // If we have tags to filter by
      if (tagIds.length > 0) {
        // Filter notes by tags
        for (const note of allNotes) {
          const noteTags = await storage.getNoteTagsByNoteId(note.id);
          const noteTagIds = noteTags.map((t) => t.id);

          if (tagIds.some((id) => noteTagIds.includes(id))) {
            results.notes.push(note);
          }
        }

        // Filter links by tags
        for (const link of allLinks) {
          const linkTags = await storage.getLinkTagsByLinkId(link.id);
          const linkTagIds = linkTags.map((t) => t.id);

          if (tagIds.some((id) => linkTagIds.includes(id))) {
            results.links.push(link);
          }
        }
      } else {
        // If no tags specified, include all items for text search
        results.notes = allNotes;
        results.links = allLinks;
      }

      // If there's a text query, filter results further by content
      if (query && typeof query === "string") {
        const lowerQuery = query.toLowerCase();

        // Filter notes by query term
        results.notes = results.notes.filter(
          (note) =>
            note.title.toLowerCase().includes(lowerQuery) ||
            note.content.toLowerCase().includes(lowerQuery),
        );

        // Filter links by query term
        results.links = results.links.filter(
          (link) =>
            link.title.toLowerCase().includes(lowerQuery) ||
            (link.description &&
              link.description.toLowerCase().includes(lowerQuery)) ||
            (link.summary && link.summary.toLowerCase().includes(lowerQuery)),
        );
      }

      // Get additional info for each item (tags and connections)
      const enrichedResults = {
        notes: await Promise.all(
          results.notes.map(async (note) => {
            const tags = await storage.getNoteTagsByNoteId(note.id);
            return { ...note, tags };
          }),
        ),
        links: await Promise.all(
          results.links.map(async (link) => {
            const tags = await storage.getLinkTagsByLinkId(link.id);
            return { ...link, tags };
          }),
        ),
      };

      return res.json({
        results: enrichedResults,
        meta: {
          total: enrichedResults.notes.length + enrichedResults.links.length,
          notes: enrichedResults.notes.length,
          links: enrichedResults.links.length,
          usedTags: tagsToUse,
          allTags: allTags,
        },
      });
    } catch (err) {
      handleError(err, res);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
