import * as cheerio from "cheerio";

/**
 * Extract metadata from a webpage using Cheerio
 */
export async function processLink(url: string): Promise<{
  title: string;
  description?: string;
  thumbnailUrl?: string;
  content?: string;
}> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch URL: ${response.status} ${response.statusText}`,
      );
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract title
    let title =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text();

    // Extract description
    let description =
      $('meta[property="og:description"]').attr("content") ||
      $('meta[name="twitter:description"]').attr("content") ||
      $('meta[name="description"]').attr("content");

    // Extract thumbnail image
    let thumbnailUrl =
      $('meta[property="og:image"]').attr("content") ||
      $('meta[name="twitter:image"]').attr("content");

    // Clean up the title if necessary
    title = title ? title.trim() : "Untitled Page";

    // Remove newlines from description
    if (description) {
      description = description.replace(/\n/g, " ").trim();
    }

    // Ensure thumbnail URL is absolute
    if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
      const urlObj = new URL(url);
      if (thumbnailUrl.startsWith("/")) {
        thumbnailUrl = `${urlObj.protocol}//${urlObj.host}${thumbnailUrl}`;
      } else {
        thumbnailUrl = `${urlObj.protocol}//${urlObj.host}/${thumbnailUrl}`;
      }
    }

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
      thumbnailUrl,
      content: cleanContent,
    };
  } catch (error) {
    console.error(`Error processing link ${url}:`, error);
    throw error;
  }
}

/**
 * Extract the main content from a webpage
 */
export function extractMainContent(html: string): string {
  const $ = cheerio.load(html);

  // Remove scripts, styles, and other non-content elements
  $("script, style, nav, header, footer, iframe, noscript").remove();

  // Try to find main content container
  const mainSelectors = [
    "article",
    '[role="main"]',
    "main",
    ".main-content",
    ".post-content",
    ".entry-content",
    ".content",
    "#content",
  ];

  let mainContent = "";

  // Try each selector until we find content
  for (const selector of mainSelectors) {
    const element = $(selector);
    if (element.length) {
      mainContent = element.text();
      if (mainContent.length > 250) {
        break;
      }
    }
  }

  // If no main content container found, use body
  if (!mainContent || mainContent.length < 250) {
    mainContent = $("body").text();
  }

  // Clean up the content
  return mainContent.replace(/\s+/g, " ").trim().substring(0, 5000);
}
