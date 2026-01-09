import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * POST /onboarding-trigger
 * 
 * This function triggers an external onboarding call system (e.g., HappyRobot).
 * Currently mocked - replace the mock section with actual API calls.
 * 
 * Body: { id: string } - The onboarding_calls record ID
 * 
 * Returns: { success: boolean, run_id: string }
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
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !call) {
      return new Response(
        JSON.stringify({ error: "Onboarding call not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // MOCK EXTERNAL API CALL
    // Replace this section with actual HappyRobot API integration
    // =========================================================================
    
    // Build the payload to send to the external service
    const externalPayload = {
      callback_url: `${supabaseUrl}/functions/v1/onboarding-webhook`,
      employee_name: call.employee_name,
      employee_phone: call.employee_phone,
      role: call.role,
      location: call.location,
      start_date: call.start_date,
    };

    console.log("External API payload:", JSON.stringify(externalPayload, null, 2));

    // TODO: Replace this mock with actual API call:
    // 
    // const HAPPYROBOT_WEBHOOK_URL = Deno.env.get("HAPPYROBOT_WEBHOOK_URL");
    // const HAPPYROBOT_API_KEY = Deno.env.get("HAPPYROBOT_API_KEY");
    // 
    // const externalResponse = await fetch(HAPPYROBOT_WEBHOOK_URL, {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "X-API-KEY": HAPPYROBOT_API_KEY,
    //   },
    //   body: JSON.stringify(externalPayload),
    // });
    // 
    // if (!externalResponse.ok) {
    //   throw new Error(`External API error: ${externalResponse.statusText}`);
    // }
    // 
    // const externalData = await externalResponse.json();
    // const runId = externalData.queued_run_ids?.[0];

    // Mock response - simulates successful external call
    const mockRunId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const runId = mockRunId;

    // =========================================================================
    // END MOCK SECTION
    // =========================================================================

    // Update the database with run_id and set status to RUNNING
    const { error: updateError } = await supabase
      .from("onboarding_calls")
      .update({
        run_id: runId,
        status: "RUNNING",
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating onboarding call:", updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, run_id: runId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in onboarding-trigger:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
