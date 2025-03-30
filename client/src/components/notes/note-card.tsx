import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Trash, Calendar, Tag } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistance } from "date-fns";
import { MouseEvent } from "react";

interface NoteCardProps {
  note: {
    id: number;
    title: string;
    content: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    tags?: { id: number; name: string; color: string }[];
  };
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

// Simple markdown to HTML converter for preview
function convertMarkdownToHtml(markdown: string): string {
  return (
    markdown
      // Headers
      .replace(/^### (.*$)/gm, "<h3>$1</h3>")
      .replace(/^## (.*$)/gm, "<h2>$1</h2>")
      .replace(/^# (.*$)/gm, "<h1>$1</h1>")
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Lists
      .replace(/^\s*\d+\. (.*$)/gm, "<ol><li>$1</li></ol>")
      .replace(/^\s*[-*] (.*$)/gm, "<ul><li>$1</li></ul>")
      // Links
      .replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" class="text-primary hover:underline">$1</a>',
      )
      // Code
      .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded">$1</code>')
      // Blockquotes
      .replace(
        /^\> (.*$)/gm,
        '<blockquote class="border-l-4 border-gray-200 pl-4 italic">$1</blockquote>',
      )
      // Line breaks
      .replace(/\n/g, "<br>")
  );
}

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  // Parse dates
  const createdAt = new Date(note.createdAt);
  const updatedAt = new Date(note.updatedAt);

  // Convert markdown to HTML and truncate
  const htmlContent = convertMarkdownToHtml(note.content);
  const truncatedHtml =
    htmlContent.slice(0, 150) + (htmlContent.length > 150 ? "..." : "");

  const handleDelete = (e: MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation(); // Prevent event bubbling
    onDelete?.(note.id);
  };

  return (
    <Link to={`/notes/${note.id}`} className="block">
      <Card className="h-full flex flex-col hover:shadow-md transition-all hover:border-primary/50 cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-semibold hover:text-primary transition-colors">
              {note.title}
            </CardTitle>
            <div className="flex space-x-1">
              {onDelete && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDelete}
                  className="hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-grow pb-2">
          <div
            className="text-sm text-gray-600 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: truncatedHtml }}
          />
        </CardContent>

        <CardFooter className="flex flex-col items-start py-2 border-t text-xs text-gray-500">
          <div className="flex items-center w-full justify-between">
            <div className="flex items-center">
              <Calendar className="h-3 w-3 mr-1" />
              <span>
                {formatDistance(updatedAt, new Date(), { addSuffix: true })}
              </span>
            </div>
          </div>

          {note.tags && note.tags.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {note.tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-700"
                >
                  <Tag className="h-3 w-3 mr-1" style={{ color: tag.color }} />
                  <span>#{tag.name}</span>
                </div>
              ))}
            </div>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
