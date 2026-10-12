"use client";

import { ArrowRight, BookOpen, CheckCircle2, Gift, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface WelcomeRewardModalProps {
  open: boolean;
  pointsAwarded: number;
  onClose: () => void;
  onGoToDashboard: () => void;
  onExploreSkills: () => void;
}

/**
 * Minimal registration celebration. It is intentionally driven by the
 * confirmed reward amount returned by the backend; it must not be opened
 * with a hardcoded award before the wallet/ledger grant is confirmed.
 */
export function WelcomeRewardModal({ open, pointsAwarded, onClose, onGoToDashboard, onExploreSkills }: WelcomeRewardModalProps) {
  if (!open) return null;
  return (
    <div className="welcome-reward-overlay" role="presentation">
      <section aria-modal="true" role="dialog" aria-labelledby="welcome-reward-title" className="welcome-reward-card">
        <button type="button" onClick={onClose} aria-label="Close welcome message" className="welcome-reward-close"><X className="size-5" /></button>
        <div className="welcome-reward-art" aria-hidden="true"><span className="welcome-reward-art-orb"/><span className="welcome-reward-gift"><Gift className="size-12"/></span><span className="welcome-reward-art-sparkle"><Sparkles className="size-5"/></span></div>
        <div className="welcome-reward-copy">
          <span className="welcome-reward-success"><CheckCircle2 className="size-4"/> Account created successfully</span>
          <h2 id="welcome-reward-title">Welcome to <span>TalentSwap!</span></h2>
          <p className="welcome-reward-description">A new skill, a new connection, a new possibility. Let's learn and grow together.</p>
          <div className="welcome-reward-points"><span className="welcome-reward-coin"><Sparkles className="size-6"/></span><div><p className="welcome-reward-number">{pointsAwarded.toLocaleString()} <span>SkillPoints</span></p><p className="text-sm text-muted-foreground">Added to your wallet</p></div></div>
          <div className="welcome-reward-actions"><Button onClick={onGoToDashboard} className="w-full rounded-xl">Go to Dashboard <ArrowRight className="size-4"/></Button><Button onClick={onExploreSkills} variant="outline" className="w-full rounded-xl"><BookOpen className="size-4"/> Explore Skills</Button></div>
        </div>
      </section>
    </div>
  );
}
