import { useState } from "react";
import { RefreshCw, Check, X, BookOpen } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface PendingQuestion {
  id: string;
  question: string;
  role: string | null;
  source: string | null;
  run_id: string | null;
  status: "OPEN" | "ANSWERED" | "DISMISSED";
  proposed_answer: string | null;
  created_at: string;
}

export default function UnansweredQuestions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedQuestion, setSelectedQuestion] = useState<PendingQuestion | null>(null);
  const [answer, setAnswer] = useState("");
  const [createFaq, setCreateFaq] = useState(false);

  const { data: questions = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["pending-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("faq_pending_questions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as PendingQuestion[];
    },
  });

  const openQuestions = questions.filter((q) => q.status === "OPEN");

  const answerMutation = useMutation({
    mutationFn: async ({ id, answer, createFaq }: { id: string; answer: string; createFaq: boolean }) => {
      // Get the pending question first to get the question text
      const { data: questionData, error: fetchError } = await supabase
        .from("faq_pending_questions")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Determine new status based on whether answer is provided
      const newStatus = answer.trim() ? "ANSWERED" : "DISMISSED";

      // Update the pending question status
      const { error: updateError } = await supabase
        .from("faq_pending_questions")
        .update({
          status: newStatus,
          proposed_answer: answer.trim() || null
        })
        .eq("id", id);

      if (updateError) throw updateError;

      // If createFaq is true and we have an answer, create a new FAQ
      let newFaq = null;
      if (createFaq && answer.trim()) {
        const { data: faqData, error: faqError } = await supabase
          .from("faqs")
          .insert({
            question: questionData.question,
            answer: answer.trim(),
            role: questionData.role,
            category: null,
            is_active: true,
          })
          .select()
          .single();

        if (faqError) throw faqError;
        newFaq = faqData;
      }

      return { status: newStatus, faq: newFaq };
    },
    onSuccess: (data) => {
      const action = data.status === "ANSWERED" ? "answered" : "dismissed";
      toast({
        title: `Question ${action}`,
        description: data.faq ? "FAQ has been created from this question." : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["pending-questions"] });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      setSelectedQuestion(null);
      setAnswer("");
      setCreateFaq(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process question",
        variant: "destructive",
      });
    },
  });

  const handleAnswer = () => {
    if (!selectedQuestion) return;
    answerMutation.mutate({
      id: selectedQuestion.id,
      answer: answer.trim(),
      createFaq,
    });
  };

  const handleDismiss = () => {
    if (!selectedQuestion) return;
    answerMutation.mutate({
      id: selectedQuestion.id,
      answer: "",
      createFaq: false,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="secondary" className="bg-warning/20 text-warning-foreground">Open</Badge>;
      case "ANSWERED":
        return <Badge variant="secondary" className="bg-success/20 text-success">Answered</Badge>;
      case "DISMISSED":
        return <Badge variant="secondary" className="bg-muted text-muted-foreground">Dismissed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Unanswered Questions</h2>
            <p className="text-muted-foreground mt-1">
              Review and answer questions from onboarding calls
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Open Questions Stats */}
        <div className="mb-6 p-4 rounded-lg bg-muted/50 border border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{openQuestions.length}</span> open question{openQuestions.length !== 1 ? "s" : ""} awaiting response
          </p>
        </div>

        {/* Questions Table */}
        <div className="glass-card rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No questions yet.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Questions from HappyRobot calls will appear here.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[40%]">Question</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((question) => (
                    <TableRow key={question.id} className="animate-fade-in">
                      <TableCell className="font-medium">{question.question}</TableCell>
                      <TableCell>
                        {question.role ? (
                          <Badge variant="secondary">{question.role}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {question.source || "—"}
                      </TableCell>
                      <TableCell>{getStatusBadge(question.status)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(question.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        {question.status === "OPEN" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedQuestion(question);
                              setAnswer(question.proposed_answer || "");
                            }}
                          >
                            <BookOpen className="w-4 h-4 mr-1" />
                            Answer
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Answer Dialog */}
        <Dialog open={!!selectedQuestion} onOpenChange={() => setSelectedQuestion(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Answer Question</DialogTitle>
              <DialogDescription>
                Provide an answer or dismiss this question.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="font-medium text-foreground">{selectedQuestion?.question}</p>
                {selectedQuestion?.role && (
                  <Badge variant="secondary" className="mt-2">
                    {selectedQuestion.role}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="answer">Your Answer</Label>
                <Textarea
                  id="answer"
                  placeholder="Type your answer here..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="createFaq"
                  checked={createFaq}
                  onCheckedChange={(checked) => setCreateFaq(checked as boolean)}
                />
                <Label htmlFor="createFaq" className="text-sm">
                  Add to FAQ knowledge base
                </Label>
              </div>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                disabled={answerMutation.isPending}
              >
                <X className="w-4 h-4 mr-1" />
                Dismiss
              </Button>
              <Button
                type="button"
                onClick={handleAnswer}
                disabled={!answer.trim() || answerMutation.isPending}
              >
                <Check className="w-4 h-4 mr-1" />
                {answerMutation.isPending ? "Saving..." : "Submit Answer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
