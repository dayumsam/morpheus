import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Calendar, Tag } from "lucide-react";
import { Link, useLocation } from "wouter";
import { formatDistance } from "date-fns";

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

export default function NoteCard({ note, onEdit, onDelete }: NoteCardProps) {
  // Parse dates
  const createdAt = new Date(note.createdAt);
  const updatedAt = new Date(note.updatedAt);
  
  // Truncate content for preview
  const truncatedContent = note.content
    .replace(/<[^>]*>?/gm, '') // Strip HTML tags
    .slice(0, 150) + (note.content.length > 150 ? '...' : '');
    
  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{note.title}</CardTitle>
          <div className="flex space-x-1">
            <Link href={`/notes/${note.id}/edit`}>
              <Button variant="ghost" size="icon">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(note.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow pb-2">
        <p className="text-sm text-gray-600">{truncatedContent}</p>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start pt-2 border-t text-xs text-gray-500">
        <div className="flex items-center w-full justify-between">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>
              {formatDistance(updatedAt, new Date(), { addSuffix: true })}
            </span>
          </div>
          <Link href={`/notes/${note.id}`}>
            <a className="text-accent hover:text-secondary hover:underline">
              View
            </a>
          </Link>
        </div>
        
        {note.tags && note.tags.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {note.tags.map(tag => (
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
  );
}
