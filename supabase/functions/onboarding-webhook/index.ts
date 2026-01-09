import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * POST /onboarding-webhook
 * 
 * This endpoint receives callbacks from the external onboarding call system (HappyRobot).
 * It updates the call status and summary based on the event received.
 * 
 * Expected payload:
 * {
 *   "run_id": "run_mock_123",
 *   "event_type": "completed" | "failed",
 *   "data": {
 *     "summary": "Short natural-language summary of the onboarding call."
 *   }
 * }
 * 
 * Returns: { success: boolean }
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

    // =========================================================================
    // PARSE INCOMING WEBHOOK PAYLOAD
    // Adjust this section if HappyRobot's actual payload format differs
    // =========================================================================

    const payload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    const { run_id, event_type, data } = payload;

    if (!run_id) {
      return new Response(
        JSON.stringify({ error: "Missing run_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the onboarding call by run_id
    const { data: call, error: fetchError } = await supabase
      .from("onboarding_calls")
      .select("id")
      .eq("run_id", run_id)
      .single();

    if (fetchError || !call) {
      console.error("Onboarding call not found for run_id:", run_id);
      return new Response(
        JSON.stringify({ error: "Onboarding call not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine the new status based on event_type
    let newStatus: string;
    let summary: string | null = null;

    switch (event_type) {
      case "completed":
        newStatus = "COMPLETED";
        summary = data?.summary || "Call completed successfully.";
        break;
      case "failed":
        newStatus = "FAILED";
        summary = data?.error || data?.summary || "Call failed.";
        break;
      default:
        // Unknown event type - log but don't update
        console.log("Unknown event_type:", event_type);
        return new Response(
          JSON.stringify({ success: true, message: "Event type not handled" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Update the onboarding call with the new status and summary
    const { error: updateError } = await supabase
      .from("onboarding_calls")
      .update({
        status: newStatus,
        summary: summary,
      })
      .eq("id", call.id);

    if (updateError) {
      console.error("Error updating onboarding call:", updateError);
      throw updateError;
    }

    console.log(`Updated call ${call.id} to status ${newStatus}`);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in onboarding-webhook:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
