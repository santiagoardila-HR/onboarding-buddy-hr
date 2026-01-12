import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * POST /onboarding-trigger
 * 
 * This function triggers the HappyRobot AI onboarding call system.
 * Sends a POST request to HappyRobot webhook when a new member is added.
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
    // HappyRobot Integration - Trigger onboarding call
    // =========================================================================

    const HAPPYROBOT_WEBHOOK_URL = "https://workflows.platform.happyrobot.ai/hooks/development/lgzwv7ykluoe";

    // Build the payload to send to HappyRobot
    const externalPayload = {
      callback_url: `${supabaseUrl}/functions/v1/onboarding-webhook`,
      employee_name: call.employee_name,
      employee_phone: call.employee_phone,
      role: call.role,
      team: call.team,
      location: call.location,
      start_date: call.start_date,
    };

    console.log("HappyRobot API payload:", JSON.stringify(externalPayload, null, 2));

    // Send POST request to HappyRobot workflow
    const externalResponse = await fetch(HAPPYROBOT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(externalPayload),
    });

    if (!externalResponse.ok) {
      const errorText = await externalResponse.text();
      console.error("HappyRobot API error:", externalResponse.status, errorText);
      throw new Error(`HappyRobot API error: ${externalResponse.status} - ${errorText}`);
    }

    const externalData = await externalResponse.json();
    console.log("HappyRobot API response:", JSON.stringify(externalData, null, 2));

    // Extract run_id from response (handles various response formats)
    const runId = externalData.queued_run_ids?.[0] || externalData.run_id || `run_${Date.now()}`;

    // =========================================================================
    // END HappyRobot Integration
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
