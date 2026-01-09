import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, RefreshCw, Phone, MapPin, Briefcase, Calendar, Clock, Hash } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";

export default function OnboardingCallDetail() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: call, isLoading, error } = useQuery({
    queryKey: ["onboarding-call", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_calls")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleRefreshStatus = async () => {
    if (!id) return;
    
    setIsRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("onboarding-status", {
        body: { id },
      });

      if (error) throw error;

      // Refetch the call data
      await queryClient.invalidateQueries({ queryKey: ["onboarding-call", id] });

      toast({
        title: "Status refreshed",
        description: "The call status has been updated.",
      });
    } catch (error: any) {
      console.error("Error refreshing status:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to refresh status",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !call) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Onboarding call not found.</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/">Back to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="space-y-6">
          {/* Header Card */}
          <Card className="glass-card animate-fade-in">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{call.employee_name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={call.status as any} />
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshStatus}
                disabled={isRefreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh Status
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span>{call.employee_phone}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Briefcase className="w-4 h-4" />
                  <span>{call.role}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{call.location}</span>
                </div>
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Start: {format(new Date(call.start_date), "MMMM d, yyyy")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Run ID Card */}
          {call.run_id && (
            <Card className="glass-card animate-slide-up">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Run ID
                </CardTitle>
              </CardHeader>
              <CardContent>
                <code className="bg-muted px-3 py-2 rounded text-sm block">
                  {call.run_id}
                </code>
              </CardContent>
            </Card>
          )}

          {/* Call Summary Card */}
          {call.summary && (
            <Card className="glass-card animate-slide-up border-l-4 border-l-success">
              <CardHeader>
                <CardTitle className="text-lg">Call Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground whitespace-pre-wrap">{call.summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card className="glass-card">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Created: {format(new Date(call.created_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>
                    Updated: {format(new Date(call.updated_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
