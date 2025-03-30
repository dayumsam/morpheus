import { load } from "cheerio";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface MetadataResult {
  title: string;
  description: string;
  content: string;
  tags?: string[];
}

export async function fetchUrlMetadata(url: string): Promise<MetadataResult> {
  try {
    // Fetch the webpage content
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MorpheusBot/1.0; +http://morpheus.com)",
      },
    });
    const html = await response.text();
    const $ = load(html);

    // Extract metadata
    const title =
      $("title").text() || $('meta[property="og:title"]').attr("content") || "";
    const description =
      $('meta[name="description"]').attr("content") ||
      $('meta[property="og:description"]').attr("content") ||
      "";

    // Extract main content
    // Remove script tags, style tags, and other non-content elements
    $("script").remove();
    $("style").remove();
    $("nav").remove();
    $("header").remove();
    $("footer").remove();
    $("aside").remove();

    // Get the main content
    const content = $("main").text() || $("article").text() || $("body").text();

    // Clean up the content
    const cleanContent = content.replace(/\s+/g, " ").trim().substring(0, 2000); // Limit content length for processing

    return {
      title,
      description,
      content: cleanContent,
    };
  } catch (error) {
    console.error("Error fetching URL metadata:", error);
    throw new Error("Failed to fetch URL metadata");
  }
}

export async function generateTagsFromContent(
  content: string,
): Promise<string[]> {
  try {
    const prompt = `Analyze the following content and suggest 3-5 relevant tags. 
    Tags should be single words or hyphenated phrases, all lowercase.
    Content: ${content.substring(0, 1000)}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that analyzes content and suggests relevant tags. Return only the tags as a comma-separated list.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const tags =
      completion.choices[0].message?.content
        ?.split(",")
        .map((tag: string) => tag.trim().toLowerCase())
        .filter((tag: string) => tag.length > 0) || [];

    return tags;
  } catch (error) {
    console.error("Error generating tags:", error);
    return [];
  }
}
