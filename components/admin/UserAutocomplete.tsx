"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type ProfileLite = { id: string; full_name: string | null; email: string | null };

export function UserAutocomplete({
  onSelect,
  disabled,
}: {
  onSelect: (u: ProfileLite) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const [items, setItems] = React.useState<ProfileLite[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [selected, setSelected] = React.useState<ProfileLite | null>(null);

  const supabase = React.useMemo(() => createClient(), []);

  React.useEffect(() => {
    const t = setTimeout(async () => {
      const query = q.trim();
      if (query.length < 2) {
        setItems([]);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/users?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setItems(json.users ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, supabase]);

  return (
    <div className="space-y-2">
      <Input
        value={q}
        disabled={disabled}
        onChange={(e) => {
          setQ(e.target.value);
          setSelected(null);
        }}
        placeholder="Digite nome ou email..."
      />

      <div className="rounded-md border bg-background">
        <div className="p-2 text-xs text-muted-foreground">
          {loading ? "Buscando..." : items.length ? "Selecione um usuário:" : "Digite pelo menos 2 caracteres."}
        </div>

        {!!items.length && (
          <ul className="max-h-56 overflow-auto">
            {items.map((u) => {
              const label = `${u.full_name ?? "Sem nome"} — ${u.email ?? "sem email"}`;
              const active = selected?.id === u.id;
              return (
                <li key={u.id}>
                  <button
                    type="button"
                    className={`w-full px-3 py-2 text-left text-sm hover:bg-accent ${
                      active ? "bg-accent" : ""
                    }`}
                    onClick={() => setSelected(u)}
                  >
                    {label}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Button
        type="button"
        disabled={disabled || !selected}
        onClick={() => selected && onSelect(selected)}
      >
        Adicionar
      </Button>
    </div>
  );
}
