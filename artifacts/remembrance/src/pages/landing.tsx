import React from 'react';
import { motion, Variants, useReducedMotion, MotionConfig } from 'framer-motion';
import { Navigation } from '@/components/landing/navigation';
import { Hero } from '@/components/landing/hero';
import { Stepper } from '@/components/landing/stepper';
import { BrainExplorer } from '@/components/landing/brain-explorer';
import { Footer } from '@/components/landing/footer';
import { ScoreOrb } from '@/components/landing/score-orb';
import { WaitlistForm } from '@/components/landing/waitlist-form';
import { FocusPreview } from '@/components/landing/focus-preview';
import { Apple, Dumbbell, Moon, Users, Stethoscope, Lightbulb, Shield, LineChart } from 'lucide-react';

export default function Landing() {
  const reducedMotion = useReducedMotion();
  
  // Fade up animation variants
  const fadeUp: Variants = {
    hidden: { opacity: 0, y: reducedMotion ? 0 : 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="landing-page min-h-[100dvh] bg-cream text-navy font-sans selection:bg-cyan/30">
        <Navigation />
        
        <main>
          <Hero />

        {/* 3. Emotional hook */}
        <section className="py-32 px-6 bg-white border-y border-navy/5 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan/5 rounded-full blur-[100px] pointer-events-none" />
          
          <motion.div 
            className="container mx-auto max-w-4xl text-center space-y-8 relative z-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight leading-tight">
              If you've watched someone you love slip away, <br className="hidden md:block" />
              you already know the fear.
            </h2>
            <div className="space-y-6 text-lg md:text-xl text-navy/70 leading-relaxed max-w-3xl mx-auto font-medium">
              <p>
                You don't have to wait and wonder. You can stay close to your own brain health and act early, empowered by a clear understanding of where you stand.
              </p>
            </div>
          </motion.div>
        </section>

        {/* 4. How it works */}
        <section id="how-it-works" className="py-32 px-6">
          <div className="container mx-auto max-w-6xl space-y-20">
            <motion.div 
              className="text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight">
                Three steps to peace of mind
              </h2>
            </motion.div>
            
            <Stepper />
          </div>
        </section>

        {/* 5. The five areas — interactive explorer */}
        <section id="areas" className="py-32 px-6">
          <div className="container mx-auto max-w-6xl space-y-16">
            <motion.div 
              className="text-center max-w-2xl mx-auto"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight mb-6">
                Understand every part of you
              </h2>
              <p className="text-xl text-navy/70 font-medium">
                Explore the wellness domains to see how your brain supports your daily life.
              </p>
            </motion.div>
            
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <BrainExplorer />
            </motion.div>
          </div>
        </section>

        {/* 6. The Remembrance Score, explained */}
        <section className="py-32 px-6 bg-white border-y border-navy/5 overflow-hidden">
          <div className="container mx-auto max-w-5xl grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="order-2 md:order-1 flex justify-center relative"
            >
              <ScoreOrb targetScore={84} size="large" />
              
              {/* Progress mock card overlaid */}
              <motion.div 
                initial={{ opacity: 0, x: -20, y: 20 }}
                whileInView={{ opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="absolute -bottom-8 -right-4 md:-right-12 bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-border flex items-center gap-4"
              >
                <div className="w-10 h-10 bg-cyan/10 text-cyan rounded-full flex items-center justify-center">
                  <LineChart size={20} />
                </div>
                <div>
                  <div className="text-xs text-navy/70 font-bold uppercase tracking-wide">Illustrative 5-week trend</div>
                  <div className="text-navy font-semibold flex items-center gap-2">
                    +4 points <span className="text-navy text-sm bg-cyan/10 px-2 py-0.5 rounded-full">Sample data</span>
                  </div>
                </div>
              </motion.div>
            </motion.div>
            
            <motion.div 
              className="order-1 md:order-2 space-y-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight">
                One number. <br /> Your whole picture.
              </h2>
              <p className="text-xl text-navy/70 leading-relaxed font-medium">
                A simple way to follow your recorded results over time — with five key areas of brain health underneath it, explained in plain language. Scores can vary; this example is not a prediction of improvement.
              </p>
            </motion.div>
          </div>
        </section>

        {/* 7. Your plan — guidance preview */}
        <section className="py-32 px-6 bg-white border-y border-navy/5">
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              className="text-center max-w-2xl mx-auto mb-20"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight mb-6">
                Guidance that fits your life
              </h2>
              <p className="text-xl text-navy/70 font-medium">
                Small, personalized steps to support your brain health every day.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {[
                { icon: Apple, title: "Diet", desc: "Nutrition designed to fuel cognitive longevity." },
                { icon: Dumbbell, title: "Exercise", desc: "Movement that increases blood flow to the brain." },
                { icon: Moon, title: "Sleep", desc: "Rest routines that help your brain clear toxins." },
                { icon: Users, title: "Social Connection", desc: "Meaningful engagement to keep neural pathways active." },
                { icon: Stethoscope, title: "Health Checkups", desc: "Staying on top of physical factors that affect your mind." },
                { icon: Lightbulb, title: "Brain Training", desc: "Targeted exercises to challenge your specific weak spots." }
              ].map((item, i) => (
                <motion.div 
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-100px" }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  className="bg-cream/30 p-8 rounded-3xl border border-navy/5 hover:border-cyan/30 hover:bg-white transition-colors group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-cyan/10 text-cyan flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                    <item.icon size={24} strokeWidth={2} />
                  </div>
                  <h3 className="text-xl font-bold font-display text-navy mb-3">{item.title}</h3>
                  <p className="text-navy/70 font-medium leading-relaxed">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* 8. Interactive "Try it" */}
        <section id="try-it" className="py-32 px-6">
          <div className="container mx-auto max-w-4xl space-y-12">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <FocusPreview>
                <div className="mt-8 pt-8 border-t border-border flex justify-center">
                  <WaitlistForm location="post-try-it" buttonText="Join the waitlist" microcopy="Be first in line when we open." />
                </div>
              </FocusPreview>
            </motion.div>
          </div>
        </section>

        {/* 9. Trust & the story */}
        <section id="science" className="py-32 px-6 bg-navy text-cream relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-cyan/10 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-cyan/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="container mx-auto max-w-4xl relative z-10 space-y-16">
            <motion.div 
              className="text-center space-y-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <h2 className="text-3xl md:text-5xl font-display font-semibold tracking-tight">
                Built by people who've been where you are.
              </h2>
              <p className="text-xl text-cream/80 leading-relaxed font-medium">
                Remembrance was created out of personal loss — and a belief that people shouldn't have to wait, powerless, for something they might get ahead of. We are grounded in established brain-health science, because hope needs a solid foundation.
              </p>
            </motion.div>
            
            {/* Real trust signals */}
            <motion.div 
              className="flex flex-col md:flex-row items-center justify-center gap-8 pt-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
                <Shield className="w-10 h-10 text-cyan shrink-0" strokeWidth={1.5} />
                <div>
                  <div className="font-bold text-lg text-white">Dementia Society of America</div>
                  <div className="text-sm text-cream/60 font-medium">Proud Partner</div>
                </div>
              </div>
            </motion.div>

            {/* Testimonials Placeholder */}
            <motion.div 
              className="pt-16 grid md:grid-cols-2 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
            >
              {[1, 2].map((i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-navy/80 backdrop-blur-sm z-10 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity duration-500">
                    <span className="text-sm font-bold uppercase tracking-widest text-cyan border border-cyan/30 px-4 py-2 rounded-full">
                      Member stories coming soon
                    </span>
                  </div>
                  <div className="opacity-30 blur-sm pointer-events-none">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-white/20 rounded-full" />
                      <div>
                        <div className="w-24 h-4 bg-white/20 rounded mb-2" />
                        <div className="w-16 h-3 bg-white/10 rounded" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="w-full h-4 bg-white/20 rounded" />
                      <div className="w-5/6 h-4 bg-white/20 rounded" />
                      <div className="w-4/6 h-4 bg-white/20 rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* 10. Final CTA */}
        <section className="py-32 px-6 relative overflow-hidden flex justify-center items-center text-center">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
          
          <motion.div 
            className="container mx-auto max-w-3xl space-y-10 relative z-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
          >
            <h2 className="text-4xl md:text-6xl font-display font-semibold tracking-tight text-navy">
              Get ahead of it. <br className="hidden md:block" />
              <span className="text-cyan">Starting today.</span>
            </h2>
            <div className="flex justify-center pt-8">
              <WaitlistForm 
                location="footer" 
                buttonText="Join the waitlist" 
                microcopy="No cost to join. Just early access when we're ready." 
              />
            </div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
    </MotionConfig>
  );
}
