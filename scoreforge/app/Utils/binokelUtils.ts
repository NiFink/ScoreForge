import type {
  BinokelParty,
  BinokelRound,
  Player,
} from "../types/gameTypes";

// Bei 4 Spielern spielen Gegenüber zusammen (1+3 gegen 2+4)
export function getParties(players: Player[]): BinokelParty[] {
  if (players.length === 4) {
    return [
      {
        id: "team-1",
        name: `${players[0].name} & ${players[2].name}`,
        color: players[0].color,
        memberIds: [players[0].id, players[2].id],
      },
      {
        id: "team-2",
        name: `${players[1].name} & ${players[3].name}`,
        color: players[1].color,
        memberIds: [players[1].id, players[3].id],
      },
    ];
  }

  return players.map((player) => ({
    id: player.id,
    name: player.name,
    color: player.color,
    memberIds: [player.id],
  }));
}

export function roundToTens(value: number) {
  return Math.round(value / 10) * 10;
}

export function createEmptyRound(parties: BinokelParty[]): BinokelRound {
  return {
    bidderPartyId: null,
    bid: null,
    melds: Object.fromEntries(parties.map((party) => [party.id, null])),
    tricks: Object.fromEntries(parties.map((party) => [party.id, null])),
  };
}

export function isRoundComplete(
  round: BinokelRound,
  parties: BinokelParty[],
) {
  return (
    !!round.bidderPartyId &&
    round.bid !== null &&
    parties.every(
      (party) =>
        round.melds[party.id] !== null &&
        round.melds[party.id] !== undefined &&
        round.tricks[party.id] !== null &&
        round.tricks[party.id] !== undefined,
    )
  );
}

export type PartyRoundResult = {
  points: number;
  madeBid: boolean | null;
};

// Ob das Gebot erreicht wurde, entscheiden die genauen Augen;
// gutgeschrieben wird auf Zehner gerundet. Ohne Stich zählen Meldungen nicht.
export function scoreBinokelRound(
  round: BinokelRound,
  parties: BinokelParty[],
): Record<string, PartyRoundResult> {
  const results: Record<string, PartyRoundResult> = {};

  for (const party of parties) {
    const melds = round.melds[party.id] ?? 0;
    const tricks = round.tricks[party.id] ?? 0;

    if (round.bidderPartyId === party.id) {
      const bid = round.bid ?? 0;
      const exact = melds + tricks;

      results[party.id] =
        exact >= bid
          ? { points: roundToTens(exact), madeBid: true }
          : { points: -bid, madeBid: false };
    } else {
      results[party.id] = {
        points: tricks > 0 ? roundToTens(melds + tricks) : 0,
        madeBid: null,
      };
    }
  }

  return results;
}

export function getBinokelTotals(
  rounds: BinokelRound[],
  parties: BinokelParty[],
): Record<string, number> {
  const totals = Object.fromEntries(parties.map((party) => [party.id, 0]));

  for (const round of rounds) {
    if (!isRoundComplete(round, parties)) {
      continue;
    }

    const results = scoreBinokelRound(round, parties);

    for (const party of parties) {
      totals[party.id] += results[party.id]?.points ?? 0;
    }
  }

  return totals;
}
