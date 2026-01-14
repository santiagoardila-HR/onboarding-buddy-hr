import { useState } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { Eye, Trash2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "./StatusBadge";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useToast } from "@/hooks/use-toast";

interface OnboardingCall {
  id: string;
  employee_name: string;
  role: string;
  team: string | null;
  location: string;
  start_date: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  created_at: string;
}

interface OnboardingCallsTableProps {
  calls: OnboardingCall[];
  isLoading?: boolean;
}

export function OnboardingCallsTable({ calls, isLoading }: OnboardingCallsTableProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete directly from database
      const { error } = await supabase
        .from("onboarding_calls")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: "Deleted", description: "Onboarding call has been deleted." });
      queryClient.invalidateQueries({ queryKey: ["onboarding-calls"] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete onboarding call",
        variant: "destructive",
      });
      setDeleteId(null);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No onboarding calls scheduled yet.</p>
        <p className="text-sm text-muted-foreground mt-1">
          Click "Schedule onboarding call" to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Employee</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Team</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {calls.map((call) => (
            <TableRow key={call.id} className="animate-fade-in">
              <TableCell className="font-medium">{call.employee_name}</TableCell>
              <TableCell>{call.role}</TableCell>
              <TableCell className="text-muted-foreground">{call.team || "—"}</TableCell>
              <TableCell>{call.location}</TableCell>
              <TableCell>{format(new Date(call.start_date), "MMM d, yyyy")}</TableCell>
              <TableCell>
                <StatusBadge status={call.status} />
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(call.created_at), "MMM d, yyyy h:mm a")}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link to={`/call/${call.id}`}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(call.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DeleteConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
        title="Delete onboarding call?"
        description="This action cannot be undone. This will permanently delete this onboarding call record."
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
