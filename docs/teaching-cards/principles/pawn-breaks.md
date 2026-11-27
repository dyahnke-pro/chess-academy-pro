# Pawn breaks decide the play

## Principle
A pawn break is the move that changes the structure: know yours and theirs, aim it at a pawn, prepare it so the landing square is supported, and strike a chain at its base. Meet theirs by guarding the target enough, taking first, or covering the push square before it's played. Don't open the centre while your king is in it.

## When it applies / exceptions
Overstated in the card: 'Every structure has a pawn break that decides the play' — most structures do; closed blocked positions may have none. Keep 'usually'.

## Deterministic check
- Break: a legal pawn push/capture contacting an enemy pawn; target = the contacted pawn; prepared = SEE on the landing square ≥ 0; chain base = the rearmost pawn of a diagonal enemy chain.
- Defences: (guard) a legal move raising the target's defenders to ≥ attackers; (take first) a legal capture on the break square; (stop) a legal move attacking the push square with SEE ≥ 0.
- King-in-centre guard: the student's own break opening a d/e file while their king is uncastled there.

## Phrasings
1. Every structure has a break: know which one is yours.
2. Strike a pawn chain at its base.
3. Prepare the break so the square it lands on is supported.
4. Stop their break before it's played: cover the square it needs.
5. Don't open the centre while your king is still in it.

## Sources
- concept:pawn-chain (Edward Lasker)
- concept:pos-open-file (the timely pawn break that opens a lane)
- https://chessbio.com/term/pawn%20breaks
- https://www.chess.com/blog/Tricks-of-Chess/pawn-breaks-the-moves-that-change-everything-a-strategic-guide

## Used by
readPosition L rows, pictureVerdict T KNOW(lever)

## Flag
OVERSTATED: readPosition L RECOG 'Every structure has a pawn break that decides the play.'
