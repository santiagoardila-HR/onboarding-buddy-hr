import { useState } from "react";
import { Plus, RefreshCw, Filter, Pencil } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const ROLES = ["DS", "FDE", "AES", "CS", "Ops", "Other"];

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  role: string | null;
  is_active: boolean;
  created_at: string;
}

export default function FAQManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("");

  // Form state
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newRole, setNewRole] = useState("");

  const { data: faqs = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["faqs", roleFilter],
    queryFn: async () => {
      let query = supabase
        .from("faqs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (roleFilter && roleFilter !== "all") {
        query = query.eq("role", roleFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FAQ[];
    },
  });

  const createFaqMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("faqs", {
        method: "POST",
        body: {
          question: newQuestion,
          answer: newAnswer,
          role: newRole || null,
          category: null,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: "FAQ created", description: "The FAQ has been added successfully." });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      setIsAddOpen(false);
      setNewQuestion("");
      setNewAnswer("");
      setNewRole("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create FAQ",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) {
      toast({
        title: "Validation Error",
        description: "Question and answer are required",
        variant: "destructive",
      });
      return;
    }
    createFaqMutation.mutate();
  };

  const updateFaqMutation = useMutation({
    mutationFn: async () => {
      if (!editingFaq) return;
      const { error } = await supabase
        .from("faqs")
        .update({
          question: editingFaq.question,
          answer: editingFaq.answer,
          role: editingFaq.role,
        })
        .eq("id", editingFaq.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "FAQ updated", description: "The FAQ has been updated successfully." });
      queryClient.invalidateQueries({ queryKey: ["faqs"] });
      setIsEditOpen(false);
      setEditingFaq(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update FAQ",
        variant: "destructive",
      });
    },
  });

  const handleEdit = (faq: FAQ) => {
    setEditingFaq({ ...faq });
    setIsEditOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">FAQ Manager</h2>
            <p className="text-muted-foreground mt-1">
              Manage frequently asked questions for onboarding
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefetching ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add FAQ
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New FAQ</DialogTitle>
                  <DialogDescription>
                    Create a new frequently asked question for the knowledge base.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question">Question *</Label>
                    <Textarea
                      id="question"
                      placeholder="What is the question?"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="answer">Answer *</Label>
                    <Textarea
                      id="answer"
                      placeholder="What is the answer?"
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      rows={4}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role (optional)</Label>
                      <Select value={newRole} onValueChange={setNewRole}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createFaqMutation.isPending}>
                      {createFaqMutation.isPending ? "Creating..." : "Create FAQ"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Edit FAQ Dialog */}
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit FAQ</DialogTitle>
              <DialogDescription>
                Update this frequently asked question.
              </DialogDescription>
            </DialogHeader>
            {editingFaq && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Question</Label>
                  <Textarea
                    value={editingFaq.question}
                    onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Answer</Label>
                  <Textarea
                    value={editingFaq.answer}
                    onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select value={editingFaq.role || ""} onValueChange={(v) => setEditingFaq({ ...editingFaq, role: v || null })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((role) => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                  <Button onClick={() => updateFaqMutation.mutate()} disabled={updateFaqMutation.isPending}>
                    {updateFaqMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* FAQs Table */}
        <div className="glass-card rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : faqs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No FAQs found.</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Add FAQ" to create one.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[40%]">Question</TableHead>
                    <TableHead className="w-[40%]">Answer</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {faqs.map((faq) => (
                    <TableRow key={faq.id} className="animate-fade-in">
                      <TableCell className="font-medium">{faq.question}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {faq.answer.length > 100 ? `${faq.answer.substring(0, 100)}...` : faq.answer}
                      </TableCell>
                      <TableCell>
                        {faq.role ? (
                          <Badge variant="secondary">{faq.role}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(faq)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
