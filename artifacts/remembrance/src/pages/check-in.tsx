import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { localDateKey, useDemoState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Check, Moon, Sun, Cloud, CloudRain, CloudLightning } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

const MOODS = [
  { val: 1, icon: CloudLightning, color: 'text-red-500' },
  { val: 2, icon: CloudRain, color: 'text-orange-500' },
  { val: 3, icon: Cloud, color: 'text-gray-500' },
  { val: 4, icon: Sun, color: 'text-yellow-500' },
  { val: 5, icon: Sun, color: 'text-yellow-500' }, // using same icon but bigger/brighter for max
];

export default function CheckIn() {
  const [, setLocation] = useLocation();
  const { state, addCheckIn } = useDemoState();
  const today = localDateKey();
  const existing = state.checkIns.find((checkIn) => checkIn.date === today);

  const [mood, setMood] = useState(existing?.mood || 4);
  const [sleep, setSleep] = useState(existing?.sleep || 7);
  const [notes, setNotes] = useState(existing?.notes || '');

  const handleSubmit = () => {
    addCheckIn({
      date: today,
      mood,
      sleep,
      notes
    });
    setLocation('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="bg-white border-b border-border/50 sticky top-0 z-30">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <button onClick={() => setLocation('/dashboard')} className="p-2 -ml-2 text-navy hover:bg-navy/5 rounded-full transition-colors">
            <ArrowLeft />
          </button>
          <span className="ml-2 text-lg font-bold text-navy flex-1">Daily Check-in</span>
        </div>
      </header>

      <main className="container mx-auto max-w-md px-6 py-12 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Mood */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-navy text-center">How are you feeling today?</h2>
          <div className="flex justify-between px-4">
            {[1, 2, 3, 4, 5].map(val => (
              <button
                key={val}
                onClick={() => setMood(val)}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  mood === val ? 'bg-cyan text-navy scale-110 shadow-md' : 'bg-white border border-border text-navy/40 hover:bg-navy/5'
                }`}
              >
                <span className="font-bold text-lg">{val}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between px-6 text-xs font-bold text-navy/40 uppercase tracking-wider">
            <span>Rough</span>
            <span>Great</span>
          </div>
        </div>

        {/* Sleep */}
        <div className="space-y-6 pt-6 border-t border-border/50">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-navy">Sleep</h2>
            <span className="text-2xl font-extrabold text-cyan">{sleep} <span className="text-sm text-navy/40 font-bold">hrs</span></span>
          </div>
          <div className="px-2 pt-4 pb-2">
            <Slider 
              value={[sleep]} 
              min={3} 
              max={12} 
              step={0.5} 
              onValueChange={([val]) => setSleep(val)} 
              className="[&_[role=slider]]:h-6 [&_[role=slider]]:w-6 [&_[role=slider]]:border-cyan [&_[role=slider]]:bg-white [&>.relative>.absolute]:bg-cyan"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-4 pt-6 border-t border-border/50">
          <h2 className="text-lg font-bold text-navy">Anything on your mind? <span className="text-navy/40 font-normal text-sm ml-2">(Optional)</span></h2>
          <textarea 
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-white border border-border rounded-2xl p-4 text-navy min-h-[120px] focus:outline-none focus:ring-2 focus:ring-cyan resize-none"
            placeholder="Just a quick note about today..."
          />
        </div>

        <div className="pt-8">
          <Button 
            onClick={handleSubmit}
            className="w-full h-16 text-xl bg-navy hover:bg-navy/90 text-white font-bold rounded-2xl shadow-md transition-all"
          >
            <Check className="mr-2 text-cyan" /> Complete Check-in
          </Button>
        </div>
      </main>
    </div>
  );
}
