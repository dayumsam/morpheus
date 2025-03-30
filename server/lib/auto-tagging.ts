import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Extracts tags from note content using AI
 */
export async function generateTagsFromContent(content: string): Promise<string[]> {
  try {
    // Remove HTML tags to get just the text content
    const textContent = content.replace(/<[^>]*>/g, ' ').trim();
    
    if (!textContent) {
      return [];
    }
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a tag extraction system. Analyze the provided text and suggest 3-5 relevant tags that would be useful for categorizing this content in a knowledge management system. Respond with just the tags in JSON format as an array of strings."
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
 * Extracts tags from markdown content using AI
 */
export async function generateTagsFromMarkdown(markdown: string): Promise<string[]> {
  try {
    if (!markdown.trim()) {
      return [];
    }
    
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o", 
      messages: [
        {
          role: "system",
          content: "You are a tag extraction system. Analyze the provided markdown content and suggest 3-5 relevant tags that would be useful for categorizing this content in a knowledge management system. Respond with just the tags in JSON format as an array of strings."
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