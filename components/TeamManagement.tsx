"use client";

import { useState } from 'react';
import { Trash2, UserPlus, UserMinus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TeamManagementProps {
  team: CompetitionTeam;
  isOwner: boolean;
  competitionType: '1vs1' | 'team';
  onDeleteTeam: () => void;
  onAddMember: (userId: string) => void;
  onRemoveMember: (userId: string) => void;
  onChangeTeamSize: (newSize: number) => void;
}

export function TeamManagement({
  team,
  isOwner,
  competitionType,
  onDeleteTeam,
  onAddMember,
  onRemoveMember,
  onChangeTeamSize,
}: TeamManagementProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showSizeDialog, setShowSizeDialog] = useState(false);
  const [newSize, setNewSize] = useState(team.members.length);

  if (!isOwner) {
    return null;
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-bold text-lg">Gerenciar Equipe</h3>
      
      <div className="flex flex-wrap gap-2">
        {/* Excluir Equipe */}
        {team.permissions.canDeleteTeam && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Equipe
          </Button>
        )}

        {/* Gerenciar Membros (não disponível em 1vs1) */}
        {competitionType !== '1vs1' && team.permissions.canManageMembers && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {/* Abrir modal de adicionar */}}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Adicionar Membro
            </Button>
          </>
        )}

        {/* Alterar Tamanho da Equipe */}
        {team.permissions.canChangeTeamSize && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSizeDialog(true)}
          >
            <Settings className="w-4 h-4 mr-2" />
            Alterar Tamanho
          </Button>
        )}
      </div>

      {/* Listagem de Membros */}
      {competitionType !== '1vs1' && (
        <div className="mt-4">
          <h4 className="font-semibold mb-2">Membros:</h4>
          <div className="space-y-2">
            {team.members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <span>
                  {member.name}
                  {member.role === 'owner' && (
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Dono
                    </span>
                  )}
                </span>
                {member.role !== 'owner' && team.permissions.canManageMembers && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveMember(member.userId)}
                  >
                    <UserMinus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dialog de Confirmação - Excluir */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Equipe</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta equipe? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteTeam}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog - Alterar Tamanho */}
      <AlertDialog open={showSizeDialog} onOpenChange={setShowSizeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Alterar Tamanho da Equipe</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mt-4">
                <label className="block mb-2">Novo tamanho:</label>
                <input
                  type="number"
                  min={team.members.length}
                  max={20}
                  value={newSize}
                  onChange={(e) => setNewSize(parseInt(e.target.value))}
                  className="w-full p-2 border rounded"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => onChangeTeamSize(newSize)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}