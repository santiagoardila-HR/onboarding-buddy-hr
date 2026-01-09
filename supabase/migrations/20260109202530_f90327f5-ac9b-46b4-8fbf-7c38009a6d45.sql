-- Create onboarding_calls table
CREATE TABLE public.onboarding_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_name TEXT NOT NULL,
  employee_phone TEXT NOT NULL,
  role TEXT NOT NULL,
  location TEXT NOT NULL,
  start_date DATE NOT NULL,
  run_id TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (but allow public access for this MVP since no auth is required)
ALTER TABLE public.onboarding_calls ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for this app)
CREATE POLICY "Allow public read access" 
ON public.onboarding_calls 
FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access" 
ON public.onboarding_calls 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access" 
ON public.onboarding_calls 
FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access" 
ON public.onboarding_calls 
FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_onboarding_calls_updated_at
BEFORE UPDATE ON public.onboarding_calls
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on run_id for webhook lookups
CREATE INDEX idx_onboarding_calls_run_id ON public.onboarding_calls(run_id);

-- Create index on status for filtering
CREATE INDEX idx_onboarding_calls_status ON public.onboarding_calls(status);