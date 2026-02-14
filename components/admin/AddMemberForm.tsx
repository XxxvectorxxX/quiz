"use client";

import * as React from "react";
import { UserAutocomplete } from "@/components/admin/UserAutocomplete";
import { Button } from "@/components/ui/button";

type ProfileLite = { id: string; full_name: string | null; email: string | null };

export function AddMemberForm({
  teamId,
  addMemberAction,
}: {
  teamId: string;
  addMemberAction: (formData: FormData) => Promise<void>;
}) {
  const [picked, setPicked] = React.useState<ProfileLite | null>(null);

  return (
    <div className="space-y-3">
      <UserAutocomplete onSelect={(u) => setPicked(u)} />

      <form action={addMemberAction} className="space-y-2">
        <input type="hidden" name="team_id" value={teamId} />
        <input type="hidden" name="user_id" value={picked?.id ?? ""} />

        {picked ? (
          <div className="text-sm">
            Selecionado: <b>{picked.full_name ?? "Sem nome"}</b> ({picked.email ?? "sem email"})
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Selecione um usuário acima.</div>
        )}

        <Button type="submit" disabled={!picked}>
          Adicionar membro
        </Button>
      </form>
    </div>
  );
}
