// RIGHT MOVES, WRONG ORDER — the move-order lesson from the slip's side
// (David 2026-10-17: "number two yes" — every new computer feeds the record).
// A real game: Kramnik, Scotch Four Knights (model game
// mg-kramnik-scotch-four-knights), Black's 37…Bc7. Stockfish 16 depth 15: …Nc6
// first and …Bc7 next holds; …Bc7 at once drops 213 centipawns to Qd7.
import { describe, it, expect } from "vitest";
import { attributePrinciples, FUNDAMENTAL_TAG } from "./principleAttribution";
import { renderFundamentalVerdict, verdictAlone } from "./principleVoice";


const HIST = ["e4","e5","Nf3","Nc6","Nc3","Nf6","d4","exd4","Nxd4","Bc5","Be3","Bb6","Qd2","O-O","O-O-O","Re8","f3","d5","exd5","Nxd5","Bg5","Nxc3","Bxd8","Nxd1","Bxc7","Bxc7","Nxc6","Ne3","Bb5","bxc6","Bxc6","Nc4","Qd4","Be6","Bxa8","Bb6","Qd3","Rxa8","Re1","Rd8","Qe4","g5","c3","Bc5","Re2","h6","g3","a5","f4","a4","f5","Bd5","Qd3","Bb6","b3","axb3","axb3","Na5","Re8+","Rxe8","Qxd5","Rd8","Qb5","Rd6","Kc2","Kg7","b4","Nb7","c4","Rf6","g4","Nd8","c5","Bc7"];
const PV_BEST = ["Qa4","Bc7","b5","Nb8","h3","h5","Qd4","hxg4","Qxg4","Bf4","h4"];
const PV_PLAYED = ["Qd7","Rc6","Qd4+","Rf6","b5","Ba5","Qd5","Bb4","Kb3","Bxc5","Qxc5","Nb7","Qd4","Nd6","Qd5"];

describe("wrong-move-order — the student played the engine's second move first", () => {
  it("files it under the opponent's threat, names the order, and says the line wins", () => {
    const out = attributePrinciples({ historySans: HIST, bestSan: "Nc6", classification: "mistake", replySan: null, pvAfterPlayed: PV_PLAYED, pvAfterBest: PV_BEST });
    const a = out.find((x) => x.id === "wrong-move-order");
    expect(a, JSON.stringify(out.map((x) => x.id))).toBeTruthy();
    expect(a!.tag).toBe(FUNDAMENTAL_TAG["wrong-move-order"]);
    expect(a!.tag).toBe("missed-opponents-threat");
    expect(a!.facts).toMatchObject({ better: "Nc6", played: "Bc7", punish: "Qd7" });
    const v = verdictAlone(renderFundamentalVerdict([a!], { replySan: null, ply: 0, seen: new Set() }));
    expect(v).toMatch(/Nc6/);
    expect(v).toMatch(/Qd7/);
    expect(v).toMatch(/line .*wins material/);
  });
  it("silent when the played move is not the best line's follow-up (a different mistake)", () => {
    const hist = [...HIST.slice(0, -1), "Bd6"];
    const out = attributePrinciples({ historySans: hist, bestSan: "Nc6", classification: "mistake", replySan: null, pvAfterPlayed: PV_PLAYED.slice(0, 1).length ? ["Qd7"] : [], pvAfterBest: PV_BEST });
    expect(out.map((x) => x.id)).not.toContain("wrong-move-order");
  });
  it("silent without the persisted engine lines (nothing to prove it with)", () => {
    const out = attributePrinciples({ historySans: HIST, bestSan: "Nc6", classification: "mistake", replySan: null });
    expect(out.map((x) => x.id)).not.toContain("wrong-move-order");
  });
});
