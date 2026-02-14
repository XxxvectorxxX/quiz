"use client";


import { useState } from 'react';
import { Church, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function OrganizationJoin() {
  const [orgType, setOrgType] = useState<'church' | 'group' | null>(null);
  const [inviteCode, setInviteCode] = useState('');

  const handleJoin = async () => {
    // Lógica para entrar na organização
    try {
      const response = await fetch('/api/organizations/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode, type: orgType }),
      });
      
      if (response.ok) {
        alert('Você entrou na organização com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao entrar na organização:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Associar-se a uma Organização</CardTitle>
        <CardDescription>
          Entre para uma igreja ou grupo para participar de competições exclusivas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label>Tipo de Organização</Label>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <Button
              variant={orgType === 'church' ? 'default' : 'outline'}
              className="flex flex-col items-center p-6 h-auto"
              onClick={() => setOrgType('church')}
            >
              <Church className="w-8 h-8 mb-2" />
              Igreja
            </Button>
            <Button
              variant={orgType === 'group' ? 'default' : 'outline'}
              className="flex flex-col items-center p-6 h-auto"
              onClick={() => setOrgType('group')}
            >
              <Users className="w-8 h-8 mb-2" />
              Grupo
            </Button>
          </div>
        </div>

        {orgType && (
          <div>
            <Label htmlFor="invite-code">Código de Convite</Label>
            <Input
              id="invite-code"
              placeholder="Digite o código"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              maxLength={10}
            />
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleJoin}
          disabled={!orgType || !inviteCode}
        >
          Entrar na Organização
        </Button>
      </CardContent>
    </Card>
  );
}