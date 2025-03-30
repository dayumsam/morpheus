import OpenAI from "openai";
import type { Note, Link } from "@shared/schema";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || 'dummy-key-for-development'
});

// Check if OpenAI API key is available
const isOpenAIAvailable = !!process.env.OPENAI_API_KEY;

/**
 * Generate a summary of a web page content using OpenAI
 */
export async function generateSummary(
  content: string,
  url: string,
  title: string,
): Promise<string> {
  if (!isOpenAIAvailable) {
    return "AI summary not available. Please provide an OpenAI API key.";
  }

  try {
    const prompt = `
    Please provide a concise summary (3-5 sentences) of the following web content. 
    Focus on the key points and main ideas.
    
    Title: ${title}
    URL: ${url}
    Content: ${content}
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 250,
    });

    return response.choices[0].message.content || "No summary generated";
  } catch (error) {
    console.error("Error generating summary:", error);
    return `Failed to generate summary: ${error.message}`;
  }
}

/**
 * Generate a daily prompt based on user's notes and links
 */
export async function generateDailyPrompt(
  notes: Note[],
  links: Link[],
): Promise<string> {
  if (!isOpenAIAvailable) {
    return "How can you connect your most recent notes and research to gain new insights?";
  }

  try {
    // Limit the number of notes and links to avoid token limits
    const recentNotes = notes.slice(0, 5).map(note => ({
      title: note.title,
      createdAt: note.createdAt
    }));
    
    const recentLinks = links.slice(0, 5).map(link => ({
      title: link.title,
      url: link.url,
      createdAt: link.createdAt
    }));

    const prompt = `
    As an AI assistant for a knowledge management system, generate a thoughtful daily prompt for the user.
    The prompt should encourage the user to reflect on their notes and saved links, make connections, 
    or explore new ideas based on their existing knowledge.
    
    Recent notes: ${JSON.stringify(recentNotes)}
    Recent links: ${JSON.stringify(recentLinks)}
    
    Generate a single, thought-provoking question that will help the user gain insights from their existing knowledge.
    The question should be specific enough to be actionable but open-ended enough to encourage creative thinking.
    
    Format the response as a single question without any additional explanations.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
      max_tokens: 100,
    });

    return response.choices[0].message.content || "What connections can you make between your recent notes and web research?";
  } catch (error) {
    console.error("Error generating daily prompt:", error);
    return "What new insights can you gain by reviewing your recent notes and saved links?";
  }
}

/**
 * Generate knowledge connections based on content similarity
 */
export async function generateConnections(
  sourceContent: string,
  sourceType: string,
  targetContents: { id: number; type: string; content: string }[]
): Promise<number[]> {
  if (!isOpenAIAvailable || targetContents.length === 0) {
    return [];
  }

  try {
    const prompt = `
    You are an AI assistant for a knowledge management system. You need to identify which of the following items are most closely related to the source item based on content similarity and conceptual connections.
    
    Source (${sourceType}): 
    ${sourceContent}
    
    Potential connections:
    ${targetContents.map((t, i) => `${i + 1}. ${t.type} (ID: ${t.id}): ${t.content}`).join('\n')}
    
    Return ONLY the IDs of the items that have strong connections to the source, in JSON format like this: {"connections": [123, 456]}
    Limit your response to the 3 most relevant connections. If there are no strong connections, return an empty array.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      temperature: 0.3,
    });

    const result = JSON.parse(response.choices[0].message.content);
    return Array.isArray(result.connections) ? result.connections : [];
  } catch (error) {
    console.error("Error generating connections:", error);
    return [];
  }
}
