import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RefreshCw, Lightbulb } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function DailyPrompt() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [answer, setAnswer] = useState('');
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  
  // Fetch the latest daily prompt
  const { data: prompt, isLoading, error } = useQuery({
    queryKey: ['/api/daily-prompts/latest'],
    refetchInterval: 3600000, // Refetch every hour
  });
  
  // Generate a new prompt
  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/daily-prompts', { prompt: '' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-prompts/latest'] });
      toast({
        title: 'New prompt generated',
        description: 'Your daily prompt has been refreshed.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to generate new prompt: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Submit an answer to the prompt
  const answerMutation = useMutation({
    mutationFn: async () => {
      if (!prompt?.id) return;
      return apiRequest('PUT', `/api/daily-prompts/${prompt.id}`, { 
        answer: answer, 
        isAnswered: true 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/daily-prompts/latest'] });
      toast({
        title: 'Answer submitted',
        description: 'Your response has been saved.',
      });
      setAnswer('');
      setShowAnswerForm(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to submit answer: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <p>Error loading daily prompt</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-2"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/daily-prompts/latest'] })}
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-500" />
            Today's Prompt
          </CardTitle>
          <span className="text-xs text-gray-500">
            {prompt?.date ? format(new Date(prompt.date), 'MMMM d, yyyy') : format(new Date(), 'MMMM d, yyyy')}
          </span>
        </div>
      </CardHeader>
      
      <CardContent>
        <p className="text-gray-700 mb-4">{prompt?.prompt || 'No prompt available'}</p>
        
        {prompt?.isAnswered && prompt?.answer && (
          <div className="mt-4 bg-gray-50 p-3 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Your Response:</h4>
            <p className="text-sm text-gray-600">{prompt.answer}</p>
          </div>
        )}
        
        {showAnswerForm && !prompt?.isAnswered && (
          <div className="mt-4">
            <Textarea 
              placeholder="Write your response here..." 
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button
          variant="ghost"
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="text-accent hover:text-secondary transition-colors"
        >
          <RefreshCw className={`h-4 w-4 mr-1 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
          Generate New Prompt
        </Button>
        
        {!prompt?.isAnswered && (
          <>
            {showAnswerForm ? (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAnswerForm(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => answerMutation.mutate()}
                  disabled={!answer.trim() || answerMutation.isPending}
                >
                  {answerMutation.isPending ? 'Saving...' : 'Save Response'}
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => setShowAnswerForm(true)}
                className="bg-secondary text-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors"
              >
                Answer Prompt
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
