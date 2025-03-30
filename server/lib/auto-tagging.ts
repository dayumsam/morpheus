import OpenAI from "openai";
import { tags as tagsTable } from "@shared/schema";
import { db } from "../db";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracts tags from note content using AI, considering existing tags
 */
export async function generateTagsFromContent(content: string): Promise<string[]> {
  try {
    // Remove HTML tags to get just the text content
    const textContent = content.replace(/<[^>]*>/g, ' ').trim();
    
    if (!textContent) {
      return [];
    }
    
    // Get existing tags for context
    const existingTags = await db.select().from(tagsTable);
    const existingTagNames = existingTags.map(tag => tag.name);

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a tag extraction system for a knowledge graph application. 
          Your task is to analyze the provided text and suggest exactly 3 relevant tags.
          
          Here are the existing tags in the system: ${existingTagNames.join(", ")}
          
          IMPORTANT INSTRUCTIONS:
          1. Always suggest exactly 3 tags.
          2. Select two tags from the existing tags list whenever possible.
          3. Always create one new tag that captures a unique aspect of the content not covered by existing tags.
          4. The new tag should be short, concise, and descriptive.
          5. Format your response as a JSON object with a "tags" array containing your suggestions.`
        },
        {
          role: "user",
          content: textContent
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.tags || [];
  } catch (error) {
    console.error("Error generating tags from content:", error);
    return [];
  }
}

/**
 * Extracts tags from markdown content using AI, considering existing tags
 */
export async function generateTagsFromMarkdown(markdown: string): Promise<string[]> {
  try {
    if (!markdown.trim()) {
      return [];
    }
    
    // Get existing tags for context
    const existingTags = await db.select().from(tagsTable);
    const existingTagNames = existingTags.map(tag => tag.name);
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: `You are a tag extraction system for a knowledge graph application. 
          Your task is to analyze the provided markdown content and suggest exactly 3 relevant tags.
          
          Here are the existing tags in the system: ${existingTagNames.join(", ")}
          
          IMPORTANT INSTRUCTIONS:
          1. Always suggest exactly 3 tags.
          2. Select two tags from the existing tags list whenever possible.
          3. Always create one new tag that captures a unique aspect of the content not covered by existing tags.
          4. The new tag should be short, concise, and descriptive.
          5. Format your response as a JSON object with a "tags" array containing your suggestions.`
        },
        {
          role: "user",
          content: markdown
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.tags || [];
  } catch (error) {
    console.error("Error generating tags from markdown:", error);
    return [];
  }
}