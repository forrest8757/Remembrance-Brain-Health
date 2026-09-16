import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function Footer() {
  return (
    <footer className="border-t border-border bg-white py-16 px-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-navy/60 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-bold text-navy text-lg tracking-tight bg-gradient-to-r from-navy to-cyan bg-clip-text text-transparent">
              Remembrance
            </span>
            <span className="ml-2">&copy; 2026 Remembrance Health LLC</span>
          </div>
          
          <div className="flex gap-8">
            <Dialog>
              <DialogTrigger className="hover:text-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded">
                Privacy
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white p-8 rounded-2xl max-h-[80vh] overflow-y-auto border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display text-navy mb-4">Privacy Policy</DialogTitle>
                </DialogHeader>
                <div className="text-navy/70 space-y-4 text-base">
                  <p>This is a demonstration application. Your interactions with the marketing pages stay in your browser's memory and are not permanently tracked.</p>
                  <p>If you enter your email to join the waitlist, it is securely stored for that purpose only.</p>
                  <p>The interactive demo section uses isolated session storage to simulate the product experience. We do not conduct actual health analysis, and no clinical or diagnostic data is collected or generated.</p>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger className="hover:text-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded">
                Terms
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white p-8 rounded-2xl max-h-[80vh] overflow-y-auto border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display text-navy mb-4">Terms of Service</DialogTitle>
                </DialogHeader>
                <div className="text-navy/70 space-y-4 text-base">
                  <p>This is an informational demonstration, not an approved contract or a final product.</p>
                  <p>Remembrance is a wellness tool in development. It is not a medical device, and it does not diagnose, treat, or prevent any disease, including dementia or Alzheimer's.</p>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger className="hover:text-cyan transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan rounded">
                Contact
              </DialogTrigger>
              <DialogContent className="max-w-md bg-white p-8 rounded-2xl border-border">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-display text-navy mb-4">Contact Us</DialogTitle>
                </DialogHeader>
                <div className="text-navy/70 space-y-4 text-base">
                  <p>We're glad you're here.</p>
                  <p>Our official support channels are not yet published while we remain in our pre-launch phase. Please check back closer to launch for our official contact information.</p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-border/50 text-xs md:text-sm text-navy/40 text-center max-w-4xl mx-auto leading-relaxed">
          Remembrance is a wellness and brain-health tool. It is not a medical device and does not diagnose, treat, or detect any disease. It is not a substitute for care from a qualified professional.
        </div>
      </div>
    </footer>
  );
}
