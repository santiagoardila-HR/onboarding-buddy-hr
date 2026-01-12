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

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const body = await req.json();
    const { id, answer, createFaq } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: "id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch the pending question
    const { data: pendingQuestion, error: fetchError } = await supabase
      .from("faq_pending_questions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !pendingQuestion) {
      console.error("Error fetching pending question:", fetchError);
      return new Response(
        JSON.stringify({ error: "Pending question not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine status based on answer
    const newStatus = answer && answer.trim() ? "ANSWERED" : "DISMISSED";

    // Update the pending question
    const { error: updateError } = await supabase
      .from("faq_pending_questions")
      .update({
        status: newStatus,
        proposed_answer: answer || null,
      })
      .eq("id", id);

    if (updateError) {
      console.error("Error updating pending question:", updateError);
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Updated pending question ${id} to status: ${newStatus}`);

    // If createFaq is true and we have an answer, create a new FAQ
    let newFaq = null;
    if (createFaq && answer && answer.trim()) {
      const { data: faqData, error: faqError } = await supabase
        .from("faqs")
        .insert({
          question: pendingQuestion.question,
          answer: answer.trim(),
          role: pendingQuestion.role,
          category: null,
          is_active: true,
        })
        .select()
        .single();

      if (faqError) {
        console.error("Error creating FAQ:", faqError);
        return new Response(
          JSON.stringify({ 
            error: "Question answered but failed to create FAQ", 
            details: faqError.message 
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      newFaq = faqData;
      console.log("Created FAQ from pending question:", newFaq.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        status: newStatus,
        faq: newFaq,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in faqs-pending-answer function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
