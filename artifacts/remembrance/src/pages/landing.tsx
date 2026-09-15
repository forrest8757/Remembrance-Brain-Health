import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useJoinWaitlist } from '@workspace/api-client-react';
import { useDemoState } from '@/lib/store';
import { BrainVisualization } from '@/components/brain-viz';
import { ArrowRight, Brain, Shield, Activity, TrendingUp, CheckCircle2, Menu, X, Check } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const waitlistSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address").max(254),
});

function WaitlistForm({ location = "hero" }: { location?: string }) {
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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 w-full max-w-lg">
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
                    aria-label="Email address"
                    placeholder="Enter your email" 
                    className="h-12 bg-white border-gray-200 text-base focus-visible:ring-cyan shadow-sm"
                    {...field} 
                  />
                </FormControl>
                <FormMessage className="text-navy text-sm" />
              </FormItem>
            )}
          />
          <Button 
            type="submit" 
            className="h-12 px-6 bg-cyan hover:bg-cyan/90 text-navy font-semibold rounded-lg shadow-md hover-elevate transition-all"
            disabled={joinWaitlist.isPending}
          >
            {joinWaitlist.isPending ? "Joining..." : "Join the waitlist"}
          </Button>
        </div>
        <p className="text-xs text-navy/60 font-medium tracking-wide">
          Be first in line when we open. No spam, ever.
        </p>
      </form>
    </Form>
  );
}

export default function Landing() {
  const [, setLocation] = useLocation();
  const { loadSampleUser } = useDemoState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const startDemo = () => {
    loadSampleUser();
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-cyan/30">
      <nav className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/40">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-navy to-cyan bg-clip-text text-transparent">
              Remembrance
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <button onClick={startDemo} className="text-sm font-semibold text-navy/70 hover:text-cyan transition-colors">
              Try the demo
            </button>
            <Button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="bg-navy hover:bg-navy/90 text-white rounded-full px-6 shadow-md">
              Join Waitlist
            </Button>
          </div>

          <button className="md:hidden text-navy" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </nav>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-background pt-24 px-6 flex flex-col gap-6 animate-in slide-in-from-top-4">
          <button onClick={() => { startDemo(); setMobileMenuOpen(false); }} className="text-lg font-semibold text-navy py-4 border-b border-border/50 text-left">
            Try the demo
          </button>
          <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setMobileMenuOpen(false); }} className="text-lg font-semibold text-navy py-4 border-b border-border/50 text-left">
            Join Waitlist
          </button>
        </div>
      )}

      <section className="pt-16 pb-24 md:pt-24 md:pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan/10 rounded-full blur-[100px] -z-10 pointer-events-none" />
        
        <div className="container mx-auto max-w-6xl grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8 max-w-2xl z-10">
            <p className="text-cyan font-bold tracking-widest uppercase text-sm">
              For anyone who's watched someone they love slip away.
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-navy leading-[1.1] tracking-tight">
              You couldn't do anything for them. <br className="hidden lg:block" />
              <span className="text-cyan">You can do something for you.</span>
            </h1>
            <p className="text-lg md:text-xl text-navy/70 leading-relaxed font-medium">
              Remembrance helps you understand how your brain is doing, keep an eye on it over time, and take real steps to support it — all from home, a few minutes a week.
            </p>
            
            <div className="pt-4">
              <WaitlistForm location="hero" />
            </div>
          </div>
          <div className="lg:justify-self-end w-full">
            <BrainVisualization />
          </div>
        </div>
      </section>

      <section className="py-24 bg-white px-6">
        <div className="container mx-auto max-w-4xl text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold text-navy tracking-tight">
            If you have a family history, <br className="hidden md:block" />
            you already know the fear.
          </h2>
          <div className="space-y-6 text-lg md:text-xl text-navy/70 leading-relaxed max-w-3xl mx-auto font-medium">
            <p>
              Maybe it was a parent. A grandparent. Someone you loved who changed in ways no one could stop. You've wondered, quietly, whether you're next — and whether you'd even notice in time.
            </p>
            <p>
              You don't have to sit with that uncertainty. Remembrance gives you a simple way to stay close to your own brain health, so you're informed and in control — not waiting and worrying.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-background">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-navy tracking-tight">
              Three simple steps to peace of mind.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                num: "1",
                title: "Take your baseline",
                desc: "One easy assessment across five key areas of brain health gives you your starting point: your Remembrance Score."
              },
              {
                num: "2",
                title: "Check in weekly",
                desc: "A few minutes a week. Each week focuses on one area of your brain, through quick, interactive activities and a short voice check."
              },
              {
                num: "3",
                title: "Get your plan & track progress",
                desc: "Personalized guidance built around you — and a full re-score every five weeks so you can actually see your progress."
              }
            ].map((step) => (
              <div key={step.num} className="bg-white rounded-3xl p-8 shadow-sm border border-border hover-elevate transition-all">
                <div className="w-14 h-14 bg-cyan/10 text-cyan rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">
                  {step.num}
                </div>
                <h3 className="text-xl font-bold text-navy mb-4">{step.title}</h3>
                <p className="text-navy/70 leading-relaxed font-medium">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-white px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-5xl font-bold text-navy tracking-tight">
              One clear picture of your brain health.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-x-12 gap-y-10">
            {[
              { icon: Activity, title: "Your Remembrance Score", desc: "One simple number, tracked over time, so you always know where you stand." },
              { icon: Brain, title: "Five areas, understood", desc: "Attention, thinking, memory, language, and coordination, each explained in plain language." },
              { icon: CheckCircle2, title: "A plan that fits your life", desc: "Guidance across diet, exercise, sleep, social connection, checkups, and brain training." },
              { icon: TrendingUp, title: "Progress you can see", desc: "Watch your score move as you build better habits." }
            ].map((prop, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-12 h-12 shrink-0 bg-cyan/10 rounded-xl flex items-center justify-center text-cyan mt-1">
                  <prop.icon size={24} strokeWidth={2} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-navy mb-2">{prop.title}</h3>
                  <p className="text-navy/70 leading-relaxed font-medium">{prop.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 px-6 bg-navy text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan/20 blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan/10 blur-[100px] rounded-full pointer-events-none" />
        
        <div className="container mx-auto max-w-3xl relative z-10 space-y-10">
          <Shield className="w-16 h-16 text-cyan mx-auto mb-6" strokeWidth={1.5} />
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
            Built by people who've been where you are.
          </h2>
          <p className="text-xl text-white/80 leading-relaxed">
            Remembrance was created out of a personal loss — and a belief that people shouldn't have to wait, powerless, for something they might be able to get ahead of. We partner with respected voices in brain health, including the <strong className="text-white">Dementia Society of America</strong>, to keep what we build grounded and responsible.
          </p>
          
          <div className="pt-8 max-w-xl mx-auto bg-white/5 border border-white/10 rounded-2xl p-6 text-sm text-white/60 font-medium">
            Remembrance is a wellness and brain-health tool. It is not a medical device and does not diagnose, treat, or detect any disease. It's not a substitute for care from a qualified professional.
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-background">
        <div className="container mx-auto max-w-3xl text-center space-y-10">
          <h2 className="text-4xl md:text-6xl font-bold text-navy tracking-tight">
            Get ahead of it. <span className="text-cyan block mt-2">Starting now.</span>
          </h2>
          <p className="text-xl text-navy/70 font-medium">
            Join the waitlist and be first to know when Remembrance opens.
          </p>
          
          <div className="flex justify-center pt-4">
            <WaitlistForm location="footer" />
          </div>
        </div>
      </section>

      <footer className="border-t border-border/50 bg-white py-12 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-navy/50 font-medium">
            <div>
              <span className="font-bold text-navy mr-2">Remembrance Health LLC</span> 
              &copy; 2026
            </div>
            
            <div className="flex gap-6">
              <a href="#" className="hover:text-cyan transition-colors">Privacy</a>
              <a href="#" className="hover:text-cyan transition-colors">Terms</a>
              <a href="#" className="hover:text-cyan transition-colors">Contact</a>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-border/50 text-xs text-navy/40 text-center max-w-4xl mx-auto">
            Remembrance is a wellness and brain-health tool. It is not a medical device and does not diagnose, treat, or detect any disease. It's not a substitute for care from a qualified professional.
          </div>
        </div>
      </footer>
    </div>
  );
}
