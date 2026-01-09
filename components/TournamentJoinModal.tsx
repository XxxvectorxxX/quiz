// components/TournamentJoinModal.tsx
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface TournamentJoinModalProps {
  open: boolean;
  onClose: () => void;
  onJoin: (code: string, teamId: string) => void;
  userTeams: Array<{ id: string; name: string }>;
}

export function TournamentJoinModal({ 
  open, 
  onClose, 
  onJoin,
  userTeams 
}: TournamentJoinModalProps) {
  const [code, setCode] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');

  const handleSubmit = () => {
    if (code && selectedTeam) {
      onJoin(code, selectedTeam);
      setCode('');
      setSelectedTeam('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Entrar no Torneio</DialogTitle>
          <DialogDescription>
            Insira o código de convite e selecione sua equipe
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="code">Código do Torneio</Label>
            <Input
              id="code"
              placeholder="Digite o código"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
          </div>

          <div>
            <Label htmlFor="team">Selecione sua Equipe</Label>
            <select
              id="team"
              className="w-full p-2 border rounded"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="">Selecione...</option>
              {userTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSubmit}
            disabled={!code || !selectedTeam}
          >
            Entrar no Torneio
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}