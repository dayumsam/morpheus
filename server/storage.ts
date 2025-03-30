import {
  notes,
  links,
  tags,
  noteTags,
  linkTags,
  connections,
  dailyPrompts,
  activities,
  type Note,
  type InsertNote,
  type Link,
  type InsertLink,
  type Tag,
  type InsertTag,
  type Connection,
  type InsertConnection,
  type DailyPrompt,
  type InsertDailyPrompt,
  type Activity,
  type InsertActivity,
  type NoteTag,
  type InsertNoteTag,
  type LinkTag,
  type InsertLinkTag,
} from "@shared/schema";
import { db } from "./db";
import { and, asc, desc, eq, or, sql } from "drizzle-orm";

export interface IStorage {
  // Notes
  getNotes(): Promise<Note[]>;
  getNote(id: number): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: number): Promise<boolean>;

  // Links
  getLinks(): Promise<Link[]>;
  getLink(id: number): Promise<Link | undefined>;
  getLinkByUrl(url: string): Promise<Link | undefined>;
  createLink(link: InsertLink): Promise<Link>;
  updateLink(id: number, link: Partial<InsertLink>): Promise<Link | undefined>;
  deleteLink(id: number): Promise<boolean>;

  // Tags
  getTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  getTagByName(name: string): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  updateTag(id: number, tag: Partial<InsertTag>): Promise<Tag | undefined>;
  deleteTag(id: number): Promise<boolean>;

  // Note Tags
  getNoteTagsByNoteId(noteId: number): Promise<Tag[]>;
  getNoteTagsByTagId(tagId: number): Promise<Note[]>;
  addTagToNote(noteId: number, tagId: number): Promise<NoteTag>;
  removeTagFromNote(noteId: number, tagId: number): Promise<boolean>;

  // Link Tags
  getLinkTagsByLinkId(linkId: number): Promise<Tag[]>;
  getLinkTagsByTagId(tagId: number): Promise<Link[]>;
  addTagToLink(linkId: number, tagId: number): Promise<LinkTag>;
  removeTagFromLink(linkId: number, tagId: number): Promise<boolean>;

  // Connections
  getConnections(): Promise<Connection[]>;
  getConnection(id: number): Promise<Connection | undefined>;
  getConnectionsBySourceId(
    sourceId: number,
    sourceType: string,
  ): Promise<Connection[]>;
  getConnectionsByTargetId(
    targetId: number,
    targetType: string,
  ): Promise<Connection[]>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(
    id: number,
    connection: Partial<InsertConnection>,
  ): Promise<Connection | undefined>;
  deleteConnection(id: number): Promise<boolean>;

  // Daily Prompts
  getDailyPrompts(): Promise<DailyPrompt[]>;
  getDailyPrompt(id: number): Promise<DailyPrompt | undefined>;
  getLatestDailyPrompt(): Promise<DailyPrompt | undefined>;
  createDailyPrompt(prompt: InsertDailyPrompt): Promise<DailyPrompt>;
  updateDailyPrompt(
    id: number,
    prompt: Partial<DailyPrompt>,
  ): Promise<DailyPrompt | undefined>;
  deleteDailyPrompt(id: number): Promise<boolean>;

  // Activities
  getActivities(limit?: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  deleteActivity(id: number): Promise<boolean>;

  // Graph Data
  getGraphData(): Promise<{ nodes: any[]; links: any[] }>;
}

export class MemStorage implements IStorage {
  private notes: Map<number, Note>;
  private links: Map<number, Link>;
  private tags: Map<number, Tag>;
  private noteTags: Map<number, NoteTag>;
  private linkTags: Map<number, LinkTag>;
  private connections: Map<number, Connection>;
  private dailyPrompts: Map<number, DailyPrompt>;
  private activities: Map<number, Activity>;

  private noteCurrentId: number;
  private linkCurrentId: number;
  private tagCurrentId: number;
  private noteTagCurrentId: number;
  private linkTagCurrentId: number;
  private connectionCurrentId: number;
  private dailyPromptCurrentId: number;
  private activityCurrentId: number;

  constructor() {
    this.notes = new Map();
    this.links = new Map();
    this.tags = new Map();
    this.noteTags = new Map();
    this.linkTags = new Map();
    this.connections = new Map();
    this.dailyPrompts = new Map();
    this.activities = new Map();

    this.noteCurrentId = 1;
    this.linkCurrentId = 1;
    this.tagCurrentId = 1;
    this.noteTagCurrentId = 1;
    this.linkTagCurrentId = 1;
    this.connectionCurrentId = 1;
    this.dailyPromptCurrentId = 1;
    this.activityCurrentId = 1;

    // Add some default tags
    this.createTag({ name: "Research", color: "#805AD5" });
    this.createTag({ name: "Projects", color: "#48BB78" });
    this.createTag({ name: "Ideas", color: "#F56565" });
    this.createTag({ name: "Reading List", color: "#ECC94B" });
  }

  // Notes
  async getNotes(): Promise<Note[]> {
    return Array.from(this.notes.values()).sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }

  async getNote(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const id = this.noteCurrentId++;
    const now = new Date();
    const newNote: Note = {
      ...note,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.notes.set(id, newNote);

    // Create activity for note creation
    this.createActivity({
      action: "created_note",
      entityId: id,
      entityType: "note",
      metadata: { title: note.title },
    });

    return newNote;
  }

  async updateNote(
    id: number,
    note: Partial<InsertNote>,
  ): Promise<Note | undefined> {
    const existingNote = this.notes.get(id);
    if (!existingNote) return undefined;

    const updatedNote: Note = {
      ...existingNote,
      ...note,
      updatedAt: new Date(),
    };
    this.notes.set(id, updatedNote);

    // Create activity for note update
    this.createActivity({
      action: "updated_note",
      entityId: id,
      entityType: "note",
      metadata: { title: updatedNote.title },
    });

    return updatedNote;
  }

  async deleteNote(id: number): Promise<boolean> {
    const deleted = this.notes.delete(id);

    if (deleted) {
      // Delete all note tags
      const noteTagsToDelete = Array.from(this.noteTags.values()).filter(
        (nt) => nt.noteId === id,
      );

      for (const noteTag of noteTagsToDelete) {
        this.noteTags.delete(noteTag.id);
      }

      // Delete all connections
      const connectionsToDelete = Array.from(this.connections.values()).filter(
        (conn) =>
          (conn.sourceId === id && conn.sourceType === "note") ||
          (conn.targetId === id && conn.targetType === "note"),
      );

      for (const connection of connectionsToDelete) {
        this.connections.delete(connection.id);
      }

      // Create activity for note deletion
      this.createActivity({
        action: "deleted_note",
        entityId: id,
        entityType: "note",
        metadata: {},
      });
    }

    return deleted;
  }

  // Links
  async getLinks(): Promise<Link[]> {
    return Array.from(this.links.values()).sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  async getLink(id: number): Promise<Link | undefined> {
    return this.links.get(id);
  }

  async getLinkByUrl(url: string): Promise<Link | undefined> {
    return Array.from(this.links.values()).find((link) => link.url === url);
  }

  async createLink(link: InsertLink): Promise<Link> {
    const id = this.linkCurrentId++;
    const now = new Date();
    const newLink: Link = {
      ...link,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.links.set(id, newLink);

    // Create activity for link creation
    this.createActivity({
      action: "saved_link",
      entityId: id,
      entityType: "link",
      metadata: { title: link.title, url: link.url },
    });

    return newLink;
  }

  async updateLink(
    id: number,
    link: Partial<InsertLink>,
  ): Promise<Link | undefined> {
    const existingLink = this.links.get(id);
    if (!existingLink) return undefined;

    const updatedLink: Link = {
      ...existingLink,
      ...link,
      updatedAt: new Date(),
    };
    this.links.set(id, updatedLink);

    // Create activity for link update
    this.createActivity({
      action: "updated_link",
      entityId: id,
      entityType: "link",
      metadata: { title: updatedLink.title },
    });

    return updatedLink;
  }

  async deleteLink(id: number): Promise<boolean> {
    const deleted = this.links.delete(id);

    if (deleted) {
      // Delete all link tags
      const linkTagsToDelete = Array.from(this.linkTags.values()).filter(
        (lt) => lt.linkId === id,
      );

      for (const linkTag of linkTagsToDelete) {
        this.linkTags.delete(linkTag.id);
      }

      // Delete all connections
      const connectionsToDelete = Array.from(this.connections.values()).filter(
        (conn) =>
          (conn.sourceId === id && conn.sourceType === "link") ||
          (conn.targetId === id && conn.targetType === "link"),
      );

      for (const connection of connectionsToDelete) {
        this.connections.delete(connection.id);
      }

      // Create activity for link deletion
      this.createActivity({
        action: "deleted_link",
        entityId: id,
        entityType: "link",
        metadata: {},
      });
    }

    return deleted;
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  async getTag(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    return Array.from(this.tags.values()).find((tag) => tag.name === name);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const id = this.tagCurrentId++;
    const newTag: Tag = { ...tag, id };
    this.tags.set(id, newTag);
    return newTag;
  }

  async updateTag(
    id: number,
    tag: Partial<InsertTag>,
  ): Promise<Tag | undefined> {
    const existingTag = this.tags.get(id);
    if (!existingTag) return undefined;

    const updatedTag: Tag = { ...existingTag, ...tag };
    this.tags.set(id, updatedTag);
    return updatedTag;
  }

  async deleteTag(id: number): Promise<boolean> {
    const deleted = this.tags.delete(id);

    if (deleted) {
      // Delete all note tags
      const noteTagsToDelete = Array.from(this.noteTags.values()).filter(
        (nt) => nt.tagId === id,
      );

      for (const noteTag of noteTagsToDelete) {
        this.noteTags.delete(noteTag.id);
      }

      // Delete all link tags
      const linkTagsToDelete = Array.from(this.linkTags.values()).filter(
        (lt) => lt.tagId === id,
      );

      for (const linkTag of linkTagsToDelete) {
        this.linkTags.delete(linkTag.id);
      }
    }

    return deleted;
  }

  // Note Tags
  async getNoteTagsByNoteId(noteId: number): Promise<Tag[]> {
    try {
      const result = await db
        .select()
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(eq(noteTags.noteId, noteId));

      return result.map((row) => ({
        id: row.tags.id,
        name: row.tags.name,
        color: row.tags.color || "#000000",
      }));
    } catch (error) {
      console.error(`Error getting tags for note with id ${noteId}:`, error);
      return [];
    }
  }

  async getNoteTagsByTagId(tagId: number): Promise<Note[]> {
    try {
      const result = await db
        .select()
        .from(notes)
        .innerJoin(noteTags, eq(notes.id, noteTags.noteId))
        .where(eq(noteTags.tagId, tagId))
        .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
        .leftJoin(tags, eq(noteTags.tagId, tags.id));

      // Group notes and their tags
      const notesMap = new Map<number, Note & { tags: Tag[] }>();

      result.forEach((row) => {
        if (!row.notes) return;

        if (!notesMap.has(row.notes.id)) {
          notesMap.set(row.notes.id, {
            ...row.notes,
            tags: [],
          });
        }

        if (row.tags) {
          const noteWithTags = notesMap.get(row.notes.id)!;
          // Check if this tag is already in the tags array
          if (!noteWithTags.tags.some((t) => t.id === row.tags!.id)) {
            noteWithTags.tags.push(row.tags);
          }
        }
      });

      return Array.from(notesMap.values());
    } catch (error) {
      console.error(`Error getting notes for tag with id ${tagId}:`, error);
      return [];
    }
  }

  async addTagToNote(noteId: number, tagId: number): Promise<NoteTag> {
    // Check if tag is already assigned to note
    const existing = Array.from(this.noteTags.values()).find(
      (nt) => nt.noteId === noteId && nt.tagId === tagId,
    );

    if (existing) return existing;

    const id = this.noteTagCurrentId++;
    const noteTag: NoteTag = { id, noteId, tagId };
    this.noteTags.set(id, noteTag);
    return noteTag;
  }

  async removeTagFromNote(noteId: number, tagId: number): Promise<boolean> {
    const noteTagToDelete = Array.from(this.noteTags.values()).find(
      (nt) => nt.noteId === noteId && nt.tagId === tagId,
    );

    if (noteTagToDelete) {
      return this.noteTags.delete(noteTagToDelete.id);
    }

    return false;
  }

  // Link Tags
  async getLinkTagsByLinkId(linkId: number): Promise<Tag[]> {
    const linkTagIds = Array.from(this.linkTags.values())
      .filter((lt) => lt.linkId === linkId)
      .map((lt) => lt.tagId);

    return Array.from(this.tags.values()).filter((tag) =>
      linkTagIds.includes(tag.id),
    );
  }

  async getLinkTagsByTagId(tagId: number): Promise<Link[]> {
    const linkIds = Array.from(this.linkTags.values())
      .filter((lt) => lt.tagId === tagId)
      .map((lt) => lt.linkId);

    return Array.from(this.links.values()).filter((link) =>
      linkIds.includes(link.id),
    );
  }

  async addTagToLink(linkId: number, tagId: number): Promise<LinkTag> {
    // Check if tag is already assigned to link
    const existing = Array.from(this.linkTags.values()).find(
      (lt) => lt.linkId === linkId && lt.tagId === tagId,
    );

    if (existing) return existing;

    const id = this.linkTagCurrentId++;
    const linkTag: LinkTag = { id, linkId, tagId };
    this.linkTags.set(id, linkTag);
    return linkTag;
  }

  async removeTagFromLink(linkId: number, tagId: number): Promise<boolean> {
    const linkTagToDelete = Array.from(this.linkTags.values()).find(
      (lt) => lt.linkId === linkId && lt.tagId === tagId,
    );

    if (linkTagToDelete) {
      return this.linkTags.delete(linkTagToDelete.id);
    }

    return false;
  }

  // Connections
  async getConnections(): Promise<Connection[]> {
    return Array.from(this.connections.values());
  }

  async getConnection(id: number): Promise<Connection | undefined> {
    return this.connections.get(id);
  }

  async getConnectionsBySourceId(
    sourceId: number,
    sourceType: string,
  ): Promise<Connection[]> {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.sourceId === sourceId && conn.sourceType === sourceType,
    );
  }

  async getConnectionsByTargetId(
    targetId: number,
    targetType: string,
  ): Promise<Connection[]> {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.targetId === targetId && conn.targetType === targetType,
    );
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    // Check if connection already exists
    const existing = Array.from(this.connections.values()).find(
      (conn) =>
        conn.sourceId === connection.sourceId &&
        conn.sourceType === connection.sourceType &&
        conn.targetId === connection.targetId &&
        conn.targetType === connection.targetType,
    );

    if (existing) {
      // Increase strength if it exists
      const updatedConn = {
        ...existing,
        strength: existing.strength + 1,
      };
      this.connections.set(existing.id, updatedConn);
      return updatedConn;
    }

    const id = this.connectionCurrentId++;
    const now = new Date();
    const newConnection: Connection = {
      ...connection,
      id,
      createdAt: now,
    };
    this.connections.set(id, newConnection);

    // Create activity for connection creation
    this.createActivity({
      action: "created_connection",
      entityId: id,
      entityType: "connection",
      metadata: {
        sourceId: connection.sourceId,
        sourceType: connection.sourceType,
        targetId: connection.targetId,
        targetType: connection.targetType,
      },
    });

    return newConnection;
  }

  async updateConnection(
    id: number,
    connection: Partial<InsertConnection>,
  ): Promise<Connection | undefined> {
    const existingConnection = this.connections.get(id);
    if (!existingConnection) return undefined;

    const updatedConnection: Connection = {
      ...existingConnection,
      ...connection,
    };
    this.connections.set(id, updatedConnection);
    return updatedConnection;
  }

  async deleteConnection(id: number): Promise<boolean> {
    return this.connections.delete(id);
  }

  // Daily Prompts
  async getDailyPrompts(): Promise<DailyPrompt[]> {
    return Array.from(this.dailyPrompts.values()).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async getDailyPrompt(id: number): Promise<DailyPrompt | undefined> {
    return this.dailyPrompts.get(id);
  }

  async getLatestDailyPrompt(): Promise<DailyPrompt | undefined> {
    const prompts = await this.getDailyPrompts();
    return prompts.length > 0 ? prompts[0] : undefined;
  }

  async createDailyPrompt(prompt: InsertDailyPrompt): Promise<DailyPrompt> {
    const id = this.dailyPromptCurrentId++;
    const now = new Date();
    const newPrompt: DailyPrompt = {
      ...prompt,
      id,
      date: now,
      isAnswered: false,
    };
    this.dailyPrompts.set(id, newPrompt);
    return newPrompt;
  }

  async updateDailyPrompt(
    id: number,
    prompt: Partial<DailyPrompt>,
  ): Promise<DailyPrompt | undefined> {
    const existingPrompt = this.dailyPrompts.get(id);
    if (!existingPrompt) return undefined;

    const updatedPrompt: DailyPrompt = {
      ...existingPrompt,
      ...prompt,
    };
    this.dailyPrompts.set(id, updatedPrompt);

    // If the prompt was answered, create an activity
    if (prompt.isAnswered && !existingPrompt.isAnswered) {
      this.createActivity({
        action: "answered_prompt",
        entityId: id,
        entityType: "daily_prompt",
        metadata: { prompt: existingPrompt.prompt },
      });
    }

    return updatedPrompt;
  }

  async deleteDailyPrompt(id: number): Promise<boolean> {
    return this.dailyPrompts.delete(id);
  }

  // Activities
  async getActivities(limit?: number): Promise<Activity[]> {
    const activities = Array.from(this.activities.values()).sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );

    return limit ? activities.slice(0, limit) : activities;
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    return this.activities.get(id);
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    const id = this.activityCurrentId++;
    const now = new Date();
    const newActivity: Activity = {
      ...activity,
      id,
      timestamp: now,
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Graph Data
  async getGraphData(): Promise<{ nodes: any[]; links: any[] }> {
    const nodes: any[] = [];
    const links: any[] = [];

    // Add notes as nodes
    const allNotes = await this.getNotes();
    for (const note of allNotes) {
      const noteTags = await this.getNoteTagsByNoteId(note.id);
      const tags = noteTags.map((tag) => ({ id: tag.id, name: tag.name }));

      nodes.push({
        id: `note-${note.id}`,
        type: "note",
        title: note.title,
        tags,
        createdAt: note.createdAt,
      });
    }

    // Add links as nodes
    const allLinks = await this.getLinks();
    for (const link of allLinks) {
      const linkTags = await this.getLinkTagsByLinkId(link.id);
      const tags = linkTags.map((tag) => ({ id: tag.id, name: tag.name }));

      nodes.push({
        id: `link-${link.id}`,
        type: "link",
        title: link.title,
        url: link.url,
        tags,
        createdAt: link.createdAt,
      });
    }

    // Add connections as links
    const allConnections = await this.getConnections();
    for (const connection of allConnections) {
      graphLinks.push({
        source: `${connection.sourceType}-${connection.sourceId}`,
        target: `${connection.targetType}-${connection.targetId}`,
        strength: connection.strength,
      });
    }

    return { nodes, links };
  }
}

export class DatabaseStorage implements IStorage {
  // Notes
  async getNotes(): Promise<Note[]> {
    try {
      const result = await db
        .select({
          notes: notes,
          tags: tags,
        })
        .from(notes)
        .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
        .leftJoin(tags, eq(noteTags.tagId, tags.id))
        .orderBy(desc(notes.updatedAt));

      // Group the results by note ID and collect the tags
      const noteMap = new Map<number, Note & { tags: Tag[] }>();

      result.forEach((row) => {
        if (!row.notes) return;

        if (!noteMap.has(row.notes.id)) {
          noteMap.set(row.notes.id, {
            ...row.notes,
            tags: [],
          });
        }

        if (row.tags) {
          const noteWithTags = noteMap.get(row.notes.id)!;
          // Check if this tag is already in the tags array
          if (!noteWithTags.tags.some((t) => t.id === row.tags!.id)) {
            noteWithTags.tags.push(row.tags);
          }
        }
      });

      return Array.from(noteMap.values());
    } catch (error) {
      console.error("Error getting notes:", error);
      return [];
    }
  }

  async getNote(id: number): Promise<Note | undefined> {
    try {
      console.log(`Fetching note with id ${id}`);

      // First, get the note
      const [noteResult] = await db
        .select()
        .from(notes)
        .where(eq(notes.id, id));

      if (!noteResult) {
        console.log(`Note with id ${id} not found`);
        return undefined;
      }

      console.log(`Found note with id ${id}:`, noteResult);

      // Then, get tags for this note
      const tagResults = await db
        .select({
          tag: tags,
        })
        .from(noteTags)
        .leftJoin(tags, eq(noteTags.tagId, tags.id))
        .where(eq(noteTags.noteId, id));

      console.log(`Found ${tagResults.length} tags for note ${id}`);

      // Extract unique tags
      const noteTagsList: Tag[] = [];
      tagResults.forEach((row) => {
        if (row.tag && !noteTagsList.some((t) => t.id === row.tag.id)) {
          noteTagsList.push(row.tag);
        }
      });

      console.log(`Returning note with ${noteTagsList.length} tags`);

      return {
        ...noteResult,
        tags: noteTagsList,
      };
    } catch (error) {
      console.error(`Error getting note with id ${id}:`, error);
      return undefined;
    }
  }

  async createNote(note: InsertNote): Promise<Note> {
    try {
      const [newNote] = await db
        .insert(notes)
        .values({
          title: note.title,
          content: note.content,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Add tags if provided
      const tags: Tag[] = [];
      if (note.tags && note.tags.length > 0) {
        for (const tagId of note.tags) {
          // Check if tag exists
          const [tag] = await db
            .select()
            .from(tags)
            .where(eq(tags.id, tagId))
            .limit(1);

          if (tag) {
            // Add tag to note
            await db.insert(noteTags).values({
              noteId: newNote.id,
              tagId,
            });

            tags.push(tag);
          }
        }
      }

      // Create activity for note creation
      this.createActivity({
        action: "created_note",
        entityId: newNote.id,
        entityType: "note",
        metadata: { title: note.title },
      });

      return {
        ...newNote,
        tags,
      };
    } catch (error) {
      console.error("Error creating note:", error);
      throw error;
    }
  }

  async updateNote(
    id: number,
    note: Partial<InsertNote>,
  ): Promise<Note | undefined> {
    try {
      // Get existing note
      const [existingNote] = await db
        .select()
        .from(notes)
        .where(eq(notes.id, id))
        .limit(1);

      if (!existingNote) return undefined;

      // Create update data without tags field (handled separately)
      const { tags: tagIds, ...updateData } = note;

      // Update note
      const [updatedNote] = await db
        .update(notes)
        .set({
          ...updateData,
          updatedAt: new Date(),
        })
        .where(eq(notes.id, id))
        .returning();

      // Update tags if provided
      let tagsList: Tag[] = [];
      if (tagIds !== undefined) {
        // Delete existing note-tag relationships
        await db.delete(noteTags).where(eq(noteTags.noteId, id));

        // Add new note-tag relationships
        for (const tagId of tagIds) {
          const [tag] = await db
            .select()
            .from(tags)
            .where(eq(tags.id, tagId))
            .limit(1);

          if (tag) {
            await db.insert(noteTags).values({
              noteId: id,
              tagId,
            });

            tagsList.push(tag);
          }
        }
      } else {
        // Get current note tags
        const tagsResult = await db
          .select()
          .from(tags)
          .innerJoin(noteTags, eq(tags.id, noteTags.tagId))
          .where(eq(noteTags.noteId, id));

        tagsList = tagsResult.map((row) => row.tags);
      }

      // Create activity for note update
      this.createActivity({
        action: "updated_note",
        entityId: id,
        entityType: "note",
        metadata: { title: updatedNote.title },
      });

      return {
        ...updatedNote,
        tags: tagsList,
      };
    } catch (error) {
      console.error(`Error updating note with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteNote(id: number): Promise<boolean> {
    try {
      // Delete note-tag relationships
      await db.delete(noteTags).where(eq(noteTags.noteId, id));

      // Delete connections
      await db
        .delete(connections)
        .where(
          or(
            and(
              eq(connections.sourceId, id),
              eq(connections.sourceType, "note"),
            ),
            and(
              eq(connections.targetId, id),
              eq(connections.targetType, "note"),
            ),
          ),
        );

      // Delete note
      const result = await db.delete(notes).where(eq(notes.id, id)).returning();

      if (result.length > 0) {
        // Create activity for note deletion
        this.createActivity({
          action: "deleted_note",
          entityId: id,
          entityType: "note",
          metadata: {},
        });
      }

      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting note with id ${id}:`, error);
      return false;
    }
  }

  // Links
  async getLinks(): Promise<Link[]> {
    try {
      const result = await db
        .select({
          id: links.id,
          title: links.title,
          url: links.url,
          createdAt: links.createdAt,
          updatedAt: links.updatedAt,
          description: links.description,
          summary: links.summary,
          thumbnailUrl: links.thumbnailUrl,
        })
        .from(links);

      return result.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        createdAt: link.createdAt,
        updatedAt: link.updatedAt,
        description: link.description ?? null,
        summary: link.summary ?? null,
        thumbnailUrl: link.thumbnailUrl ?? null,
      }));
    } catch (error) {
      console.error("Error getting links:", error);
      return [];
    }
  }

  async getLink(id: number): Promise<Link | undefined> {
    try {
      const result = await db
        .select()
        .from(links)
        .leftJoin(linkTags, eq(links.id, linkTags.linkId))
        .leftJoin(tags, eq(linkTags.tagId, tags.id))
        .where(eq(links.id, id));

      if (result.length === 0) return undefined;

      const link = result[0].links;
      if (!link) return undefined;

      const linkTags: Tag[] = [];
      result.forEach((row) => {
        if (row.tags) {
          // Check if this tag is already in the tags array
          if (!linkTags.some((t) => t.id === row.tags!.id)) {
            linkTags.push(row.tags);
          }
        }
      });

      return {
        ...link,
        tags: linkTags,
      };
    } catch (error) {
      console.error(`Error getting link with id ${id}:`, error);
      return undefined;
    }
  }

  async getLinkByUrl(url: string): Promise<Link | undefined> {
    try {
      const [link] = await db
        .select()
        .from(links)
        .where(eq(links.url, url))
        .limit(1);

      if (!link) return undefined;

      return this.getLink(link.id);
    } catch (error) {
      console.error(`Error getting link by URL ${url}:`, error);
      return undefined;
    }
  }

  async createLink(link: InsertLink): Promise<Link> {
    try {
      const [newLink] = await db
        .insert(links)
        .values({
          title: link.title,
          url: link.url,
          description: link.description,
          imageUrl: link.imageUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      // Add tags if provided
      const linkTags: Tag[] = [];
      if (link.tags && link.tags.length > 0) {
        for (const tagId of link.tags) {
          const [tag] = await db
            .select()
            .from(tags)
            .where(eq(tags.id, tagId))
            .limit(1);

          if (tag) {
            await db.insert(linkTags).values({
              linkId: newLink.id,
              tagId,
            });

            linkTags.push(tag);
          }
        }
      }

      // Create activity for link creation
      this.createActivity({
        action: "saved_link",
        entityId: newLink.id,
        entityType: "link",
        metadata: { title: link.title, url: link.url },
      });

      return {
        ...newLink,
        tags: linkTags,
      };
    } catch (error) {
      console.error("Error creating link:", error);
      throw error;
    }
  }

  async updateLink(
    id: number,
    link: Partial<InsertLink>,
  ): Promise<Link | undefined> {
    try {
      // Get existing link
      const [existingLink] = await db
        .select()
        .from(links)
        .where(eq(links.id, id))
        .limit(1);

      if (!existingLink) return undefined;

      // Update link
      const [updatedLink] = await db
        .update(links)
        .set({
          ...link,
          updatedAt: new Date(),
        })
        .where(eq(links.id, id))
        .returning();

      // Update tags if provided
      let linkTagList: Tag[] = [];
      if (link.tags !== undefined) {
        // Delete existing link-tag relationships
        await db.delete(linkTags).where(eq(linkTags.linkId, id));

        // Add new link-tag relationships
        for (const tagId of link.tags) {
          const [tag] = await db
            .select()
            .from(tags)
            .where(eq(tags.id, tagId))
            .limit(1);

          if (tag) {
            await db.insert(linkTags).values({
              linkId: id,
              tagId,
            });

            linkTagList.push(tag);
          }
        }
      } else {
        // Get current link tags
        const tagsResult = await db
          .select()
          .from(tags)
          .innerJoin(linkTags, eq(tags.id, linkTags.tagId))
          .where(eq(linkTags.linkId, id));

        linkTagList = tagsResult.map((row) => row.tags);
      }

      // Create activity for link update
      this.createActivity({
        action: "updated_link",
        entityId: id,
        entityType: "link",
        metadata: { title: updatedLink.title },
      });

      return {
        ...updatedLink,
        tags: linkTagList,
      };
    } catch (error) {
      console.error(`Error updating link with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteLink(id: number): Promise<boolean> {
    try {
      // Delete link-tag relationships
      await db.delete(linkTags).where(eq(linkTags.linkId, id));

      // Delete connections
      await db
        .delete(connections)
        .where(
          or(
            and(
              eq(connections.sourceId, id),
              eq(connections.sourceType, "link"),
            ),
            and(
              eq(connections.targetId, id),
              eq(connections.targetType, "link"),
            ),
          ),
        );

      // Delete link
      const result = await db.delete(links).where(eq(links.id, id)).returning();

      if (result.length > 0) {
        // Create activity for link deletion
        this.createActivity({
          action: "deleted_link",
          entityId: id,
          entityType: "link",
          metadata: {},
        });
      }

      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting link with id ${id}:`, error);
      return false;
    }
  }

  // Tags
  async getTags(): Promise<Tag[]> {
    try {
      const result = await db
        .select({
          tag: tags,
          count: sql<number>`count(${noteTags.id})::int`,
        })
        .from(tags)
        .leftJoin(noteTags, eq(tags.id, noteTags.tagId))
        .groupBy(tags.id);

      return result.map((row) => ({
        id: row.tag.id,
        name: row.tag.name,
        color: row.tag.color || "#000000",
        count: row.count,
      }));
    } catch (error) {
      console.error("Error getting tags:", error);
      return [];
    }
  }

  async getTag(id: number): Promise<Tag | undefined> {
    try {
      const [tag] = await db
        .select()
        .from(tags)
        .where(eq(tags.id, id))
        .limit(1);

      return tag;
    } catch (error) {
      console.error(`Error getting tag with id ${id}:`, error);
      return undefined;
    }
  }

  async getTagByName(name: string): Promise<Tag | undefined> {
    try {
      const [tag] = await db
        .select()
        .from(tags)
        .where(sql`lower(${tags.name}) = lower(${name})`)
        .limit(1);

      return tag;
    } catch (error) {
      console.error(`Error getting tag by name ${name}:`, error);
      return undefined;
    }
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    try {
      const [newTag] = await db
        .insert(tags)
        .values({
          name: tag.name,
          color: tag.color,
        })
        .returning();

      return newTag;
    } catch (error) {
      console.error("Error creating tag:", error);
      throw error;
    }
  }

  async updateTag(
    id: number,
    tag: Partial<InsertTag>,
  ): Promise<Tag | undefined> {
    try {
      const [updatedTag] = await db
        .update(tags)
        .set(tag)
        .where(eq(tags.id, id))
        .returning();

      return updatedTag;
    } catch (error) {
      console.error(`Error updating tag with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteTag(id: number): Promise<boolean> {
    try {
      // First check if tag exists
      const existingTag = await this.getTag(id);
      if (!existingTag) {
        return false;
      }

      // Delete note-tag relationships
      await db.delete(noteTags).where(eq(noteTags.tagId, id));

      // Delete link-tag relationships
      await db.delete(linkTags).where(eq(linkTags.tagId, id));

      // Delete tag
      const result = await db.delete(tags).where(eq(tags.id, id)).returning();

      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting tag with id ${id}:`, error);
      return false;
    }
  }

  // Note Tags
  async getNoteTagsByNoteId(noteId: number): Promise<Tag[]> {
    try {
      const result = await db
        .select()
        .from(noteTags)
        .innerJoin(tags, eq(noteTags.tagId, tags.id))
        .where(eq(noteTags.noteId, noteId));

      return result.map((row) => ({
        id: row.tags.id,
        name: row.tags.name,
        color: row.tags.color || "#000000",
      }));
    } catch (error) {
      console.error(`Error getting tags for note with id ${noteId}:`, error);
      return [];
    }
  }

  async getNoteTagsByTagId(tagId: number): Promise<Note[]> {
    try {
      const result = await db
        .select()
        .from(notes)
        .innerJoin(noteTags, eq(notes.id, noteTags.noteId))
        .where(eq(noteTags.tagId, tagId))
        .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
        .leftJoin(tags, eq(noteTags.tagId, tags.id));

      // Group notes and their tags
      const notesMap = new Map<number, Note & { tags: Tag[] }>();

      result.forEach((row) => {
        if (!row.notes) return;

        if (!notesMap.has(row.notes.id)) {
          notesMap.set(row.notes.id, {
            ...row.notes,
            tags: [],
          });
        }

        if (row.tags) {
          const noteWithTags = notesMap.get(row.notes.id)!;
          // Check if this tag is already in the tags array
          if (!noteWithTags.tags.some((t) => t.id === row.tags!.id)) {
            noteWithTags.tags.push(row.tags);
          }
        }
      });

      return Array.from(notesMap.values());
    } catch (error) {
      console.error(`Error getting notes for tag with id ${tagId}:`, error);
      return [];
    }
  }

  async addTagToNote(noteId: number, tagId: number): Promise<NoteTag> {
    try {
      // Check if already exists
      const existing = await db
        .select()
        .from(noteTags)
        .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      const [noteTag] = await db
        .insert(noteTags)
        .values({
          noteId,
          tagId,
        })
        .returning();

      return noteTag;
    } catch (error) {
      console.error(`Error adding tag ${tagId} to note ${noteId}:`, error);
      throw error;
    }
  }

  async removeTagFromNote(noteId: number, tagId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(noteTags)
        .where(and(eq(noteTags.noteId, noteId), eq(noteTags.tagId, tagId)))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error(`Error removing tag ${tagId} from note ${noteId}:`, error);
      return false;
    }
  }

  // Link Tags
  async getLinkTagsByLinkId(linkId: number): Promise<Tag[]> {
    try {
      const result = await db
        .select()
        .from(tags)
        .innerJoin(linkTags, eq(tags.id, linkTags.tagId))
        .where(eq(linkTags.linkId, linkId));

      return result.map((row) => row.tags);
    } catch (error) {
      console.error(`Error getting tags for link with id ${linkId}:`, error);
      return [];
    }
  }

  async getLinkTagsByTagId(tagId: number): Promise<Link[]> {
    try {
      const result = await db
        .select()
        .from(links)
        .innerJoin(linkTags, eq(links.id, linkTags.linkId))
        .where(eq(linkTags.tagId, tagId));

      return result.map((row) => row.links);
    } catch (error) {
      console.error(`Error getting links for tag with id ${tagId}:`, error);
      return [];
    }
  }

  async addTagToLink(linkId: number, tagId: number): Promise<LinkTag> {
    try {
      // Check if already exists
      const existing = await db
        .select()
        .from(linkTags)
        .where(and(eq(linkTags.linkId, linkId), eq(linkTags.tagId, tagId)))
        .limit(1);

      if (existing.length > 0) {
        return existing[0];
      }

      const [linkTag] = await db
        .insert(linkTags)
        .values({
          linkId,
          tagId,
        })
        .returning();

      return linkTag;
    } catch (error) {
      console.error(`Error adding tag ${tagId} to link ${linkId}:`, error);
      throw error;
    }
  }

  async removeTagFromLink(linkId: number, tagId: number): Promise<boolean> {
    try {
      const result = await db
        .delete(linkTags)
        .where(and(eq(linkTags.linkId, linkId), eq(linkTags.tagId, tagId)))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error(`Error removing tag ${tagId} from link ${linkId}:`, error);
      return false;
    }
  }

  // Connections
  async getConnections(): Promise<Connection[]> {
    try {
      const result = await db
        .select({
          id: connections.id,
          createdAt: connections.createdAt,
          sourceId: connections.sourceId,
          sourceType: connections.sourceType,
          targetId: connections.targetId,
          targetType: connections.targetType,
          strength: connections.strength,
        })
        .from(connections);

      return result.map((conn) => ({
        id: conn.id,
        createdAt: conn.createdAt,
        sourceId: conn.sourceId,
        sourceType: conn.sourceType,
        targetId: conn.targetId,
        targetType: conn.targetType,
        strength: conn.strength ?? 0,
      }));
    } catch (error) {
      console.error("Error getting connections:", error);
      return [];
    }
  }

  async getConnection(id: number): Promise<Connection | undefined> {
    try {
      const [connection] = await db
        .select()
        .from(connections)
        .where(eq(connections.id, id))
        .limit(1);

      return connection;
    } catch (error) {
      console.error(`Error getting connection with id ${id}:`, error);
      return undefined;
    }
  }

  async getConnectionsBySourceId(
    sourceId: number,
    sourceType: string,
  ): Promise<Connection[]> {
    try {
      return await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.sourceId, sourceId),
            eq(connections.sourceType, sourceType),
          ),
        );
    } catch (error) {
      console.error(
        `Error getting connections for source ${sourceType}-${sourceId}:`,
        error,
      );
      return [];
    }
  }

  async getConnectionsByTargetId(
    targetId: number,
    targetType: string,
  ): Promise<Connection[]> {
    try {
      return await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.targetId, targetId),
            eq(connections.targetType, targetType),
          ),
        );
    } catch (error) {
      console.error(
        `Error getting connections for target ${targetType}-${targetId}:`,
        error,
      );
      return [];
    }
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    try {
      // Check if connection already exists
      const existing = await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.sourceId, connection.sourceId),
            eq(connections.sourceType, connection.sourceType),
            eq(connections.targetId, connection.targetId),
            eq(connections.targetType, connection.targetType),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        // Increase strength if it exists
        const [updatedConn] = await db
          .update(connections)
          .set({
            strength: (existing[0].strength || 1) + 1,
          })
          .where(eq(connections.id, existing[0].id))
          .returning();

        return updatedConn;
      }

      const [newConnection] = await db
        .insert(connections)
        .values({
          sourceId: connection.sourceId,
          sourceType: connection.sourceType,
          targetId: connection.targetId,
          targetType: connection.targetType,
          relationshipType: connection.relationshipType,
          strength: connection.strength || 1,
          createdAt: new Date(),
        })
        .returning();

      // Create activity for connection creation
      this.createActivity({
        action: "created_connection",
        entityId: newConnection.id,
        entityType: "connection",
        metadata: {
          sourceId: connection.sourceId,
          sourceType: connection.sourceType,
          targetId: connection.targetId,
          targetType: connection.targetType,
        },
      });

      return newConnection;
    } catch (error) {
      console.error("Error creating connection:", error);
      throw error;
    }
  }

  async updateConnection(
    id: number,
    connection: Partial<InsertConnection>,
  ): Promise<Connection | undefined> {
    try {
      const [updatedConnection] = await db
        .update(connections)
        .set(connection)
        .where(eq(connections.id, id))
        .returning();

      return updatedConnection;
    } catch (error) {
      console.error(`Error updating connection with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteConnection(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(connections)
        .where(eq(connections.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting connection with id ${id}:`, error);
      return false;
    }
  }

  // Daily Prompts
  async getDailyPrompts(): Promise<DailyPrompt[]> {
    try {
      const result = await db
        .select({
          id: dailyPrompts.id,
          date: dailyPrompts.date,
          prompt: dailyPrompts.prompt,
          answer: dailyPrompts.answer,
          isAnswered: dailyPrompts.isAnswered,
        })
        .from(dailyPrompts);

      return result.map((prompt) => ({
        id: prompt.id,
        date: prompt.date,
        prompt: prompt.prompt,
        answer: prompt.answer ?? null,
        isAnswered: prompt.isAnswered,
      }));
    } catch (error) {
      console.error("Error getting daily prompts:", error);
      return [];
    }
  }

  async getDailyPrompt(id: number): Promise<DailyPrompt | undefined> {
    try {
      const [prompt] = await db
        .select()
        .from(dailyPrompts)
        .where(eq(dailyPrompts.id, id))
        .limit(1);

      return prompt;
    } catch (error) {
      console.error(`Error getting daily prompt with id ${id}:`, error);
      return undefined;
    }
  }

  async getLatestDailyPrompt(): Promise<DailyPrompt | undefined> {
    try {
      const [prompt] = await db
        .select()
        .from(dailyPrompts)
        .orderBy(desc(dailyPrompts.date))
        .limit(1);

      return prompt;
    } catch (error) {
      console.error("Error getting latest daily prompt:", error);
      return undefined;
    }
  }

  async createDailyPrompt(prompt: InsertDailyPrompt): Promise<DailyPrompt> {
    try {
      const [newPrompt] = await db
        .insert(dailyPrompts)
        .values({
          prompt: prompt.prompt || "",
          answer: prompt.answer,
          date: new Date(),
          isAnswered: false,
        })
        .returning();

      return newPrompt;
    } catch (error) {
      console.error("Error creating daily prompt:", error);
      throw error;
    }
  }

  async updateDailyPrompt(
    id: number,
    prompt: Partial<DailyPrompt>,
  ): Promise<DailyPrompt | undefined> {
    try {
      const [updatedPrompt] = await db
        .update(dailyPrompts)
        .set(prompt)
        .where(eq(dailyPrompts.id, id))
        .returning();

      return updatedPrompt;
    } catch (error) {
      console.error(`Error updating daily prompt with id ${id}:`, error);
      return undefined;
    }
  }

  async deleteDailyPrompt(id: number): Promise<boolean> {
    try {
      await db.delete(dailyPrompts).where(eq(dailyPrompts.id, id));

      return true;
    } catch (error) {
      console.error(`Error deleting daily prompt with id ${id}:`, error);
      return false;
    }
  }

  // Activities
  async getActivities(limit?: number): Promise<Activity[]> {
    try {
      let query = db
        .select()
        .from(activities)
        .orderBy(desc(activities.timestamp));

      if (limit) {
        query = query.limit(limit);
      }

      return await query;
    } catch (error) {
      console.error("Error getting activities:", error);
      return [];
    }
  }

  async getActivity(id: number): Promise<Activity | undefined> {
    try {
      const [activity] = await db
        .select()
        .from(activities)
        .where(eq(activities.id, id))
        .limit(1);

      return activity;
    } catch (error) {
      console.error(`Error getting activity with id ${id}:`, error);
      return undefined;
    }
  }

  async createActivity(activity: InsertActivity): Promise<Activity> {
    try {
      const [newActivity] = await db
        .insert(activities)
        .values({
          action: activity.action,
          entityId: activity.entityId,
          entityType: activity.entityType,
          metadata: activity.metadata,
          timestamp: activity.timestamp || new Date(),
        })
        .returning();

      return newActivity;
    } catch (error) {
      console.error("Error creating activity:", error);
      throw error;
    }
  }

  async deleteActivity(id: number): Promise<boolean> {
    try {
      const result = await db
        .delete(activities)
        .where(eq(activities.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error(`Error deleting activity with id ${id}:`, error);
      return false;
    }
  }

  // Graph Data
  async getGraphData(): Promise<{ nodes: any[]; links: any[] }> {
    try {
      // Fetch all notes with their tags
      const notesResult = await db
        .select()
        .from(notes)
        .leftJoin(noteTags, eq(notes.id, noteTags.noteId))
        .leftJoin(tags, eq(noteTags.tagId, tags.id));

      // Fetch all links with their tags
      const linksData = await db
        .select({
          links: links,
          tags: tags,
          link_tags: linkTags,
        })
        .from(links)
        .leftJoin(linkTags, eq(links.id, linkTags.linkId))
        .leftJoin(tags, eq(linkTags.tagId, tags.id));

      // Fetch all connections
      const connectionsResult = await db.select().from(connections);

      // Group notes and their tags
      const notesMap = new Map<number, { note: Note; tags: Tag[] }>();
      notesResult.forEach((row) => {
        if (!row.notes) return;

        if (!notesMap.has(row.notes.id)) {
          notesMap.set(row.notes.id, { note: row.notes, tags: [] });
        }

        if (row.tags) {
          const noteData = notesMap.get(row.notes.id)!;
          if (!noteData.tags.some((t) => t.id === row.tags!.id)) {
            noteData.tags.push(row.tags);
          }
        }
      });

      // Group links and their tags
      const linksMap = new Map<number, { link: Link; tags: Tag[] }>();
      linksData.forEach((row) => {
        if (!row.links) return;

        if (!linksMap.has(row.links.id)) {
          linksMap.set(row.links.id, { link: row.links, tags: [] });
        }

        if (row.tags) {
          const linkData = linksMap.get(row.links.id)!;
          if (!linkData.tags.some((t) => t.id === row.tags!.id)) {
            linkData.tags.push(row.tags);
          }
        }
      });

      // Define graph data arrays first to avoid variable name collisions
      const nodes: any[] = [];
      const graphLinks: any[] = [];

      // Add notes as nodes
      Array.from(notesMap.values()).forEach(({ note, tags }) => {
        nodes.push({
          id: `note-${note.id}`,
          label: note.title,
          type: "note",
          data: note,
          tags,
        });
      });

      // Add links as nodes
      Array.from(linksMap.values()).forEach(({ link, tags }) => {
        nodes.push({
          id: `link-${link.id}`,
          label: link.title,
          type: "link",
          data: link,
          tags,
        });
      });

      // Add all tags as nodes
      const allTags = await db.select().from(tags);
      allTags.forEach((tag) => {
        nodes.push({
          id: `tag-${tag.id}`,
          label: tag.name,
          type: "tag",
          data: tag,
        });
      });

      // Add connections as links
      connectionsResult.forEach((connection) => {
        graphLinks.push({
          id: `connection-${connection.id}`,
          source: `${connection.sourceType}-${connection.sourceId}`,
          target: `${connection.targetType}-${connection.targetId}`,
          label: connection.relationshipType || "",
          data: connection,
        });
      });

      // Add note-tag relationships
      const noteTagsResult = await db.select().from(noteTags);
      noteTagsResult.forEach((noteTag) => {
        graphLinks.push({
          id: `notetag-${noteTag.id}`,
          source: `note-${noteTag.noteId}`,
          target: `tag-${noteTag.tagId}`,
          label: "has_tag",
          data: { type: "tag_relationship" },
        });
      });

      // Add link-tag relationships
      const linkTagsResult = await db.select().from(linkTags);
      linkTagsResult.forEach((linkTag) => {
        graphLinks.push({
          id: `linktag-${linkTag.id}`,
          source: `link-${linkTag.linkId}`,
          target: `tag-${linkTag.tagId}`,
          label: "has_tag",
          data: { type: "tag_relationship" },
        });
      });

      return { nodes, links: graphLinks };
    } catch (error) {
      console.error("Error getting graph data:", error);
      return { nodes: [], links: [] };
    }
  }
}

// Create some default tags
async function createDefaultTags() {
  const defaultTags = [
    { name: "Research", color: "#805AD5" },
    { name: "Projects", color: "#48BB78" },
    { name: "Ideas", color: "#F56565" },
    { name: "Reading List", color: "#ECC94B" },
  ];

  try {
    for (const tag of defaultTags) {
      const existing = await db
        .select()
        .from(tags)
        .where(sql`lower(${tags.name}) = lower(${tag.name})`)
        .limit(1);

      if (existing.length === 0) {
        await db.insert(tags).values(tag);
      }
    }
    console.log("Created default tags");
  } catch (error) {
    console.error("Error creating default tags:", error);
  }
}

createDefaultTags();

export const storage = new DatabaseStorage();
