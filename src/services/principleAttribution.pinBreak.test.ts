// THE PIN THAT DOES NOT HOLD — both seats, on one real game (David 2026-10-17:
// "number two yes" — the pin-break computer feeds the record both ways).
// Lichess DW0HNXnW (rated classical 2020, 1726 vs 1915; Lichess puzzle 0FyKe).
// White's 24.Qh4 leans on the pin of the f6-rook to the d8-queen, but …Rxf1+
// walks out with check and wins the queen on h4. Black answered 24…g5 and never
// took it. Stockfish 16 depth 18: Qg3 keeps +2.85; Qh4 is −6.24 after Rxf1+.
import { describe, it, expect } from "vitest";
import { attributePrinciples, FUNDAMENTAL_TAG } from "./principleAttribution";
import { renderFundamentalVerdict } from "./principleVoice";

const GAME = "d4 d5 c4 e6 Nc3 Bb4 e3 dxc4 Bxc4 Nf6 a3 Be7 Nf3 O-O e4 h6 e5 Nfd7 Be3 Nb6 Bb3 c6 O-O Nd5 Bc2 Nxe3 fxe3 b6 Qd3 g6 Qe4 Nd7 Qg4 Qe8 Nh4 Bxh4 Qxh4 Kh7 Ne4 Qd8 Qf2 Kg7 Nd6 f5 exf6+ Rxf6".split(" ");
const LEAN = [...GAME, "Qh4"];
const MISS = [...LEAN, "g5"];
const ids = (xs: { id: string }[]) => xs.map((x) => x.id);

describe("ignored-pin-break — the student leaned on a pin that does not hold", () => {
  const input = {
    historySans: LEAN, bestSan: "Qg3", classification: "blunder", replySan: null,
    pvAfterBest: ["Ba6", "Rfd1", "g5", "e4", "Rf4", "e5", "c5", "Qe3", "cxd4", "Rxd4"],
    pvAfterPlayed: ["Rxf1+", "Rxf1", "Qxh4", "Rf7+", "Kg8", "Rf2", "Ba6", "Bxg6"],
  };
  it("files it under the opponent's threat, naming the pinned rook, the pinner and the escape", () => {
    const a = attributePrinciples(input).find((x) => x.id === "ignored-pin-break");
    expect(a, JSON.stringify(ids(attributePrinciples(input)))).toBeTruthy();
    expect(a!.tag).toBe(FUNDAMENTAL_TAG["ignored-pin-break"]);
    expect(a!.tag).toBe("missed-opponents-threat");
    expect(a!.facts).toMatchObject({ hit: "Rxf1+", piece: "rook", square: "f6", pinner: "queen", pinnerSq: "h4", how: "check" });
    const v = renderFundamentalVerdict([a!], { replySan: null, ply: 0, seen: new Set() });
    expect(v).toMatch(/Rxf1\+/);
    expect(v).toMatch(/check/);
  });
  it("silent on the safe queen move (Qg3 leaves no pin to walk out of)", () => {
    const out = attributePrinciples({ ...input, historySans: [...GAME, "Qg3"] });
    expect(ids(out)).not.toContain("ignored-pin-break");
  });
});

describe("missed-pin-break — the student stayed in a pin they could break", () => {
  const input = {
    historySans: MISS, bestSan: "Rxf1+", classification: "blunder", replySan: null,
    pvAfterBest: ["Rxf1", "Qxh4", "Bd3", "Nf6", "h3", "Qg5"],
    pvAfterPlayed: ["Qe4", "Ba6", "Qh7+", "Kf8", "Rxf6+", "Qxf6"],
  };
  it("files it under their pin (it is their pin you stayed in), with the escape as the better move", () => {
    const a = attributePrinciples(input).find((x) => x.id === "missed-pin-break");
    expect(a, JSON.stringify(ids(attributePrinciples(input)))).toBeTruthy();
    expect(a!.tag).toBe(FUNDAMENTAL_TAG["missed-pin-break"]);
    expect(a!.tag).toBe("missed-their-pin");
    expect(a!.facts).toMatchObject({ better: "Rxf1+", piece: "rook", square: "f6", pinnerSq: "h4", how: "check" });
    const v = renderFundamentalVerdict([a!], { replySan: null, ply: 0, seen: new Set() });
    expect(v).toMatch(/Rxf1\+/);
    expect(v).toMatch(/rook on f6/);
  });
  it("silent when the best move is not the escape", () => {
    const out = attributePrinciples({ ...input, bestSan: "Kh7" });
    expect(ids(out)).not.toContain("missed-pin-break");
  });
});
