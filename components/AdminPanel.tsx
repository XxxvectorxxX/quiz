// components/AdminPanel.tsx
'use client';

import { useState } from 'react';
import { Trash2, Shield, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  organizationId?: string;
  createdAt: Date;
}

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUsers(users.filter((u) => u.id !== userId));
        setUserToDelete(null);
        alert('Usuário deletado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao deletar usuário:', error);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Shield className="w-8 h-8" />
          Painel de Administração
        </h1>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
        <Input
          placeholder="Buscar usuários por nome ou email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabela de Usuários */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Função</TableHead>
            <TableHead>Organização</TableHead>
            <TableHead>Data de Cadastro</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {user.role === 'admin' ? 'Admin' : 'Usuário'}
                </span>
              </TableCell>
              <TableCell>
                {user.organizationId || '-'}
              </TableCell>
              <TableCell>
                {new Date(user.createdAt).toLocaleDateString('pt-BR')}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setUserToDelete(user)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Dialog de Confirmação */}
      <AlertDialog
        open={!!userToDelete}
        onOpenChange={() => setUserToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar o usuário{' '}
              <strong>{userToDelete?.name}</strong>? Esta ação não pode ser
              desfeita e todos os dados do usuário serão permanentemente
              removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => userToDelete && handleDeleteUser(userToDelete.id)}
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}