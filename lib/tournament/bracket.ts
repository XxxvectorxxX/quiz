// lib/tournament/bracket.ts
export type UUID = string;

export type Slot = "team1" | "team2";

export type TeamSeed = {
  id: UUID;
  name?: string;
};

export type BracketMatchSeed = {
  /** key estável para mapear inserts -> next pointers */
  key: string; // ex: "r1:m0"
  round: number; // 1..N
  match_index: number; // 0..K
  team1_id: UUID | null;
  team2_id: UUID | null;
  /** link para o próximo match */
  next_key: string | null;
  next_slot: Slot | null;
};

function nextPowerOf2(n: number) {
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

function makeKey(round: number, matchIndex: number) {
  return `r${round}:m${matchIndex}`;
}

/**
 * Gera bracket single-elimination completo com BYEs corretos.
 * Estratégia:
 * - Completa até potência de 2 com null (BYE)
 * - Round 1: pares (0,1), (2,3) ...
 * - Próximos rounds: vencedores alimentam (match_index/2)
 */
export function generateFullBracket(teams: TeamSeed[]): BracketMatchSeed[] {
  if (teams.length < 2) return [];

  const size = nextPowerOf2(teams.length);
  const padded: Array<TeamSeed | null> = [...teams];
  while (padded.length < size) padded.push(null);

  const rounds = Math.log2(size);
  const all: BracketMatchSeed[] = [];

  // Round 1
  const r1Matches = size / 2;
  for (let i = 0; i < r1Matches; i++) {
    const t1 = padded[i * 2];
    const t2 = padded[i * 2 + 1];
    const nextRound = 2;
    const nextMatchIndex = Math.floor(i / 2);
    const nextKey = rounds >= 2 ? makeKey(nextRound, nextMatchIndex) : null;
    const nextSlot: Slot | null = rounds >= 2 ? (i % 2 === 0 ? "team1" : "team2") : null;

    all.push({
      key: makeKey(1, i),
      round: 1,
      match_index: i,
      team1_id: t1?.id ?? null,
      team2_id: t2?.id ?? null,
      next_key: nextKey,
      next_slot: nextSlot,
    });
  }

  // Rounds 2..N (sem teams ainda; só estrutura)
  for (let round = 2; round <= rounds; round++) {
    const matchCount = size / (2 ** round);
    for (let i = 0; i < matchCount; i++) {
      const nextRound = round + 1;
      const nextMatchIndex = Math.floor(i / 2);
      const nextKey = round < rounds ? makeKey(nextRound, nextMatchIndex) : null;
      const nextSlot: Slot | null = round < rounds ? (i % 2 === 0 ? "team1" : "team2") : null;

      all.push({
        key: makeKey(round, i),
        round,
        match_index: i,
        team1_id: null,
        team2_id: null,
        next_key: nextKey,
        next_slot: nextSlot,
      });
    }
  }

  return all;
}

/**
 * Ajuda: detecta BYE (team2 null e team1 não-null).
 * Isso será usado para auto-advance no start/regenerate.
 */
export function isByeMatch(m: Pick<BracketMatchSeed, "team1_id" | "team2_id">) {
  return !!m.team1_id && !m.team2_id;
}
