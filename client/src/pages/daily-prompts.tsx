import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  RefreshCw,
  Lightbulb,
  Calendar,
  CheckCircle,
  Circle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface DailyPrompt {
  id: number;
  prompt: string;
  answer?: string;
  isAnswered: boolean;
  date: string;
}

export default function DailyPromptsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);
  const [answer, setAnswer] = useState("");

  // Fetch all daily prompts
  const {
    data: prompts = [],
    isLoading,
    error,
  } = useQuery<DailyPrompt[]>({
    queryKey: ["/api/daily-prompts"],
    staleTime: 60 * 1000, // 1 minute
  });

  // Generate a new prompt
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest<DailyPrompt>(
        "POST",
        "/api/daily-prompts",
        {
          isAnswered: false,
          date: new Date().toISOString(),
        },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-prompts"] });
      toast({
        title: "New prompt generated",
        description: "Your daily prompt has been created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to generate new prompt: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete a prompt
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/daily-prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-prompts"] });
      toast({
        title: "Prompt deleted",
        description: "The daily prompt has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete prompt: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Submit an answer to the prompt
  const answerMutation = useMutation({
    mutationFn: async () => {
      if (!selectedPromptId) return;
      const response = await apiRequest<DailyPrompt>(
        "PUT",
        `/api/daily-prompts/${selectedPromptId}`,
        {
          answer: answer.trim(),
          isAnswered: true,
        },
      );
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/daily-prompts"] });
      toast({
        title: "Answer submitted",
        description: "Your response has been saved.",
      });
      setAnswer("");
      setSelectedPromptId(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to submit answer: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Select a prompt to answer
  const handleSelectPrompt = (prompt: DailyPrompt) => {
    if (prompt.isAnswered) return;

    setSelectedPromptId(prompt.id);
    setAnswer(prompt.answer || "");
  };

  // Handle prompt deletion
  const handleDeletePrompt = (id: number) => {
    deleteMutation.mutate(id);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-secondary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertDescription>
          Failed to load daily prompts. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Daily Context Prompts</h1>
          <p className="text-gray-500 mt-1">
            Prompts to help you refine and enhance your knowledge connections
          </p>
        </div>
        <Button
          onClick={() => generateMutation.mutate()}
          className="mt-4 md:mt-0"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${generateMutation.isPending ? "animate-spin" : ""}`}
          />
          Generate New Prompt
        </Button>
      </div>

      {/* Current prompt with answer form */}
      {selectedPromptId && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
              Selected Prompt
            </CardTitle>
            <CardDescription>
              {prompts.find((p) => p.id === selectedPromptId)?.prompt}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Write your response here..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={6}
              className="resize-none"
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-4">
            <Button variant="outline" onClick={() => setSelectedPromptId(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => answerMutation.mutate()}
              disabled={!answer.trim() || answerMutation.isPending}
            >
              {answerMutation.isPending ? "Saving..." : "Save Response"}
            </Button>
          </CardFooter>
        </Card>
      )}

      {/* List of prompts */}
      <div className="space-y-4">
        {prompts.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium">No prompts yet</h3>
                <p className="text-gray-500 mt-2 mb-4">
                  Generate your first daily prompt to start refining your
                  knowledge
                </p>
                <Button onClick={() => generateMutation.mutate()}>
                  Generate First Prompt
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          prompts.map((prompt) => (
            <Card
              key={prompt.id}
              className={`hover:shadow-md transition-shadow ${
                prompt.isAnswered ? "" : "cursor-pointer"
              } ${selectedPromptId === prompt.id ? "ring-2 ring-secondary" : ""}`}
              onClick={() => !prompt.isAnswered && handleSelectPrompt(prompt)}
            >
              <CardHeader className="pb-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
                    <CardTitle>Daily Prompt</CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-1" />
                      {format(new Date(prompt.date), "MMMM d, yyyy")}
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-500 hover:text-red-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Prompt</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this prompt? This
                            action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel
                            onClick={(e) => e.stopPropagation()}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePrompt(prompt.id);
                            }}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{prompt.prompt}</p>

                {prompt.isAnswered && prompt.answer && (
                  <div className="mt-4 bg-gray-50 p-3 rounded-md">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Your Response:
                    </h4>
                    <p className="text-sm text-gray-600">{prompt.answer}</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0 justify-between">
                <div className="flex items-center text-sm">
                  {prompt.isAnswered ? (
                    <div className="flex items-center text-green-600">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Answered
                    </div>
                  ) : (
                    <div className="flex items-center text-gray-500">
                      <Circle className="h-4 w-4 mr-1" />
                      Not answered
                    </div>
                  )}
                </div>

                {!prompt.isAnswered && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectPrompt(prompt);
                    }}
                  >
                    Answer Now
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
