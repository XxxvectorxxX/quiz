"use client";

import { Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function TournamentButton() {
  return (
    <Button 
      className="w-full flex items-center gap-2"
      onClick={() => router.push('/tournaments')}
    >
      <Trophy className="w-5 h-5" />
      Torneios
    </Button>
  );
}