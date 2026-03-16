import { db } from '../db/schema';
import type { OpeningRecord, ProPlayer } from '../types';
import proRepertoireData from '../data/pro-repertoires.json';

interface ProRepertoireJson {
  players: ProPlayer[];
  openings: Array<{
    id: string;
    playerId: string;
    eco: string;
    name: string;
    pgn: string;
    color: 'white' | 'black';
    style: string;
    overview: string;
    keyIdeas: string[];
    traps: string[];
    warnings: string[];
    variations: Array<{ name: string; pgn: string; explanation: string }>;
    trapLines?: Array<{ name: string; pgn: string; explanation: string }>;
    warningLines?: Array<{ name: string; pgn: string; explanation: string }>;
  }>;
}

const data = proRepertoireData as ProRepertoireJson;

export function getPlayers(): ProPlayer[] {
  return data.players;
}

export function getPlayerById(playerId: string): ProPlayer | undefined {
  return data.players.find((p) => p.id === playerId);
}

export async function getPlayerOpenings(playerId: string): Promise<OpeningRecord[]> {
  const all = await db.openings.toArray();
  return all.filter((o) => o.proPlayerId === playerId);
}
