#!/usr/bin/env node

/**
 * Morpheus Context Protocol (MCP) Server & Client
 *
 * This is a minimal standalone implementation that mocks the Morpheus knowledge base
 * for demo purposes without requiring a database connection.
 *
 * Usage:
 *   ./mcp.js server            - Run the MCP server
 *   ./mcp.js "query string"    - Query the MCP server
 */

import http from "http";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// Configure Neon database
neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Mock data for demonstration
const mockData = {
  notes: [
    {
      id: 1,
      title: "UI Design Preferences",
      content:
        "User prefers clean, minimalist interfaces with plenty of white space. Navigation should be intuitive with clear visual hierarchy.",
      tags: ["ui", "design", "preferences"],
    },
    {
      id: 2,
      title: "Color Theme Preferences",
      content:
        "User likes blue color schemes, particularly navy and sky blue combinations. Prefers dark mode for better readability.",
      tags: ["colors", "theme", "preferences"],
    },
    {
      id: 3,
      title: "Travel App Features",
      content:
        "User wants to include flight booking, hotel reservations, and local attraction recommendations. Should have offline mode for basic features.",
      tags: ["features", "travel", "app"],
    },
  ],
  links: [
    {
      id: 1,
      url: "https://dribbble.com/tags/travel_app",
      title: "Travel App Design Inspiration",
      description:
        "Collection of modern travel app designs with blue color schemes",
      tags: ["design", "inspiration", "travel"],
    },
    {
      id: 2,
      url: "https://www.color-hex.com/color-palette/12345",
      title: "Blue Color Palette",
      description: "Professional blue color combinations for travel apps",
      tags: ["colors", "palette", "design"],
    },
  ],
};

// Server configuration
const PORT = process.env.PORT || 5000;
const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === "/api/mcp/query" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const { query, tags } = JSON.parse(body);
        const results = await searchDatabase(query, tags);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(results));
      } catch (error) {
        console.error("Error processing request:", error);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Internal server error" }));
      }
    });
  } else {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  }
});

// Function to search the database
async function searchDatabase(query, tags = []) {
  console.log("Searching database with query:", query, "tags:", tags);

  try {
    // Get all tags that match the query or provided tags
    const tagQuery = `
      SELECT id, name, color 
      FROM tags 
      WHERE name ILIKE ANY($1)
    `;
    const searchTerms = tags.length > 0 ? tags : [query];
    const matchingTags = await pool.query(tagQuery, [
      searchTerms.map((t) => `%${t}%`),
    ]);

    console.log("Found matching tags:", matchingTags.rows);

    // Get notes with matching tags
    const notesQuery = `
      SELECT DISTINCT n.id, n.title, n.content, array_agg(t.name) as tags
      FROM notes n
      LEFT JOIN note_tags nt ON n.id = nt.note_id
      LEFT JOIN tags t ON nt.tag_id = t.id
      WHERE t.id = ANY($1) OR n.title ILIKE $2 OR n.content ILIKE $2
      GROUP BY n.id, n.title, n.content
    `;
    const tagIds = matchingTags.rows.map((t) => t.id);
    const notes = await pool.query(notesQuery, [tagIds, `%${query}%`]);

    console.log("Found notes:", notes.rows);

    // Get links with matching tags
    const linksQuery = `
      SELECT DISTINCT l.id, l.url, l.title, l.description, array_agg(t.name) as tags
      FROM links l
      LEFT JOIN link_tags lt ON l.id = lt.link_id
      LEFT JOIN tags t ON lt.tag_id = t.id
      WHERE t.id = ANY($1) OR l.title ILIKE $2 OR l.description ILIKE $2
      GROUP BY l.id, l.url, l.title, l.description
    `;
    const links = await pool.query(linksQuery, [tagIds, `%${query}%`]);

    console.log("Found links:", links.rows);

    return {
      notes: notes.rows.map((note) => ({
        ...note,
        tags: note.tags.filter((t) => t !== null), // Remove null tags
      })),
      links: links.rows.map((link) => ({
        ...link,
        tags: link.tags.filter((t) => t !== null), // Remove null tags
      })),
      metadata: {
        totalNotes: notes.rows.length,
        totalLinks: links.rows.length,
        usedTags: matchingTags.rows.map((t) => t.name),
      },
    };
  } catch (error) {
    console.error("Error searching database:", error);
    throw error;
  }
}

// Function to query the server
async function queryServer(query, tags = []) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: PORT,
      path: "/api/mcp/query",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.write(JSON.stringify({ query, tags }));
    req.end();
  });
}

// Function to format response for display
function formatResponse(results) {
  let output = "";

  if (results.notes.length > 0) {
    output += "\n📝 Notes:\n";
    results.notes.forEach((note) => {
      output += `\n${note.title}\n`;
      output += `${note.content}\n`;
      if (note.tags && note.tags.length > 0) {
        output += `Tags: ${note.tags.join(", ")}\n`;
      }
    });
  }

  if (results.links.length > 0) {
    output += "\n🔗 Links:\n";
    results.links.forEach((link) => {
      output += `\n${link.title}\n`;
      output += `${link.url}\n`;
      if (link.description) {
        output += `${link.description}\n`;
      }
      if (link.tags && link.tags.length > 0) {
        output += `Tags: ${link.tags.join(", ")}\n`;
      }
    });
  }

  if (results.metadata) {
    output += `\n📊 Summary: Found ${results.metadata.totalNotes} notes and ${results.metadata.totalLinks} links`;
    if (results.metadata.usedTags.length > 0) {
      output += `\n🏷️  Related tags: ${results.metadata.usedTags.join(", ")}`;
    }
  }

  return output;
}

// Main execution
if (process.argv[2] === "--server") {
  // Start server mode
  server.listen(PORT, () => {
    console.log(`MCP server running on port ${PORT}`);
  });
} else {
  // Direct query mode
  const query = process.argv[2];
  if (!query) {
    console.log("Usage:");
    console.log("  Start server: ./mcp.js --server");
    console.log('  Query knowledge: ./mcp.js "your query"');
    process.exit(1);
  }

  // Extract tags from query if present (format: query #tag1 #tag2)
  const tagMatches = query.match(/#\w+/g) || [];
  const tags = tagMatches.map((tag) => tag.slice(1));
  const cleanQuery = query.replace(/#\w+/g, "").trim();

  console.log("Querying knowledge base...");
  queryServer(cleanQuery, tags)
    .then((results) => {
      if (results.notes.length === 0 && results.links.length === 0) {
        console.log("No relevant knowledge found for query:", cleanQuery);
        process.exit(1);
      }
      console.log(formatResponse(results));
    })
    .catch((error) => {
      console.error("Error:", error.message);
      process.exit(1);
    });
}
