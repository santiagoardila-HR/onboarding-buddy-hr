import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { OnboardingCallsTable } from "@/components/OnboardingCallsTable";

export default function Dashboard() {
  const { data: calls = [], isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["onboarding-calls"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("onboarding_calls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">Onboarding Calls</h2>
            <p className="text-muted-foreground mt-1">
              Manage employee onboarding calls
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
            <Button asChild>
              <Link to="/create">
                <Plus className="w-4 h-4 mr-2" />
                Schedule onboarding call
              </Link>
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-lg">
          <OnboardingCallsTable 
            calls={calls as any} 
            isLoading={isLoading} 
          />
        </div>
      </main>
    </div>
  );
}
