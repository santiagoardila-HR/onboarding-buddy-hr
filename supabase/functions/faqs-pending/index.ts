import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // GET: Fetch pending questions
    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("faq_pending_questions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching pending questions:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify(data),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // POST: Create a new pending question (to be called by HappyRobot)
    if (req.method === "POST") {
      // TODO: Validate X-API-KEY header against HAPPYROBOT_API_KEY for external calls
      const body = await req.json();
      const { question, role, source, run_id, proposed_answer } = body;

      if (!question) {
        return new Response(
          JSON.stringify({ error: "question is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data, error } = await supabase
        .from("faq_pending_questions")
        .insert({
          question,
          role: role || null,
          source: source || null,
          run_id: run_id || null,
          proposed_answer: proposed_answer || null,
          status: "OPEN",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating pending question:", error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Created pending question:", data.id);

      return new Response(
        JSON.stringify(data),
        { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in faqs-pending function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
