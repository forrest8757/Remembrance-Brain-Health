import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useDemoState } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, ChevronRight, Brain } from 'lucide-react';

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { updateProfile, setOnboardingComplete } = useDemoState();
  
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [education, setEducation] = useState('');
  const [reason, setReason] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [familyHistory, setFamilyHistory] = useState('');

  const handleNext = () => {
    if (step === 4) {
      updateProfile({
        firstName,
        age,
        sex,
        education,
        reason,
        conditions,
        familyHistory
      });
      setOnboardingComplete(true);
      setLocation('/baseline');
    } else {
      setStep(s => s + 1);
    }
  };

  const handleSkipHealth = () => {
    setConditions(['prefer not to say']);
    setFamilyHistory('prefer not to say');
    setStep(4);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden selection:bg-cyan/30">
      {/* Brand header */}
      <header className="absolute top-0 w-full p-6 flex justify-center z-20">
        <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-navy to-cyan bg-clip-text text-transparent">
          Remembrance
        </span>
      </header>

      {/* Decorative ambient elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[50vh] h-[50vh] bg-cyan/10 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="flex-1 flex items-center justify-center p-6 z-10 relative">
        <div className="w-full max-w-md">
          
          {step === 1 && (
            <div className="text-center space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
              <div className="w-24 h-24 mx-auto bg-white rounded-3xl shadow-sm border border-border flex items-center justify-center">
                <Brain className="w-12 h-12 text-cyan" strokeWidth={1.5} />
              </div>
              <div className="space-y-4">
                <h1 className="text-3xl md:text-4xl font-bold text-navy tracking-tight">
                  Welcome to Remembrance.
                </h1>
                <p className="text-lg text-navy/70 font-medium leading-relaxed">
                  Let's understand how your brain is doing.
                </p>
              </div>
              <Button 
                onClick={handleNext}
                className="w-full h-14 text-lg bg-navy hover:bg-navy/90 text-white rounded-2xl shadow-md hover-elevate transition-all group"
              >
                Get started
                <ArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-navy tracking-tight">
                  A few quick details.
                </h2>
                <p className="text-navy/60 font-medium">This helps us personalize your experience.</p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <Label htmlFor="firstName" className="text-navy font-bold text-base">First name</Label>
                  <Input 
                    id="firstName" 
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="h-14 bg-white border-border rounded-xl text-lg px-4 focus-visible:ring-cyan" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <Label htmlFor="age" className="text-navy font-bold text-base">Age</Label>
                    <Input 
                      id="age" 
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="h-14 bg-white border-border rounded-xl text-lg px-4 focus-visible:ring-cyan" 
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-navy font-bold text-base">Sex</Label>
                    <Select value={sex} onValueChange={setSex}>
                      <SelectTrigger className="h-14 bg-white border-border rounded-xl text-lg px-4 focus:ring-cyan">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-navy font-bold text-base">Education level</Label>
                  <Select value={education} onValueChange={setEducation}>
                    <SelectTrigger className="h-14 bg-white border-border rounded-xl text-lg px-4 focus:ring-cyan">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High School">High School</SelectItem>
                      <SelectItem value="Some College">Some College</SelectItem>
                      <SelectItem value="Bachelors">Bachelor's Degree</SelectItem>
                      <SelectItem value="Masters">Master's Degree or higher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4 pt-2">
                  <Label className="text-navy font-bold text-base">What brings you here?</Label>
                  <RadioGroup value={reason} onValueChange={setReason} className="space-y-3">
                    {[
                      "Family history",
                      "Noticing small changes",
                      "Staying proactive",
                      "Other"
                    ].map(opt => (
                      <div key={opt} className="flex items-center space-x-3 bg-white p-4 border border-border rounded-xl has-[:checked]:border-cyan has-[:checked]:bg-cyan/5 transition-colors cursor-pointer">
                        <RadioGroupItem value={opt} id={`reason-${opt}`} className="text-cyan focus-visible:ring-cyan" />
                        <Label htmlFor={`reason-${opt}`} className="flex-1 text-base cursor-pointer font-medium text-navy">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <Button 
                onClick={handleNext}
                disabled={!firstName || !age || !sex || !education || !reason}
                className="w-full h-14 text-lg bg-navy hover:bg-navy/90 text-white rounded-2xl shadow-md transition-all disabled:opacity-50"
              >
                Continue
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-bold text-navy tracking-tight">
                  Health context
                </h2>
                <p className="text-navy/60 font-medium">This helps us tailor your goals. Feel free to skip.</p>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <Label className="text-navy font-bold text-base">Any existing conditions?</Label>
                  <div className="space-y-3">
                    {[
                      "High blood pressure",
                      "High cholesterol",
                      "Diabetes",
                      "Heart disease",
                      "Depression / Anxiety"
                    ].map(opt => (
                      <div key={opt} className="flex items-center space-x-3 bg-white p-4 border border-border rounded-xl transition-colors hover:bg-gray-50 cursor-pointer has-[:checked]:border-cyan has-[:checked]:bg-cyan/5">
                        <Checkbox 
                          id={`cond-${opt}`} 
                          checked={conditions.includes(opt)}
                          onCheckedChange={(c) => {
                            if (c) setConditions([...conditions, opt]);
                            else setConditions(conditions.filter(x => x !== opt));
                          }}
                          className="data-[state=checked]:bg-cyan data-[state=checked]:text-navy data-[state=checked]:border-cyan"
                        />
                        <Label htmlFor={`cond-${opt}`} className="flex-1 text-base cursor-pointer font-medium text-navy">{opt}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-navy font-bold text-base">Family history of memory issues?</Label>
                  <RadioGroup value={familyHistory} onValueChange={setFamilyHistory} className="grid grid-cols-3 gap-3">
                    {["Yes", "No", "Unsure"].map(opt => (
                      <div key={opt} className="flex items-center justify-center bg-white p-4 border border-border rounded-xl has-[:checked]:border-cyan has-[:checked]:bg-cyan/5 transition-colors cursor-pointer text-center">
                        <RadioGroupItem value={opt} id={`fh-${opt}`} className="sr-only" />
                        <Label htmlFor={`fh-${opt}`} className="cursor-pointer font-bold text-navy">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <Button 
                  variant="outline" 
                  onClick={handleSkipHealth}
                  className="flex-1 h-14 text-lg border-border hover:bg-white text-navy font-bold rounded-2xl"
                >
                  Skip
                </Button>
                <Button 
                  onClick={handleNext}
                  className="flex-1 h-14 text-lg bg-navy hover:bg-navy/90 text-white rounded-2xl shadow-md transition-all"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-8 animate-in slide-in-from-right-8 fade-in duration-500">
              <div className="w-24 h-24 mx-auto bg-cyan/10 rounded-full flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-cyan/20 rounded-full flex items-center justify-center animate-[pulse_2s_ease-in-out_infinite]">
                  <Brain className="w-8 h-8 text-cyan" />
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl font-bold text-navy tracking-tight">
                  You're all set, {firstName || "friend"}.
                </h2>
                <p className="text-lg text-navy/70 font-medium leading-relaxed px-4">
                  We'll start with a quick baseline to set your Remembrance Score. It takes just a few minutes.
                </p>
              </div>
              <div className="pt-8">
                <Button 
                  onClick={handleNext}
                  className="w-full h-16 text-xl bg-cyan hover:bg-cyan/90 text-navy font-extrabold rounded-2xl shadow-lg hover-elevate transition-all"
                >
                  Start baseline
                </Button>
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  );
}
