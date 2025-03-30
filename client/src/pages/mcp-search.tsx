import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import { Loader2, Search, Tag as TagIcon, BookOpen, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  relevanceScore: number;
}

interface Link {
  id: number;
  url: string;
  title: string;
  description?: string;
  summary?: string;
  createdAt: string;
  updatedAt: string;
  tags: Tag[];
  relevanceScore: number;
}

interface SearchResult {
  notes: Note[];
  links: Link[];
  suggestedTags: Tag[];
  metadata: {
    totalNotes: number;
    totalLinks: number;
    usedTags: string[];
  };
}

export default function MCPSearch() {
  const [query, setQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [searchSubmitted, setSearchSubmitted] = useState(false);

  // Fetch available tags
  const { data: availableTags, isLoading: isTagsLoading } = useQuery<Tag[]>({
    queryKey: ["/api/tags"],
  });

  // Search query
  const {
    data: searchResults,
    isLoading: isSearching,
    refetch: performSearch,
  } = useQuery<SearchResult>({
    queryKey: [`/api/mcp/query`, query, selectedTags],
    enabled: searchSubmitted,
    staleTime: 0,
  });

  // Handle search submission
  const handleSearch = async () => {
    if (!query.trim() && selectedTags.length === 0) return;
    
    setSearchSubmitted(true);
    
    try {
      const results = await apiRequest("POST", "/api/mcp/query", {
        query: query,
        tags: selectedTags.map(tag => tag.name),
        limit: 10
      });
      
      // Update results directly
      return results;
    } catch (error) {
      console.error("Search error:", error);
    }
  };

  // Toggle tag selection
  const toggleTag = (tag: Tag) => {
    if (selectedTags.some(t => t.id === tag.id)) {
      setSelectedTags(selectedTags.filter(t => t.id !== tag.id));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Clear all selections
  const clearFilters = () => {
    setSelectedTags([]);
    setQuery("");
    setSearchSubmitted(false);
  };

  // Get a shorter preview of content
  const getContentPreview = (content: string, maxLength = 200) => {
    if (!content) return "";
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + "...";
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">Knowledge Search</h1>
      <p className="text-gray-500 mb-6">
        Search your notes and links using semantic similarity and tags
      </p>

      {/* Search input and filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4 mb-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <Input
              placeholder="What are you looking for?"
              className="pl-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <Button onClick={handleSearch} className="w-full sm:w-auto">
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Search"
            )}
          </Button>
        </div>

        {/* Available and selected tags */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <TagIcon className="h-4 w-4 mr-2 text-gray-500" />
              <h3 className="text-sm font-medium">Filter by tags</h3>
            </div>
            {selectedTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-7 text-xs"
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {isTagsLoading ? (
              <div className="flex items-center">
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-500">Loading tags...</span>
              </div>
            ) : (
              <>
                {availableTags && availableTags.length > 0 ? (
                  availableTags.map((tag: Tag) => (
                    <Badge
                      key={tag.id}
                      variant={
                        selectedTags.some((t) => t.id === tag.id)
                          ? "default"
                          : "outline"
                      }
                      className="cursor-pointer transition-all"
                      style={{
                        backgroundColor: selectedTags.some((t) => t.id === tag.id)
                          ? tag.color
                          : "transparent",
                        borderColor: tag.color,
                        color: selectedTags.some((t) => t.id === tag.id)
                          ? "white"
                          : tag.color,
                      }}
                      onClick={() => toggleTag(tag)}
                    >
                      {tag.name}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-gray-500">No tags available</span>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Search results */}
      {isSearching ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : searchSubmitted && searchResults ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              Search Results ({searchResults.metadata?.totalNotes || 0} notes,{" "}
              {searchResults.metadata?.totalLinks || 0} links)
            </h2>
            {searchResults.suggestedTags && searchResults.suggestedTags.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Suggested tags:</span>
                {searchResults.suggestedTags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="cursor-pointer"
                    style={{ borderColor: tag.color, color: tag.color }}
                    onClick={() => toggleTag(tag)}
                  >
                    {tag.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Tabs defaultValue="all">
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({
                (searchResults.notes?.length || 0) + 
                (searchResults.links?.length || 0)
              })</TabsTrigger>
              <TabsTrigger value="notes">
                Notes ({searchResults.notes?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="links">
                Links ({searchResults.links?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="all">
              <div className="space-y-4">
                {searchResults.notes && searchResults.notes.length > 0 ? (
                  searchResults.notes.map((note) => (
                    <Card key={`note-${note.id}`} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center mb-1">
                          <BookOpen className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-xs text-gray-500">Note</span>
                        </div>
                        <CardTitle>
                          <Link
                            to={`/notes/${note.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {note.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex items-center text-xs">
                          <span className="mr-2">
                            Relevance: {Math.round(note.relevanceScore * 100)}%
                          </span>
                          <span>Last updated: {formatDate(note.updatedAt.toString())}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">
                          {getContentPreview(note.content)}
                        </p>
                      </CardContent>
                      {note.tags && note.tags.length > 0 && (
                        <CardFooter className="pt-0 flex flex-wrap gap-2">
                          {note.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: tag.color, color: tag.color }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </CardFooter>
                      )}
                    </Card>
                  ))
                ) : null}

                {searchResults.links && searchResults.links.length > 0 ? (
                  searchResults.links.map((link) => (
                    <Card key={`link-${link.id}`} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center mb-1">
                          <Globe className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="text-xs text-gray-500">Link</span>
                        </div>
                        <CardTitle>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-500 transition-colors"
                          >
                            {link.title}
                          </a>
                        </CardTitle>
                        <CardDescription className="flex items-center text-xs">
                          <span className="mr-2">
                            Relevance: {Math.round(link.relevanceScore * 100)}%
                          </span>
                          <span>Added: {formatDate(link.createdAt)}</span>
                        </CardDescription>
                      </CardHeader>
                      {(link.description || link.summary) && (
                        <CardContent>
                          <p className="text-sm text-gray-700">
                            {getContentPreview(link.summary || link.description || "")}
                          </p>
                        </CardContent>
                      )}
                      {link.tags && link.tags.length > 0 && (
                        <CardFooter className="pt-0 flex flex-wrap gap-2">
                          {link.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: tag.color, color: tag.color }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </CardFooter>
                      )}
                    </Card>
                  ))
                ) : null}
                
                {(!searchResults.notes || searchResults.notes.length === 0) && 
                 (!searchResults.links || searchResults.links.length === 0) && (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No results found
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Try changing your search query or selecting different tags
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="notes">
              <div className="space-y-4">
                {searchResults.notes && searchResults.notes.length > 0 ? (
                  searchResults.notes.map((note) => (
                    <Card key={`note-${note.id}`} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center mb-1">
                          <BookOpen className="h-4 w-4 mr-2 text-primary" />
                          <span className="text-xs text-gray-500">Note</span>
                        </div>
                        <CardTitle>
                          <Link
                            to={`/notes/${note.id}`}
                            className="hover:text-primary transition-colors"
                          >
                            {note.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex items-center text-xs">
                          <span className="mr-2">
                            Relevance: {Math.round(note.relevanceScore * 100)}%
                          </span>
                          <span>Last updated: {formatDate(note.updatedAt.toString())}</span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-gray-700">
                          {getContentPreview(note.content)}
                        </p>
                      </CardContent>
                      {note.tags && note.tags.length > 0 && (
                        <CardFooter className="pt-0 flex flex-wrap gap-2">
                          {note.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: tag.color, color: tag.color }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </CardFooter>
                      )}
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No notes found
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Try changing your search query or selecting different tags
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="links">
              <div className="space-y-4">
                {searchResults.links && searchResults.links.length > 0 ? (
                  searchResults.links.map((link) => (
                    <Card key={`link-${link.id}`} className="overflow-hidden">
                      <CardHeader className="pb-3">
                        <div className="flex items-center mb-1">
                          <Globe className="h-4 w-4 mr-2 text-blue-500" />
                          <span className="text-xs text-gray-500">Link</span>
                        </div>
                        <CardTitle>
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-blue-500 transition-colors"
                          >
                            {link.title}
                          </a>
                        </CardTitle>
                        <CardDescription className="flex items-center text-xs">
                          <span className="mr-2">
                            Relevance: {Math.round(link.relevanceScore * 100)}%
                          </span>
                          <span>Added: {formatDate(link.createdAt)}</span>
                        </CardDescription>
                      </CardHeader>
                      {(link.description || link.summary) && (
                        <CardContent>
                          <p className="text-sm text-gray-700">
                            {getContentPreview(link.summary || link.description || "")}
                          </p>
                        </CardContent>
                      )}
                      {link.tags && link.tags.length > 0 && (
                        <CardFooter className="pt-0 flex flex-wrap gap-2">
                          {link.tags.map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="text-xs"
                              style={{ borderColor: tag.color, color: tag.color }}
                            >
                              {tag.name}
                            </Badge>
                          ))}
                        </CardFooter>
                      )}
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white rounded-lg shadow-sm">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No links found
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Try changing your search query or selecting different tags
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      ) : searchSubmitted ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
          <p className="text-gray-500 mb-6">
            Try changing your search query or selecting different tags
          </p>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Enter a search term to get started
          </h3>
          <p className="text-gray-500 mb-6">
            Search through your notes and links using semantic similarity and tags
          </p>
        </div>
      )}
    </div>
  );
}