/**
 * Morpheus Context Protocol (MCP) Service
 * 
 * This service provides intelligent search and retrieval of notes and links
 * based on semantic similarity and tag relevance using OpenAI's embeddings.
 */

import OpenAI from "openai";
import { storage } from "../storage";
import { Note, Tag, Link } from "@shared/schema";
import { z } from "zod";

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Schema for MCP query
export const mcpQuerySchema = z.object({
  query: z.string().min(1),
  tags: z.array(z.string()).default([]),
  limit: z.number().default(10),
});

export type MCPQuery = z.infer<typeof mcpQuerySchema>;

export type MCPSearchResult = {
  notes: (Note & { tags: Tag[]; relevanceScore: number })[];
  links: (Link & { tags: Tag[]; relevanceScore: number })[];
  suggestedTags: Tag[];
  metadata: {
    totalNotes: number;
    totalLinks: number;
    usedTags: string[];
  };
};

/**
 * Search notes and links based on semantic similarity and tags
 */
export async function searchKnowledgeBase(query: MCPQuery): Promise<MCPSearchResult> {
  try {
    // Get all available tags
    const allTags = await storage.getTags();
    
    // Filter for tags that match the query
    let matchingTags: Tag[] = [];
    
    // If specific tags were provided, use those
    if (query.tags && query.tags.length > 0) {
      for (const tagName of query.tags) {
        const tag = allTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
        if (tag) matchingTags.push(tag);
      }
    }
    
    // Get all notes and links
    const [allNotes, allLinks] = await Promise.all([
      storage.getNotes(),
      storage.getLinks(),
    ]);
    
    // Get tag information for all notes and links
    const notesWithTags = await Promise.all(
      allNotes.map(async (note) => {
        const tags = await storage.getNoteTagsByNoteId(note.id);
        return { ...note, tags };
      })
    );
    
    const linksWithTags = await Promise.all(
      allLinks.map(async (link) => {
        const tags = await storage.getLinkTagsByLinkId(link.id);
        return { ...link, tags };
      })
    );
    
    // Filter by matching tags if tags were provided
    let filteredNotes = notesWithTags;
    let filteredLinks = linksWithTags;
    
    if (matchingTags.length > 0) {
      const tagIds = matchingTags.map(tag => tag.id);
      
      filteredNotes = notesWithTags.filter(note => 
        note.tags.some(tag => tagIds.includes(tag.id))
      );
      
      filteredLinks = linksWithTags.filter(link => 
        link.tags.some(tag => tagIds.includes(tag.id))
      );
    }
    
    // Perform semantic search if we have an OpenAI API key
    if (process.env.OPENAI_API_KEY) {
      try {
        // Generate embeddings for the query
        const queryEmbedding = await generateEmbedding(query.query);
        
        // Calculate relevance scores for notes
        const notesWithScores = await Promise.all(
          filteredNotes.map(async (note) => {
            const contentToEmbed = `${note.title} ${note.content}`;
            const embedding = await generateEmbedding(contentToEmbed);
            const relevanceScore = calculateCosineSimilarity(queryEmbedding, embedding);
            return { ...note, relevanceScore };
          })
        );
        
        // Calculate relevance scores for links
        const linksWithScores = await Promise.all(
          filteredLinks.map(async (link) => {
            const contentToEmbed = `${link.title} ${link.description || ""}`;
            const embedding = await generateEmbedding(contentToEmbed);
            const relevanceScore = calculateCosineSimilarity(queryEmbedding, embedding);
            return { ...link, relevanceScore };
          })
        );
        
        // Sort by relevance score
        const sortedNotes = notesWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore);
        const sortedLinks = linksWithScores.sort((a, b) => b.relevanceScore - a.relevanceScore);
        
        // Get top N results
        const topNotes = sortedNotes.slice(0, query.limit);
        const topLinks = sortedLinks.slice(0, query.limit);
        
        // Get tag suggestions using GPT-4o
        const suggestedTags = await suggestRelevantTags(
          query.query, 
          allTags,
          [...topNotes, ...topLinks].flatMap(item => item.tags)
        );
        
        return {
          notes: topNotes,
          links: topLinks,
          suggestedTags,
          metadata: {
            totalNotes: sortedNotes.length,
            totalLinks: sortedLinks.length,
            usedTags: Array.from(
              new Set(
                [...topNotes, ...topLinks]
                  .flatMap(item => item.tags.map(tag => tag.name))
              )
            ),
          },
        };
      } catch (error) {
        console.error("Error in semantic search:", error);
        // Fall back to basic filtering if semantic search fails
      }
    }
    
    // Basic text matching fallback
    const textMatchNotes = filteredNotes
      .map(note => {
        const titleMatch = note.title.toLowerCase().includes(query.query.toLowerCase());
        const contentMatch = note.content.toLowerCase().includes(query.query.toLowerCase());
        const relevanceScore = titleMatch ? 0.8 : (contentMatch ? 0.5 : 0.1);
        return { ...note, relevanceScore };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, query.limit);
    
    const textMatchLinks = filteredLinks
      .map(link => {
        const titleMatch = link.title.toLowerCase().includes(query.query.toLowerCase());
        const descriptionMatch = link.description?.toLowerCase().includes(query.query.toLowerCase()) || false;
        const relevanceScore = titleMatch ? 0.8 : (descriptionMatch ? 0.5 : 0.1);
        return { ...link, relevanceScore };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, query.limit);
    
    // Get tag suggestions
    const topTags = await findRelevantTags(query.query, allTags);
    
    return {
      notes: textMatchNotes,
      links: textMatchLinks,
      suggestedTags: topTags,
      metadata: {
        totalNotes: filteredNotes.length,
        totalLinks: filteredLinks.length,
        usedTags: Array.from(
          new Set(
            [...textMatchNotes, ...textMatchLinks]
              .flatMap(item => item.tags.map(tag => tag.name))
          )
        ),
      },
    };
  } catch (error) {
    console.error("Error in MCP search:", error);
    throw error;
  }
}

/**
 * Generate embedding for text using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const truncatedText = text.slice(0, 8000); // OpenAI limit for embeddings
    
    const response = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: truncatedText,
    });
    
    return response.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    // Return a random embedding as fallback (not ideal but prevents complete failure)
    return Array(1536).fill(0).map(() => Math.random() * 2 - 1);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length");
  }
  
  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }
  
  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);
  
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Basic tag relevance finding without AI
 */
async function findRelevantTags(query: string, allTags: Tag[]): Promise<Tag[]> {
  const tagScores = allTags.map(tag => {
    const nameMatch = tag.name.toLowerCase().includes(query.toLowerCase());
    return {
      tag,
      score: nameMatch ? 1 : 0
    };
  });
  
  return tagScores
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.tag);
}

/**
 * Suggest relevant tags using GPT-4o
 */
async function suggestRelevantTags(query: string, allTags: Tag[], existingTags: Tag[]): Promise<Tag[]> {
  try {
    const existingTagNames = existingTags.map(t => t.name);
    const allTagNames = allTags.map(t => t.name);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        {
          role: "system",
          content: "You are a tag recommendation system that suggests the most relevant tags for a query based on available tags in the system."
        },
        {
          role: "user",
          content: `
            I'm looking for relevant tags for this query: "${query}"
            
            Here are all available tags in the system:
            ${allTagNames.join(", ")}
            
            Here are tags already associated with related content:
            ${existingTagNames.length > 0 ? existingTagNames.join(", ") : "None"}
            
            Please suggest 3-5 most relevant tags from the available tags, considering both the query context and existing tags.
            Format your response as a JSON array containing only tag names.
          `
        }
      ],
      response_format: { type: "json_object" }
    });
    
    const content = response.choices[0].message.content || "{}";
    const parsedResponse = JSON.parse(content);
    const suggestedTagNames = parsedResponse.tags || [];
    
    // Find the actual tag objects
    const suggestedTags = suggestedTagNames
      .map((name: string) => allTags.find(t => t.name.toLowerCase() === name.toLowerCase()))
      .filter(Boolean) as Tag[]; // Remove any nulls
    
    return suggestedTags;
  } catch (error) {
    console.error("Error suggesting tags:", error);
    // Fall back to basic tag matching
    return findRelevantTags(query, allTags);
  }
}