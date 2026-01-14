import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ROLE_OPTIONS = [
  { value: "DS", label: "DS (Data Science)" },
  { value: "FDE", label: "FDE (Full-Stack Development)" },
  { value: "AES", label: "AES (Account Executive)" },
  { value: "CS", label: "CS (Customer Success)" },
  { value: "Ops", label: "Ops (Operations)" },
  { value: "Other", label: "Other" },
];

const formSchema = z.object({
  employee_name: z.string().min(1, "Employee name is required"),
  employee_phone: z.string().min(1, "Phone number is required"),
  role: z.string().min(1, "Role is required"),
  team: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  start_date: z.date({ required_error: "Start date is required" }),
});

type FormValues = z.infer<typeof formSchema>;

export default function CreateOnboardingCall() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      employee_name: "",
      employee_phone: "",
      role: "",
      team: "",
      location: "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);

    try {
      // Step 1: Create the onboarding call record
      const { data: callData, error: insertError } = await supabase
        .from("onboarding_calls")
        .insert({
          employee_name: values.employee_name,
          employee_phone: values.employee_phone,
          role: values.role,
          team: values.team || null,
          location: values.location,
          start_date: format(values.start_date, "yyyy-MM-dd"),
          status: "PENDING",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Step 2: Trigger the onboarding call via HappyRobot webhook directly
      const HAPPYROBOT_WEBHOOK_URL = "https://workflows.platform.happyrobot.ai/hooks/development/lgzwv7ykluoe";

      const webhookResponse = await fetch(HAPPYROBOT_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          record_id: callData.id,  // Database record ID for callback
          employee_name: values.employee_name,
          employee_phone: values.employee_phone,
          role: values.role,
          team: values.team || null,
          location: values.location,
          start_date: format(values.start_date, "yyyy-MM-dd"),
        }),
      });

      if (!webhookResponse.ok) {
        // Update status to FAILED if webhook fails
        await supabase
          .from("onboarding_calls")
          .update({ status: "FAILED" })
          .eq("id", callData.id);
        throw new Error("Failed to trigger onboarding call");
      }

      const webhookData = await webhookResponse.json();
      const runId = webhookData.queued_run_ids?.[0] || webhookData.run_id || `run_${Date.now()}`;

      // Update status to RUNNING with run_id
      await supabase
        .from("onboarding_calls")
        .update({ status: "RUNNING", run_id: runId })
        .eq("id", callData.id);

      toast({
        title: "Onboarding call scheduled",
        description: `Call for ${values.employee_name} has been triggered successfully.`,
      });

      navigate("/");
    } catch (error: any) {
      console.error("Error creating onboarding call:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create onboarding call",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button asChild variant="ghost" className="mb-6">
          <Link to="/">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>

        <div className="glass-card rounded-lg p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Schedule Onboarding Call
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            This will schedule an AI voice onboarding call that explains the HappyRobot culture,
            this role's responsibilities, and what their first week will look like.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="employee_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Jane Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employee_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ROLE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Colombia, US – EST, Remote EU" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/")}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Schedule Call
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>
    </div>
  );
}
