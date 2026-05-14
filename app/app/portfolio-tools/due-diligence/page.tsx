'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card } from '@/components/Card';
import { BlurFade } from '@/components/ui/blur-fade';
import { CheckSquare, ArrowLeft, Info, AlertTriangle, BadgeCheck } from 'lucide-react';

const QUESTIONS = [
  { id: 'rev', label: 'Revenue Growth', desc: 'Is the company consistently growing its top-line revenue year over year?' },
  { id: 'margin', label: 'Margin Expansion', desc: 'Are gross and operating margins improving or remaining highly stable?' },
  { id: 'debt', label: 'Manageable Debt', desc: 'Is the debt-to-equity ratio low, and is interest coverage comfortable?' },
  { id: 'moat', label: 'Competitive Moat', desc: 'Does the business have a durable competitive advantage (brand, network effect, cost)?' },
  { id: 'mgmt', label: 'Strong Management', desc: 'Is the leadership team experienced with a track record of capital allocation?' },
  { id: 'yield', label: 'Shareholder Return', desc: 'Are they buying back shares or paying a sustainable, growing dividend?' },
  { id: 'macro', label: 'Macro Tailwinds', desc: 'Is the broader sector or macroeconomic environment providing a tailwind?' },
  { id: 'value', label: 'Attractive Valuation', desc: 'Is the valuation (P/E, EV/EBITDA, P/FCF) historically cheap or lower than peers?' },
];

export default function DueDiligence() {
  const [ticker, setTicker] = useState('');
  const [answers, setAnswers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/me/track', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ type: 'DUE_DILIGENCE_UPDATE', path: '/app/portfolio-tools/due-diligence' }) }).catch(() => null);
  }, []);

  const toggleAnswer = (id: string) => {
    setAnswers(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const score = Object.values(answers).filter(Boolean).length;
  const maxScore = QUESTIONS.length;
  
  let resultTone = 'zinc';
  let resultText = 'Needs Analysis';
  let ResultIcon = Info;
  
  if (score === maxScore) {
    resultTone = 'emerald';
    resultText = 'Conviction Buy';
    ResultIcon = BadgeCheck;
  } else if (score >= 6) {
    resultTone = 'emerald';
    resultText = 'Strong Candidate';
    ResultIcon = BadgeCheck;
  } else if (score >= 4) {
    resultTone = 'amber';
    resultText = 'Proceed with Caution';
    ResultIcon = AlertTriangle;
  } else if (score > 0) {
    resultTone = 'rose';
    resultText = 'High Risk / Speculative';
    ResultIcon = AlertTriangle;
  }

  return (
    <div className="space-y-8 pb-12 max-w-4xl mx-auto">
      <BlurFade delay={0.1}>
        <div className="mb-4">
          <Link href="/app" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-3"><CheckSquare className="h-6 w-6 text-blue-500" /></div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Due Diligence Checklist</h1>
            <p className="mt-1 text-sm text-muted-foreground">The 8-point scorecard for evaluating asset conviction.</p>
          </div>
        </div>
      </BlurFade>

      <BlurFade delay={0.2}>
        <div className="grid gap-6 md:grid-cols-12">
          {/* Checklist */}
          <div className="md:col-span-8 space-y-4">
            <Card>
              <div className="mb-6">
                <input 
                  type="text" 
                  placeholder="Asset Ticker (e.g. AAPL)" 
                  value={ticker} 
                  onChange={(e) => setTicker(e.target.value)}
                  className="w-full text-xl font-bold uppercase tracking-wider rounded-xl border border-border bg-muted/20 px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition"
                />
              </div>
              
              <div className="space-y-3">
                {QUESTIONS.map((q) => {
                  const isChecked = !!answers[q.id];
                  return (
                    <button 
                      key={q.id}
                      onClick={() => toggleAnswer(q.id)}
                      className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 ${
                        isChecked 
                          ? 'border-emerald-500/50 bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.05)]' 
                          : 'border-border bg-card hover:bg-muted/30 hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
                        isChecked ? 'border-emerald-500 bg-emerald-500 text-black' : 'border-muted-foreground bg-transparent'
                      }`}>
                        {isChecked && <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div>
                        <div className={`font-bold ${isChecked ? 'text-emerald-400' : 'text-foreground'}`}>{q.label}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{q.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Score Summary */}
          <div className="md:col-span-4 space-y-4">
            <div className="sticky top-6">
              <Card title="Conviction Score">
                <div className="text-center py-6">
                  <div className="text-6xl font-black font-mono tracking-tighter">
                    <span className="text-foreground">{score}</span>
                    <span className="text-muted-foreground/30">/{maxScore}</span>
                  </div>
                  
                  <div className="mt-8">
                    <div className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold bg-${resultTone}-500/10 text-${resultTone}-500 ring-1 ring-inset ring-${resultTone}-500/20`}>
                      <ResultIcon className="h-4 w-4" />
                      {resultText}
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 border-t border-border pt-4">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    A score of 6 or higher generally indicates a high-quality business with strong fundamentals and a margin of safety. Use this tool alongside technical analysis.
                  </p>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </BlurFade>
    </div>
  );
}
