import { 
  notes, links, tags, noteTags, linkTags, connections, 
  dailyPrompts, activities, type Note, type InsertNote, 
  type Link, type InsertLink, type Tag, type InsertTag, 
  type Connection, type InsertConnection, type DailyPrompt, 
  type InsertDailyPrompt, type Activity, type InsertActivity,
  type NoteTag, type InsertNoteTag, type LinkTag, type InsertLinkTag
} from "@shared/schema";

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
  getConnectionsBySourceId(sourceId: number, sourceType: string): Promise<Connection[]>;
  getConnectionsByTargetId(targetId: number, targetType: string): Promise<Connection[]>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: number, connection: Partial<InsertConnection>): Promise<Connection | undefined>;
  deleteConnection(id: number): Promise<boolean>;

  // Daily Prompts
  getDailyPrompts(): Promise<DailyPrompt[]>;
  getDailyPrompt(id: number): Promise<DailyPrompt | undefined>;
  getLatestDailyPrompt(): Promise<DailyPrompt | undefined>;
  createDailyPrompt(prompt: InsertDailyPrompt): Promise<DailyPrompt>;
  updateDailyPrompt(id: number, prompt: Partial<DailyPrompt>): Promise<DailyPrompt | undefined>;
  deleteDailyPrompt(id: number): Promise<boolean>;

  // Activities
  getActivities(limit?: number): Promise<Activity[]>;
  getActivity(id: number): Promise<Activity | undefined>;
  createActivity(activity: InsertActivity): Promise<Activity>;
  deleteActivity(id: number): Promise<boolean>;

  // Graph Data
  getGraphData(): Promise<{ nodes: any[], links: any[] }>;
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
      updatedAt: now 
    };
    this.notes.set(id, newNote);
    
    // Create activity for note creation
    this.createActivity({
      action: "created_note",
      entityId: id,
      entityType: "note",
      metadata: { title: note.title }
    });
    
    return newNote;
  }

  async updateNote(id: number, note: Partial<InsertNote>): Promise<Note | undefined> {
    const existingNote = this.notes.get(id);
    if (!existingNote) return undefined;

    const updatedNote: Note = { 
      ...existingNote, 
      ...note, 
      updatedAt: new Date() 
    };
    this.notes.set(id, updatedNote);
    
    // Create activity for note update
    this.createActivity({
      action: "updated_note",
      entityId: id,
      entityType: "note",
      metadata: { title: updatedNote.title }
    });
    
    return updatedNote;
  }

  async deleteNote(id: number): Promise<boolean> {
    const deleted = this.notes.delete(id);
    
    if (deleted) {
      // Delete all note tags
      const noteTagsToDelete = Array.from(this.noteTags.values())
        .filter(nt => nt.noteId === id);
      
      for (const noteTag of noteTagsToDelete) {
        this.noteTags.delete(noteTag.id);
      }
      
      // Delete all connections
      const connectionsToDelete = Array.from(this.connections.values())
        .filter(conn => 
          (conn.sourceId === id && conn.sourceType === "note") || 
          (conn.targetId === id && conn.targetType === "note")
        );
      
      for (const connection of connectionsToDelete) {
        this.connections.delete(connection.id);
      }
      
      // Create activity for note deletion
      this.createActivity({
        action: "deleted_note",
        entityId: id,
        entityType: "note",
        metadata: {}
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
    return Array.from(this.links.values()).find(link => link.url === url);
  }

  async createLink(link: InsertLink): Promise<Link> {
    const id = this.linkCurrentId++;
    const now = new Date();
    const newLink: Link = { 
      ...link, 
      id, 
      createdAt: now, 
      updatedAt: now 
    };
    this.links.set(id, newLink);
    
    // Create activity for link creation
    this.createActivity({
      action: "saved_link",
      entityId: id,
      entityType: "link",
      metadata: { title: link.title, url: link.url }
    });
    
    return newLink;
  }

  async updateLink(id: number, link: Partial<InsertLink>): Promise<Link | undefined> {
    const existingLink = this.links.get(id);
    if (!existingLink) return undefined;

    const updatedLink: Link = { 
      ...existingLink, 
      ...link, 
      updatedAt: new Date() 
    };
    this.links.set(id, updatedLink);
    
    // Create activity for link update
    this.createActivity({
      action: "updated_link",
      entityId: id,
      entityType: "link",
      metadata: { title: updatedLink.title }
    });
    
    return updatedLink;
  }

  async deleteLink(id: number): Promise<boolean> {
    const deleted = this.links.delete(id);
    
    if (deleted) {
      // Delete all link tags
      const linkTagsToDelete = Array.from(this.linkTags.values())
        .filter(lt => lt.linkId === id);
      
      for (const linkTag of linkTagsToDelete) {
        this.linkTags.delete(linkTag.id);
      }
      
      // Delete all connections
      const connectionsToDelete = Array.from(this.connections.values())
        .filter(conn => 
          (conn.sourceId === id && conn.sourceType === "link") || 
          (conn.targetId === id && conn.targetType === "link")
        );
      
      for (const connection of connectionsToDelete) {
        this.connections.delete(connection.id);
      }
      
      // Create activity for link deletion
      this.createActivity({
        action: "deleted_link",
        entityId: id,
        entityType: "link",
        metadata: {}
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
    return Array.from(this.tags.values()).find(tag => tag.name === name);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const id = this.tagCurrentId++;
    const newTag: Tag = { ...tag, id };
    this.tags.set(id, newTag);
    return newTag;
  }

  async updateTag(id: number, tag: Partial<InsertTag>): Promise<Tag | undefined> {
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
      const noteTagsToDelete = Array.from(this.noteTags.values())
        .filter(nt => nt.tagId === id);
      
      for (const noteTag of noteTagsToDelete) {
        this.noteTags.delete(noteTag.id);
      }
      
      // Delete all link tags
      const linkTagsToDelete = Array.from(this.linkTags.values())
        .filter(lt => lt.tagId === id);
      
      for (const linkTag of linkTagsToDelete) {
        this.linkTags.delete(linkTag.id);
      }
    }
    
    return deleted;
  }

  // Note Tags
  async getNoteTagsByNoteId(noteId: number): Promise<Tag[]> {
    const noteTagIds = Array.from(this.noteTags.values())
      .filter(nt => nt.noteId === noteId)
      .map(nt => nt.tagId);
    
    return Array.from(this.tags.values())
      .filter(tag => noteTagIds.includes(tag.id));
  }

  async getNoteTagsByTagId(tagId: number): Promise<Note[]> {
    const noteIds = Array.from(this.noteTags.values())
      .filter(nt => nt.tagId === tagId)
      .map(nt => nt.noteId);
    
    return Array.from(this.notes.values())
      .filter(note => noteIds.includes(note.id));
  }

  async addTagToNote(noteId: number, tagId: number): Promise<NoteTag> {
    // Check if tag is already assigned to note
    const existing = Array.from(this.noteTags.values())
      .find(nt => nt.noteId === noteId && nt.tagId === tagId);
    
    if (existing) return existing;
    
    const id = this.noteTagCurrentId++;
    const noteTag: NoteTag = { id, noteId, tagId };
    this.noteTags.set(id, noteTag);
    return noteTag;
  }

  async removeTagFromNote(noteId: number, tagId: number): Promise<boolean> {
    const noteTagToDelete = Array.from(this.noteTags.values())
      .find(nt => nt.noteId === noteId && nt.tagId === tagId);
    
    if (noteTagToDelete) {
      return this.noteTags.delete(noteTagToDelete.id);
    }
    
    return false;
  }

  // Link Tags
  async getLinkTagsByLinkId(linkId: number): Promise<Tag[]> {
    const linkTagIds = Array.from(this.linkTags.values())
      .filter(lt => lt.linkId === linkId)
      .map(lt => lt.tagId);
    
    return Array.from(this.tags.values())
      .filter(tag => linkTagIds.includes(tag.id));
  }

  async getLinkTagsByTagId(tagId: number): Promise<Link[]> {
    const linkIds = Array.from(this.linkTags.values())
      .filter(lt => lt.tagId === tagId)
      .map(lt => lt.linkId);
    
    return Array.from(this.links.values())
      .filter(link => linkIds.includes(link.id));
  }

  async addTagToLink(linkId: number, tagId: number): Promise<LinkTag> {
    // Check if tag is already assigned to link
    const existing = Array.from(this.linkTags.values())
      .find(lt => lt.linkId === linkId && lt.tagId === tagId);
    
    if (existing) return existing;
    
    const id = this.linkTagCurrentId++;
    const linkTag: LinkTag = { id, linkId, tagId };
    this.linkTags.set(id, linkTag);
    return linkTag;
  }

  async removeTagFromLink(linkId: number, tagId: number): Promise<boolean> {
    const linkTagToDelete = Array.from(this.linkTags.values())
      .find(lt => lt.linkId === linkId && lt.tagId === tagId);
    
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

  async getConnectionsBySourceId(sourceId: number, sourceType: string): Promise<Connection[]> {
    return Array.from(this.connections.values())
      .filter(conn => conn.sourceId === sourceId && conn.sourceType === sourceType);
  }

  async getConnectionsByTargetId(targetId: number, targetType: string): Promise<Connection[]> {
    return Array.from(this.connections.values())
      .filter(conn => conn.targetId === targetId && conn.targetType === targetType);
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    // Check if connection already exists
    const existing = Array.from(this.connections.values())
      .find(conn => 
        conn.sourceId === connection.sourceId && 
        conn.sourceType === connection.sourceType &&
        conn.targetId === connection.targetId &&
        conn.targetType === connection.targetType
      );
    
    if (existing) {
      // Increase strength if it exists
      const updatedConn = {
        ...existing,
        strength: existing.strength + 1
      };
      this.connections.set(existing.id, updatedConn);
      return updatedConn;
    }
    
    const id = this.connectionCurrentId++;
    const now = new Date();
    const newConnection: Connection = { 
      ...connection, 
      id, 
      createdAt: now
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
        targetType: connection.targetType
      }
    });
    
    return newConnection;
  }

  async updateConnection(id: number, connection: Partial<InsertConnection>): Promise<Connection | undefined> {
    const existingConnection = this.connections.get(id);
    if (!existingConnection) return undefined;

    const updatedConnection: Connection = { 
      ...existingConnection, 
      ...connection 
    };
    this.connections.set(id, updatedConnection);
    return updatedConnection;
  }

  async deleteConnection(id: number): Promise<boolean> {
    return this.connections.delete(id);
  }

  // Daily Prompts
  async getDailyPrompts(): Promise<DailyPrompt[]> {
    return Array.from(this.dailyPrompts.values())
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
      isAnswered: false 
    };
    this.dailyPrompts.set(id, newPrompt);
    return newPrompt;
  }

  async updateDailyPrompt(id: number, prompt: Partial<DailyPrompt>): Promise<DailyPrompt | undefined> {
    const existingPrompt = this.dailyPrompts.get(id);
    if (!existingPrompt) return undefined;

    const updatedPrompt: DailyPrompt = { 
      ...existingPrompt, 
      ...prompt 
    };
    this.dailyPrompts.set(id, updatedPrompt);
    
    // If the prompt was answered, create an activity
    if (prompt.isAnswered && !existingPrompt.isAnswered) {
      this.createActivity({
        action: "answered_prompt",
        entityId: id,
        entityType: "daily_prompt",
        metadata: { prompt: existingPrompt.prompt }
      });
    }
    
    return updatedPrompt;
  }

  async deleteDailyPrompt(id: number): Promise<boolean> {
    return this.dailyPrompts.delete(id);
  }

  // Activities
  async getActivities(limit?: number): Promise<Activity[]> {
    const activities = Array.from(this.activities.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
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
      timestamp: now 
    };
    this.activities.set(id, newActivity);
    return newActivity;
  }

  async deleteActivity(id: number): Promise<boolean> {
    return this.activities.delete(id);
  }

  // Graph Data
  async getGraphData(): Promise<{ nodes: any[], links: any[] }> {
    const nodes: any[] = [];
    const links: any[] = [];
    
    // Add notes as nodes
    const allNotes = await this.getNotes();
    for (const note of allNotes) {
      const noteTags = await this.getNoteTagsByNoteId(note.id);
      const tags = noteTags.map(tag => ({ id: tag.id, name: tag.name }));
      
      nodes.push({
        id: `note-${note.id}`,
        type: 'note',
        title: note.title,
        tags,
        createdAt: note.createdAt
      });
    }
    
    // Add links as nodes
    const allLinks = await this.getLinks();
    for (const link of allLinks) {
      const linkTags = await this.getLinkTagsByLinkId(link.id);
      const tags = linkTags.map(tag => ({ id: tag.id, name: tag.name }));
      
      nodes.push({
        id: `link-${link.id}`,
        type: 'link',
        title: link.title,
        url: link.url,
        tags,
        createdAt: link.createdAt
      });
    }
    
    // Add connections as links
    const allConnections = await this.getConnections();
    for (const connection of allConnections) {
      links.push({
        source: `${connection.sourceType}-${connection.sourceId}`,
        target: `${connection.targetType}-${connection.targetId}`,
        strength: connection.strength
      });
    }
    
    return { nodes, links };
  }
}

export const storage = new MemStorage();
