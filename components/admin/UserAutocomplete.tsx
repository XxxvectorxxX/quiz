"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

type UserItem = { id: string; full_name: string | null; email: string | null }

function useDebouncedValue<T>(value: T, delay = 250) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function UserAutocomplete({
  teamId,
  action,
}: {
  teamId: string
  action: (formData: FormData) => void
}) {
  const [q, setQ] = useState("")
  const debounced = useDebouncedValue(q, 250)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<UserItem[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<UserItem | null>(null)

  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const query = debounced.trim()
    setSelected(null)

    if (query.length < 2) {
      setItems([])
      setOpen(false)
      return
    }

    setLoading(true)
    setOpen(true)

    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac

    fetch(`/api/admin/users?q=${encodeURIComponent(query)}`, { signal: ac.signal })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json()
      })
      .then((json) => setItems(json.users ?? []))
      .catch(() => {
        // ignora erro de abort / rede
        setItems([])
      })
      .finally(() => setLoading(false))
  }, [debounced])

  const displayValue = useMemo(() => {
    if (selected) return `${selected.full_name ?? "Sem nome"} — ${selected.email ?? ""}`.trim()
    return q
  }, [selected, q])

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Buscar usuário (nome ou email)</label>
      <div className="relative">
        <Input
          value={displayValue}
          onChange={(e) => {
            setQ(e.target.value)
            setSelected(null)
          }}
          onFocus={() => {
            if (items.length > 0) setOpen(true)
          }}
          placeholder="Digite: joao@... ou João"
        />

        {open ? (
          <div className="absolute z-20 mt-2 w-full rounded-md border bg-white shadow-md overflow-hidden">
            <div className="px-3 py-2 text-xs text-muted-foreground border-b">
              {loading ? "Procurando..." : items.length ? "Selecione um usuário" : "Nenhum encontrado"}
            </div>

            <div className="max-h-56 overflow-auto">
              {items.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted"
                  onClick={() => {
                    setSelected(u)
                    setOpen(false)
                  }}
                >
                  <div className="text-sm font-medium">{u.full_name ?? "Sem nome"}</div>
                  <div className="text-xs text-muted-foreground">{u.email ?? u.id}</div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Form de adicionar */}
      <form
        action={action}
        onSubmit={(e) => {
          if (!selected?.id) {
            e.preventDefault()
            alert("Selecione um usuário da lista antes de adicionar.")
          }
        }}
        className="flex items-center gap-2"
      >
        <input type="hidden" name="team_id" value={teamId} />
        <input type="hidden" name="user_id" value={selected?.id ?? ""} />

        <select
          name="role"
          className="h-10 rounded-md border bg-white px-3 text-sm"
          defaultValue="member"
        >
          <option value="member">member</option>
          <option value="co_leader">co_leader</option>
        </select>

        <Button type="submit" variant="outline" disabled={!selected?.id}>
          Adicionar
        </Button>
      </form>
    </div>
  )
}
