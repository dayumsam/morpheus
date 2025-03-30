import OpenAI from "openai";
import { InsertNote } from "@shared/schema";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/**
 * Analyze image content using OpenAI's vision capabilities
 */
export async function analyzeImage(
  base64Image: string,
  prompt: string = "Analyze this image in detail and describe its key elements, context, and any notable aspects."
): Promise<string> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      max_tokens: 500,
    });

    return visionResponse.choices[0].message.content || "No analysis could be generated.";
  } catch (error) {
    console.error("Error analyzing image:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to analyze image: ${error.message}`);
    } else {
      throw new Error(`Failed to analyze image: Unknown error`);
    }
  }
}

/**
 * Create a note from an image by analyzing its content
 */
export async function createNoteFromImage(
  base64Image: string,
  title: string = "Image Analysis"
): Promise<InsertNote> {
  try {
    const analysisContent = await analyzeImage(base64Image);
    
    // Format content with proper HTML
    const content = `<p>---</p><p>type: image-analysis</p><p>date: ${new Date().toISOString().split('T')[0]}</p><p>---</p><p></p><p>${analysisContent}</p>`;
    
    return {
      title: title,
      content: content
    };
  } catch (error) {
    console.error("Error creating note from image:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to create note from image: ${error.message}`);
    } else {
      throw new Error(`Failed to create note from image: Unknown error`);
    }
  }
}

/**
 * Extract tags from image content using AI
 */
export async function suggestTagsFromImage(
  base64Image: string
): Promise<string[]> {
  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a tag extraction system. Analyze the image and suggest 3-5 relevant tags that would be useful for categorizing this content in a knowledge management system. Respond with just the tags in JSON format as an array of strings."
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        }
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content || "{}");
    return result.tags || [];
  } catch (error) {
    console.error("Error suggesting tags from image:", error);
    return [];
  }
}