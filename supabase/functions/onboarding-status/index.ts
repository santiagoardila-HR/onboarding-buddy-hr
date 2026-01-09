import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * POST /onboarding-status
 * 
 * Returns the current status of an onboarding call from the database.
 * 
 * Body: { id: string } - The onboarding_calls record ID
 * 
 * Returns:
 * {
 *   "id": "...",
 *   "status": "RUNNING",
 *   "run_id": "run_mock_123",
 *   "summary": "..."
 * }
 * 
 * TODO: If needed, this can be extended to fetch status from the external
 * HappyRobot API and sync it back to the database.
 */
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { id } = await req.json();

    if (!id) {
      return new Response(
        JSON.stringify({ error: "Missing onboarding call ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the onboarding call from the database
    const { data: call, error: fetchError } = await supabase
      .from("onboarding_calls")
      .select("id, status, run_id, summary")
      .eq("id", id)
      .single();

    if (fetchError || !call) {
      return new Response(
        JSON.stringify({ error: "Onboarding call not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // OPTIONAL: Fetch status from external API
    // Uncomment and modify if you want to poll HappyRobot for live status
    // =========================================================================
    
    // if (call.run_id && call.status === "RUNNING") {
    //   const HAPPYROBOT_STATUS_URL = Deno.env.get("HAPPYROBOT_STATUS_URL");
    //   const HAPPYROBOT_API_KEY = Deno.env.get("HAPPYROBOT_API_KEY");
    //   
    //   const externalResponse = await fetch(
    //     `${HAPPYROBOT_STATUS_URL}?run_id=${call.run_id}`,
    //     {
    //       headers: {
    //         "X-API-KEY": HAPPYROBOT_API_KEY,
    //       },
    //     }
    //   );
    //   
    //   if (externalResponse.ok) {
    //     const externalStatus = await externalResponse.json();
    //     // Update local database if status changed
    //     // ...
    //   }
    // }

    // =========================================================================
    // END OPTIONAL SECTION
    // =========================================================================

    return new Response(
      JSON.stringify({
        id: call.id,
        status: call.status,
        run_id: call.run_id,
        summary: call.summary,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in onboarding-status:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
