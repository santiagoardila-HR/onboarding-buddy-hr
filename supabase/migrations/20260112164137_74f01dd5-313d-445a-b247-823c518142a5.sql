-- Create FAQs table
CREATE TABLE public.faqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  role TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create FAQ pending questions table
CREATE TABLE public.faq_pending_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  role TEXT,
  source TEXT,
  run_id TEXT,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'ANSWERED', 'DISMISSED')),
  proposed_answer TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_pending_questions ENABLE ROW LEVEL SECURITY;

-- Public read/write policies for FAQs (internal MVP)
CREATE POLICY "Public read access for faqs" ON public.faqs FOR SELECT USING (true);
CREATE POLICY "Public insert access for faqs" ON public.faqs FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for faqs" ON public.faqs FOR UPDATE USING (true);
CREATE POLICY "Public delete access for faqs" ON public.faqs FOR DELETE USING (true);

-- Public read/write policies for pending questions (internal MVP)
CREATE POLICY "Public read access for faq_pending_questions" ON public.faq_pending_questions FOR SELECT USING (true);
CREATE POLICY "Public insert access for faq_pending_questions" ON public.faq_pending_questions FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access for faq_pending_questions" ON public.faq_pending_questions FOR UPDATE USING (true);
CREATE POLICY "Public delete access for faq_pending_questions" ON public.faq_pending_questions FOR DELETE USING (true);

-- Add delete policy for onboarding_calls if not exists
CREATE POLICY "Public delete access for onboarding_calls" ON public.onboarding_calls FOR DELETE USING (true);

-- Trigger for updated_at on faqs
CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for updated_at on faq_pending_questions
CREATE TRIGGER update_faq_pending_questions_updated_at
  BEFORE UPDATE ON public.faq_pending_questions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();