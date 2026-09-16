import React, { useState } from 'react';
import { useJoinWaitlist } from '@workspace/api-client-react';
import { CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const waitlistSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(254),
});

export function WaitlistForm({ 
  location = "hero",
  buttonText = "Join the waitlist",
  microcopy = "Be first in line. No spam, ever."
}: { 
  location?: string;
  buttonText?: string;
  microcopy?: string;
}) {
  const [success, setSuccess] = useState(false);
  const joinWaitlist = useJoinWaitlist();

  const form = useForm<z.infer<typeof waitlistSchema>>({
    resolver: zodResolver(waitlistSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: z.infer<typeof waitlistSchema>) => {
    joinWaitlist.mutate(
      { data: { email: values.email } },
      {
        onSuccess: () => {
          setSuccess(true);
          form.reset();
        },
        onError: () => {
          form.setError("email", { 
            type: "manual", 
            message: "We couldn't save your place just now. Please try again in a moment."
          });
        }
      }
    );
  };

  if (success) {
    return (
      <div role="status" className="flex items-center gap-3 p-4 bg-cyan/10 text-navy rounded-xl border border-cyan/20 animate-in fade-in zoom-in duration-300">
        <CheckCircle2 className="text-cyan w-6 h-6 shrink-0" />
        <p className="font-medium text-sm">You're on the list. We'll be in touch soon.</p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form noValidate aria-label={`${location} waitlist`} onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full max-w-lg relative z-10">
        <div className="flex flex-col sm:flex-row gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
               <FormItem className="flex-1 min-w-0 space-y-2">
                 <FormControl>
                   <Input 
                     type="email"
                     autoComplete="email"
                     aria-label={`Email address — ${location}`}
                     placeholder="Enter your email" 
                     className="h-12 bg-white/90 border-navy/10 text-navy text-base focus-visible:ring-cyan focus-visible:ring-2 shadow-sm rounded-lg"
                     {...field} 
                   />
                 </FormControl>
                 <FormMessage role="alert" className="text-destructive text-sm font-medium" />
               </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="h-12 px-6 bg-cyan hover:bg-cyan/80 text-navy font-bold rounded-lg shadow-md hover:-translate-y-0.5 transition-all focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-cyan focus-visible:ring-offset-cream"
            disabled={joinWaitlist.isPending}
          >
            {joinWaitlist.isPending ? "Joining..." : buttonText}
          </Button>
        </div>
        <p className="text-xs text-navy/70 font-medium tracking-wide">
          {microcopy}
        </p>
      </form>
    </Form>
  );
}
