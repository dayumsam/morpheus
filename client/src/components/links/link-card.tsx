import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Edit, Trash, Calendar, Link as LinkIcon, Tag, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { formatDistance } from "date-fns";

interface LinkCardProps {
  link: {
    id: number;
    url: string;
    title: string;
    description?: string;
    summary?: string;
    thumbnailUrl?: string;
    createdAt: string | Date;
    updatedAt: string | Date;
    tags?: { id: number; name: string; color: string }[];
  };
  onEdit?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export default function LinkCard({ link, onEdit, onDelete }: LinkCardProps) {
  // Parse dates
  const createdAt = new Date(link.createdAt);
  
  // Extract domain from URL
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return domain;
    } catch (error) {
      return url;
    }
  };
  
  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold">{link.title}</CardTitle>
          <div className="flex space-x-1">
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={() => onEdit(link.id)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {onDelete && (
              <Button variant="ghost" size="icon" onClick={() => onDelete(link.id)}>
                <Trash className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center text-sm text-gray-500">
          <LinkIcon className="h-3 w-3 mr-1" />
          <a 
            href={link.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-accent truncate"
          >
            {getDomain(link.url)}
          </a>
        </div>
      </CardHeader>
      
      <CardContent className="flex-grow pb-2">
        {link.thumbnailUrl && (
          <div className="mb-3 rounded-md overflow-hidden h-32 bg-gray-100">
            <img 
              src={link.thumbnailUrl} 
              alt={link.title} 
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
        
        {link.summary ? (
          <p className="text-sm text-gray-600">
            {link.summary.length > 150 
              ? link.summary.slice(0, 150) + '...' 
              : link.summary}
          </p>
        ) : link.description ? (
          <p className="text-sm text-gray-600">
            {link.description.length > 150 
              ? link.description.slice(0, 150) + '...' 
              : link.description}
          </p>
        ) : (
          <p className="text-sm text-gray-500 italic">No description available</p>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col items-start pt-2 border-t text-xs text-gray-500">
        <div className="flex items-center w-full justify-between">
          <div className="flex items-center">
            <Calendar className="h-3 w-3 mr-1" />
            <span>
              {formatDistance(createdAt, new Date(), { addSuffix: true })}
            </span>
          </div>
          <div className="flex space-x-2">
            <Link href={`/links/${link.id}`}>
              <a className="text-accent hover:text-secondary hover:underline">
                Details
              </a>
            </Link>
            <a 
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:text-secondary hover:underline flex items-center"
            >
              Visit <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </div>
        </div>
        
        {link.tags && link.tags.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {link.tags.map(tag => (
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
