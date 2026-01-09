-- Add team column to onboarding_calls table
ALTER TABLE public.onboarding_calls 
ADD COLUMN team TEXT;