import { pgTable, text, serial, integer, timestamp, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Notes table - for storing all user notes
export const notes = pgTable("notes", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Links table - for storing saved web links
export const links = pgTable("links", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  summary: text("summary"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tags table - for organizing notes and links
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("#805AD5"),
});

// Note Tags junction table - for many-to-many relationship between notes and tags
export const noteTags = pgTable("note_tags", {
  id: serial("id").primaryKey(),
  noteId: integer("note_id").notNull().references(() => notes.id),
  tagId: integer("tag_id").notNull().references(() => tags.id),
});

// Link Tags junction table - for many-to-many relationship between links and tags
export const linkTags = pgTable("link_tags", {
  id: serial("id").primaryKey(),
  linkId: integer("link_id").notNull().references(() => links.id),
  tagId: integer("tag_id").notNull().references(() => tags.id),
});

// Connections table - for storing connections between notes and links
export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull(),
  sourceType: text("source_type").notNull(), // "note" or "link"
  targetId: integer("target_id").notNull(),
  targetType: text("target_type").notNull(), // "note" or "link"
  strength: integer("strength").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Daily prompts table - for storing daily context prompts
export const dailyPrompts = pgTable("daily_prompts", {
  id: serial("id").primaryKey(),
  prompt: text("prompt").notNull(),
  answer: text("answer"),
  date: timestamp("date").defaultNow().notNull(),
  isAnswered: boolean("is_answered").default(false).notNull(),
});

// Activity table - for tracking user activity
export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  action: text("action").notNull(), // "created_note", "saved_link", "connected_items", etc.
  entityId: integer("entity_id").notNull(),
  entityType: text("entity_type").notNull(), // "note", "link", "connection", etc.
  metadata: json("metadata"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Define insert schemas using drizzle-zod

export const insertNoteSchema = createInsertSchema(notes).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertLinkSchema = createInsertSchema(links).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
});

export const insertTagSchema = createInsertSchema(tags).omit({ 
  id: true 
});

export const insertNoteTagSchema = createInsertSchema(noteTags).omit({ 
  id: true 
});

export const insertLinkTagSchema = createInsertSchema(linkTags).omit({ 
  id: true 
});

export const insertConnectionSchema = createInsertSchema(connections).omit({ 
  id: true, 
  createdAt: true 
});

export const insertDailyPromptSchema = createInsertSchema(dailyPrompts).omit({ 
  id: true, 
  date: true, 
  isAnswered: true 
});

export const insertActivitySchema = createInsertSchema(activities).omit({ 
  id: true, 
  timestamp: true 
});

// Define types for the insert and select operations
export type InsertNote = z.infer<typeof insertNoteSchema>;
export type Note = typeof notes.$inferSelect;

export type InsertLink = z.infer<typeof insertLinkSchema>;
export type Link = typeof links.$inferSelect;

export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;

export type InsertNoteTag = z.infer<typeof insertNoteTagSchema>;
export type NoteTag = typeof noteTags.$inferSelect;

export type InsertLinkTag = z.infer<typeof insertLinkTagSchema>;
export type LinkTag = typeof linkTags.$inferSelect;

export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type Connection = typeof connections.$inferSelect;

export type InsertDailyPrompt = z.infer<typeof insertDailyPromptSchema>;
export type DailyPrompt = typeof dailyPrompts.$inferSelect;

export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
