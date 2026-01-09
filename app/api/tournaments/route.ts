import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description, organizationId, format } = body;

    // Gerar código de convite único
    const inviteCode = generateInviteCode();

    const tournament = {
      id: generateId(),
      name,
      description,
      organizationId,
      inviteCode,
      format,
      status: 'pending',
      teams: [],
      matches: [],
      spectators: [],
      timer: 30,
      createdAt: new Date(),
    };

    // Salvar no banco de dados
    // await db.tournaments.create(tournament);

    return NextResponse.json(tournament);
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar torneio' },
      { status: 500 }
    );
  }
}

// Entrar no torneio
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { tournamentId, teamId, action } = body;

    if (action === 'join') {
      // Adicionar equipe ao torneio
      // await db.tournaments.update(tournamentId, { $push: { teams: teamId } });
    } else if (action === 'spectate') {
      // Adicionar espectador
      // await db.tournaments.update(tournamentId, { $push: { spectators: userId } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao processar ação' },
      { status: 500 }
    );
  }
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

function generateId(): string {
  return Math.random().toString(36).substring(2);
}