/**
 * THE REAL-QUESTION TEST SET (2026-10-08). Every distinct question real
 * students typed to the coach (PostHog, last 12 months; bots, audits and
 * reviewers removed), with the screen it was asked on and a hand label: what
 * kind of question it is, what it is about, and what a correct answer must do.
 * Pasted-game player names and links are reduced to their shape.
 */
export type AskKind =
  | 'command' | 'move' | 'board' | 'record' | 'opening' | 'learning'
  | 'app' | 'smalltalk' | 'followup' | 'unclear' | 'knowledge' | 'outside';
export type Screen = 'home' | 'play' | 'learn' | 'review' | 'puzzle' | 'opening' | 'chat' | 'other';
export interface RealQuestion { q: string; screen: Screen; kind: AskKind; about: string; expect: string }

export const REAL_QUESTIONS: readonly RealQuestion[] = [
 {
  "q": "White only has one good move here?",
  "screen": "learn",
  "kind": "board",
  "about": "best move now",
  "expect": "say whether only one move holds, name it with its reason"
 },
 {
  "q": "Play the Sicilian",
  "screen": "learn",
  "kind": "command",
  "about": "play: Sicilian",
  "expect": "start a game / offer the Sicilian lines to play"
 },
 {
  "q": "Play Sicilian now",
  "screen": "learn",
  "kind": "command",
  "about": "play: Sicilian",
  "expect": "start a game / offer the Sicilian lines to play"
 },
 {
  "q": "What thinking errors have I made",
  "screen": "chat",
  "kind": "record",
  "about": "thinking errors",
  "expect": "list the student's recorded misconceptions, or honest import gate"
 },
 {
  "q": "Many games do you need analyzed?",
  "screen": "chat",
  "kind": "app",
  "about": "analysis needs",
  "expect": "say how many games analysis needs"
 },
 {
  "q": "Games being analyzed now from imports. How long will it take",
  "screen": "chat",
  "kind": "app",
  "about": "analysis progress",
  "expect": "say import/analysis status or time"
 },
 {
  "q": "What if I push my c4 to c5",
  "screen": "play",
  "kind": "move",
  "about": "proposed c5",
  "expect": "evaluate c4-c5 here: good or not, why"
 },
 {
  "q": "What should I do here",
  "screen": "play",
  "kind": "board",
  "about": "what now",
  "expect": "best move or plan for the current board"
 },
 {
  "q": "Hello",
  "screen": "play",
  "kind": "smalltalk",
  "about": "greeting",
  "expect": "short greeting"
 },
 {
  "q": "What should I do in this position",
  "screen": "play",
  "kind": "board",
  "about": "what now",
  "expect": "best move or plan for the current board"
 },
 {
  "q": "Books",
  "screen": "home",
  "kind": "unclear",
  "about": "books?",
  "expect": "ask what they mean, or offer the book lessons"
 },
 {
  "q": "How do I use the Sicilian?",
  "screen": "play",
  "kind": "opening",
  "about": "Sicilian how-to",
  "expect": "explain the Sicilian's idea/plans, or offer lesson"
 },
 {
  "q": "Can you pull up how many games Magnus has played?",
  "screen": "learn",
  "kind": "outside",
  "about": "Magnus game count",
  "expect": "honest: no such data, or show Magnus's games we have"
 },
 {
  "q": "What am I weakest in?",
  "screen": "learn",
  "kind": "record",
  "about": "weakness",
  "expect": "student's weaknesses, or honest import gate"
 },
 {
  "q": "Hello?",
  "screen": "learn",
  "kind": "smalltalk",
  "about": "greeting",
  "expect": "short greeting"
 },
 {
  "q": "What do I need to work on the most?",
  "screen": "learn",
  "kind": "record",
  "about": "weakness",
  "expect": "student's weaknesses, or honest import gate"
 },
 {
  "q": "What is my biggest weakness?",
  "screen": "learn",
  "kind": "record",
  "about": "weakness",
  "expect": "student's weaknesses, or honest import gate"
 },
 {
  "q": "What is my best opening?",
  "screen": "learn",
  "kind": "record",
  "about": "best opening",
  "expect": "student's best opening, or honest import gate"
 },
 {
  "q": "Black openings",
  "screen": "home",
  "kind": "opening",
  "about": "openings for black",
  "expect": "name openings for Black or offer a picker of Black defences"
 },
 {
  "q": "I need a hint",
  "screen": "learn",
  "kind": "command",
  "about": "hint",
  "expect": "a hint for the current board"
 },
 {
  "q": "What is my best move?",
  "screen": "learn",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "Which is best??",
  "screen": "learn",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "What is my plan?",
  "screen": "learn",
  "kind": "board",
  "about": "plan",
  "expect": "the plan for the student"
 },
 {
  "q": "What is the plan?",
  "screen": "learn",
  "kind": "board",
  "about": "plan",
  "expect": "the plan"
 },
 {
  "q": "What is best?",
  "screen": "learn",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "What is the best move",
  "screen": "learn",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "Why?",
  "screen": "learn",
  "kind": "followup",
  "about": "why (last claim)",
  "expect": "why the coach's last named move is best"
 },
 {
  "q": "Why is taking better than pushing?",
  "screen": "learn",
  "kind": "move",
  "about": "compare capture vs push",
  "expect": "compare exd5 vs e5 (after 1.e4 d5): which and why"
 },
 {
  "q": "Is there a trap in this position?",
  "screen": "learn",
  "kind": "board",
  "about": "traps here",
  "expect": "traps in this position (or none)"
 },
 {
  "q": "Is there a tactic here?",
  "screen": "learn",
  "kind": "board",
  "about": "tactics here",
  "expect": "tactics on the board (or none)"
 },
 {
  "q": "Can you search for traps here?",
  "screen": "learn",
  "kind": "board",
  "about": "traps here",
  "expect": "traps in this position (or none)"
 },
 {
  "q": "What's the best move",
  "screen": "play",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "Vienna when black plays 2Bb3",
  "screen": "learn",
  "kind": "opening",
  "about": "Vienna line",
  "expect": "start or explain the Vienna line asked about (2...Bb4 likely)"
 },
 {
  "q": "Hi",
  "screen": "review",
  "kind": "smalltalk",
  "about": "greeting",
  "expect": "short greeting"
 },
 {
  "q": "Can you hear me",
  "screen": "home",
  "kind": "smalltalk",
  "about": "are you there",
  "expect": "short yes"
 },
 {
  "q": "How about reading a chessboard",
  "screen": "home",
  "kind": "unclear",
  "about": "reading a board",
  "expect": "ask what they mean / offer how-to-read-the-board help"
 },
 {
  "q": "Play the scandi against me",
  "screen": "learn",
  "kind": "command",
  "about": "play: Scandinavian",
  "expect": "start / picker for Scandinavian"
 },
 {
  "q": "Play the Candi against me",
  "screen": "learn",
  "kind": "command",
  "about": "play: Scandinavian (typo)",
  "expect": "resolve Candi→Scandi; start / picker"
 },
 {
  "q": "What am I weakest at?",
  "screen": "learn",
  "kind": "record",
  "about": "weakness",
  "expect": "student's weaknesses, or honest import gate"
 },
 {
  "q": "drill calculation",
  "screen": "learn",
  "kind": "command",
  "about": "calculation drill",
  "expect": "start a calculation drill"
 },
 {
  "q": "Why do I struggle with calculation?",
  "screen": "learn",
  "kind": "record",
  "about": "calculation weakness",
  "expect": "why calculation is weak from record, or gate + method"
 },
 {
  "q": "Let’s do it",
  "screen": "learn",
  "kind": "followup",
  "about": "agree to last offer",
  "expect": "carry out the coach's last offer; never an opening name"
 },
 {
  "q": "Teach me how to calculate",
  "screen": "learn",
  "kind": "learning",
  "about": "calculation",
  "expect": "teach the calculation method"
 },
 {
  "q": "What is the answer?",
  "screen": "learn",
  "kind": "followup",
  "about": "answer to current puzzle/question",
  "expect": "give the answer to what's on screen"
 },
 {
  "q": "I don’t see the fork",
  "screen": "learn",
  "kind": "board",
  "about": "the fork",
  "expect": "show the fork on the board (or say there is none)"
 },
 {
  "q": "Help me calculate",
  "screen": "learn",
  "kind": "learning",
  "about": "calculation",
  "expect": "teach/start calculation help"
 },
 {
  "q": "Calculating lines",
  "screen": "learn",
  "kind": "learning",
  "about": "calculation",
  "expect": "teach/start calculation help"
 },
 {
  "q": "Too slow. What do you think I need to work on?",
  "screen": "learn",
  "kind": "record",
  "about": "weakness",
  "expect": "student's weaknesses, or honest import gate"
 },
 {
  "q": "What do i need to practice most?",
  "screen": "learn",
  "kind": "record",
  "about": "weakness",
  "expect": "student's weaknesses, or honest import gate"
 },
 {
  "q": "Calculation",
  "screen": "puzzle",
  "kind": "learning",
  "about": "calculation",
  "expect": "teach/start calculation help"
 },
 {
  "q": "What's due for review?",
  "screen": "learn",
  "kind": "record",
  "about": "review due",
  "expect": "due reviews"
 },
 {
  "q": "Which opening should I practice?",
  "screen": "learn",
  "kind": "record",
  "about": "opening to practise",
  "expect": "which opening to practise from record, or gate"
 },
 {
  "q": "Why is Ne4 best?",
  "screen": "learn",
  "kind": "move",
  "about": "why Ne4 best",
  "expect": "explain Ne4"
 },
 {
  "q": "Why is night e 4 best?",
  "screen": "learn",
  "kind": "move",
  "about": "why Ne4 best (voice)",
  "expect": "explain Ne4"
 },
 {
  "q": "What is the best move?",
  "screen": "learn",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "What opening should I play",
  "screen": "learn",
  "kind": "record",
  "about": "opening to play",
  "expect": "recommend an opening (from record or level)"
 },
 {
  "q": "Can you play the Carl O'Connor against me",
  "screen": "play",
  "kind": "command",
  "about": "play: Caro-Kann (voice)",
  "expect": "resolve to Caro-Kann; start / picker"
 },
 {
  "q": "Play the Carro Khan",
  "screen": "play",
  "kind": "command",
  "about": "play: Caro-Kann (typo)",
  "expect": "resolve to Caro-Kann; start / picker"
 },
 {
  "q": "Yes",
  "screen": "play",
  "kind": "followup",
  "about": "yes",
  "expect": "carry out last offer / short ack"
 },
 {
  "q": "Don't show me the arrows",
  "screen": "play",
  "kind": "command",
  "about": "hide arrows",
  "expect": "turn arrows off"
 },
 {
  "q": "You're still showing the arrows don't tell me what to do",
  "screen": "play",
  "kind": "command",
  "about": "hide arrows",
  "expect": "turn arrows off"
 },
 {
  "q": "Dammit",
  "screen": "play",
  "kind": "smalltalk",
  "about": "frustration",
  "expect": "short acknowledgment, no opening picker"
 },
 {
  "q": "How was that a blender",
  "screen": "play",
  "kind": "move",
  "about": "why last move was a blunder",
  "expect": "explain the verdict on the last move"
 },
 {
  "q": "What's my best",
  "screen": "play",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "Should I take with the bishop or the pond",
  "screen": "play",
  "kind": "move",
  "about": "compare Bxf6 vs gxf6",
  "expect": "which recapture is better and why"
 },
 {
  "q": "Probably just castle here right",
  "screen": "play",
  "kind": "move",
  "about": "castle now?",
  "expect": "is O-O good here, why"
 },
 {
  "q": "Queen take the four hang the queen",
  "screen": "play",
  "kind": "unclear",
  "about": "garbled queen claim",
  "expect": "ask what they mean or check the queen's safety"
 },
 {
  "q": "No it's protected by the queen",
  "screen": "play",
  "kind": "move",
  "about": "student claim: protected by queen",
  "expect": "check the claim on the board"
 },
 {
  "q": "What no black takes my queen with his queen",
  "screen": "play",
  "kind": "unclear",
  "about": "garbled",
  "expect": "ask what they mean"
 },
 {
  "q": "So what is stockfish special",
  "screen": "play",
  "kind": "knowledge",
  "about": "what is Stockfish",
  "expect": "explain Stockfish briefly"
 },
 {
  "q": "Play the Caro khan against me",
  "screen": "play",
  "kind": "command",
  "about": "play: Caro-Kann against me",
  "expect": "start / picker"
 },
 {
  "q": "Can you play the Caro khan?",
  "screen": "play",
  "kind": "command",
  "about": "play: Caro-Kann",
  "expect": "start / picker"
 },
 {
  "q": "Take me to tactics",
  "screen": "play",
  "kind": "command",
  "about": "navigate tactics",
  "expect": "open Tactics"
 },
 {
  "q": "Open tactics",
  "screen": "play",
  "kind": "command",
  "about": "navigate tactics",
  "expect": "open Tactics"
 },
 {
  "q": "What is my weakest tactic?",
  "screen": "play",
  "kind": "record",
  "about": "weakest tactic",
  "expect": "student's weakest tactic, or gate"
 },
 {
  "q": "What’s my best move",
  "screen": "play",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "Am I losing?",
  "screen": "play",
  "kind": "board",
  "about": "am I losing",
  "expect": "the evaluation in words"
 },
 {
  "q": "Teach me middle game theory for the Vienna game",
  "screen": "play",
  "kind": "opening",
  "about": "Vienna middlegame",
  "expect": "teach Vienna middlegame plans"
 },
 {
  "q": "What should I practice?",
  "screen": "home",
  "kind": "record",
  "about": "what to practise",
  "expect": "practise list from record, or gate"
 },
 {
  "q": "Teach me tactics",
  "screen": "play",
  "kind": "command",
  "about": "teach tactics",
  "expect": "start tactics lesson/drill"
 },
 {
  "q": "Teach me end games",
  "screen": "play",
  "kind": "command",
  "about": "teach endgames",
  "expect": "start endgame lessons"
 },
 {
  "q": "Turn on hints",
  "screen": "play",
  "kind": "command",
  "about": "hints on",
  "expect": "turn hints on"
 },
 {
  "q": "what’s my first move",
  "screen": "learn",
  "kind": "board",
  "about": "first move",
  "expect": "best first move with reason"
 },
 {
  "q": "What opening did we play?",
  "screen": "learn",
  "kind": "record",
  "about": "last opening played",
  "expect": "name the opening of the current/last game"
 },
 {
  "q": "Was it the fantasy variation?",
  "screen": "learn",
  "kind": "record",
  "about": "was it the Fantasy",
  "expect": "confirm/deny the opening of the game"
 },
 {
  "q": "Why was that move best?",
  "screen": "learn",
  "kind": "followup",
  "about": "why last named move best",
  "expect": "explain"
 },
 {
  "q": "Why is Qd4 best?",
  "screen": "learn",
  "kind": "move",
  "about": "why Qd4 (Qxd4) best",
  "expect": "explain"
 },
 {
  "q": "Why is the position balanced?",
  "screen": "learn",
  "kind": "board",
  "about": "why balanced",
  "expect": "explain why the position is level"
 },
 {
  "q": "Why is that move best?",
  "screen": "learn",
  "kind": "followup",
  "about": "why last named move best",
  "expect": "explain"
 },
 {
  "q": "What is my best opening",
  "screen": "chat",
  "kind": "record",
  "about": "best opening",
  "expect": "from record, or gate"
 },
 {
  "q": "What is my best variation in that opening",
  "screen": "chat",
  "kind": "record",
  "about": "best variation",
  "expect": "from record, or gate"
 },
 {
  "q": "How does Gotham chess play this line?",
  "screen": "play",
  "kind": "outside",
  "about": "GothamChess line",
  "expect": "player games in this line, or honest none"
 },
 {
  "q": "How does levy rozman play this line?",
  "screen": "play",
  "kind": "outside",
  "about": "Levy line",
  "expect": "player games in this line, or honest none"
 },
 {
  "q": "How does levy play this line?",
  "screen": "play",
  "kind": "outside",
  "about": "Levy line",
  "expect": "player games in this line, or honest none"
 },
 {
  "q": "Is qf3 ok?",
  "screen": "play",
  "kind": "move",
  "about": "is Qf3 ok",
  "expect": "evaluate Qf3"
 },
 {
  "q": "But is qf3 ok to play",
  "screen": "play",
  "kind": "move",
  "about": "is Qf3 ok",
  "expect": "evaluate Qf3"
 },
 {
  "q": "What’s the best move?",
  "screen": "play",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "What was the better move?",
  "screen": "play",
  "kind": "move",
  "about": "better than last move",
  "expect": "the better move at the last move, with reason"
 },
 {
  "q": "Why is qe3 best",
  "screen": "play",
  "kind": "move",
  "about": "why Qe3 best",
  "expect": "explain Qe3"
 },
 {
  "q": "What move is best?",
  "screen": "learn",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "What are my weaknesses?",
  "screen": "learn",
  "kind": "record",
  "about": "weakness",
  "expect": "weaknesses or gate"
 },
 {
  "q": "I struggle against the KID. Which opening do you suggest I play against it and why?",
  "screen": "learn",
  "kind": "opening",
  "about": "vs KID",
  "expect": "recommend a line vs the King's Indian and why"
 },
 {
  "q": "What should I play against the Pirc?",
  "screen": "learn",
  "kind": "opening",
  "about": "vs Pirc",
  "expect": "recommend a line vs the Pirc"
 },
 {
  "q": "How would you describe my playing style?",
  "screen": "learn",
  "kind": "record",
  "about": "playing style",
  "expect": "describe style from record, or gate"
 },
 {
  "q": "I’m weak against the KID, how should I play against it?",
  "screen": "learn",
  "kind": "opening",
  "about": "vs KID",
  "expect": "recommend a line vs the King's Indian"
 },
 {
  "q": "What should I play against the Caro?",
  "screen": "learn",
  "kind": "opening",
  "about": "vs Caro-Kann",
  "expect": "recommend a line vs the Caro-Kann"
 },
 {
  "q": "Against the Cato khan what should I play?",
  "screen": "home",
  "kind": "opening",
  "about": "vs Caro-Kann (typo)",
  "expect": "recommend a line vs the Caro-Kann"
 },
 {
  "q": "What should I play against the Caro khan",
  "screen": "learn",
  "kind": "opening",
  "about": "vs Caro-Kann (typo)",
  "expect": "recommend a line vs the Caro-Kann"
 },
 {
  "q": "How are my tactics?",
  "screen": "learn",
  "kind": "record",
  "about": "tactics",
  "expect": "tactics profile, or gate"
 },
 {
  "q": "lyqels",
  "screen": "chat",
  "kind": "unclear",
  "about": "gibberish",
  "expect": "ask what they mean"
 },
 {
  "q": "Panov",
  "screen": "home",
  "kind": "command",
  "about": "teach: Panov",
  "expect": "start Panov lesson / picker"
 },
 {
  "q": "Teach me the Scandi Panov",
  "screen": "learn",
  "kind": "command",
  "about": "teach: Scandinavian Panov",
  "expect": "start lesson / picker"
 },
 {
  "q": "Scandi panov",
  "screen": "learn",
  "kind": "command",
  "about": "teach: Scandinavian Panov",
  "expect": "start lesson / picker"
 },
 {
  "q": "I want to see how you play the dragon against the kings Indian attack",
  "screen": "learn",
  "kind": "command",
  "about": "play: Dragon vs KIA",
  "expect": "start that game / explain"
 },
 {
  "q": "KIA with white pieces",
  "screen": "learn",
  "kind": "command",
  "about": "teach: KIA as White",
  "expect": "start lesson"
 },
 {
  "q": "Teach me the KIA with white pieces",
  "screen": "learn",
  "kind": "command",
  "about": "teach: KIA as White",
  "expect": "start lesson"
 },
 {
  "q": "Why is this move better?",
  "screen": "review",
  "kind": "move",
  "about": "why this move better (review)",
  "expect": "explain the better move at this ply"
 },
 {
  "q": "Why is h3 better?",
  "screen": "review",
  "kind": "move",
  "about": "why h3 better",
  "expect": "explain h3"
 },
 {
  "q": "Test",
  "screen": "home",
  "kind": "smalltalk",
  "about": "test",
  "expect": "short ack"
 },
 {
  "q": "What is my weakest",
  "screen": "home",
  "kind": "record",
  "about": "weakest",
  "expect": "weakness or gate"
 },
 {
  "q": "What is my weakest tactic",
  "screen": "home",
  "kind": "record",
  "about": "weakest tactic",
  "expect": "from record or gate"
 },
 {
  "q": "Teach me a new uncommon aggressive opening",
  "screen": "learn",
  "kind": "opening",
  "about": "uncommon aggressive opening",
  "expect": "suggest one (real DB opening) and offer lesson"
 },
 {
  "q": "Keep playing the line out",
  "screen": "learn",
  "kind": "command",
  "about": "continue line",
  "expect": "continue playing the line"
 },
 {
  "q": "Sicilian Defense: Alapin Variation, Barmen Defense, Endgame Variation",
  "screen": "learn",
  "kind": "command",
  "about": "teach: named line",
  "expect": "start that line"
 },
 {
  "q": "Walkthrough the alapin",
  "screen": "learn",
  "kind": "command",
  "about": "teach: Alapin",
  "expect": "start Alapin lesson"
 },
 {
  "q": "Vienna Gambit, with Max Lange Defense: Steinitz Gambit, Main Line",
  "screen": "learn",
  "kind": "command",
  "about": "teach: named line",
  "expect": "start that line"
 },
 {
  "q": "Do people play Qf3 in this position?",
  "screen": "learn",
  "kind": "move",
  "about": "popularity of Qf3",
  "expect": "master/club frequency of Qf3 here"
 },
 {
  "q": "She me the line where black takes the knight on c3",
  "screen": "learn",
  "kind": "move",
  "about": "line where Black takes on c3",
  "expect": "show the Bxc3 line"
 },
 {
  "q": "I did play Qf3",
  "screen": "learn",
  "kind": "move",
  "about": "student played Qf3",
  "expect": "acknowledge/evaluate Qf3"
 },
 {
  "q": "Teach me all traps in the bishops opening",
  "screen": "learn",
  "kind": "command",
  "about": "teach traps: Bishop's Opening",
  "expect": "list/start the traps"
 },
 {
  "q": "Bishop's Opening: Bishop's Opening: Bxh1 greed — Qxf7 is mate, Queen takes h8",
  "screen": "learn",
  "kind": "command",
  "about": "teach: named trap",
  "expect": "start that trap"
 },
 {
  "q": "Pause here",
  "screen": "learn",
  "kind": "command",
  "about": "pause",
  "expect": "pause the lesson"
 },
 {
  "q": "Better to push the e or d pawn?",
  "screen": "learn",
  "kind": "move",
  "about": "compare e4 vs d4",
  "expect": "which pawn push and why"
 },
 {
  "q": "Which pawn should I push?",
  "screen": "learn",
  "kind": "move",
  "about": "which pawn push",
  "expect": "best pawn move and why"
 },
 {
  "q": "What is the plan for white and black?",
  "screen": "learn",
  "kind": "board",
  "about": "plans both sides",
  "expect": "plan for White and Black"
 },
 {
  "q": "What is my plan",
  "screen": "learn",
  "kind": "board",
  "about": "plan",
  "expect": "the student's plan"
 },
 {
  "q": "Why play night c3?",
  "screen": "learn",
  "kind": "move",
  "about": "why Nc3",
  "expect": "explain Nc3"
 },
 {
  "q": "Is there an opening called the ICBM?",
  "screen": "home",
  "kind": "opening",
  "about": "does ICBM exist",
  "expect": "yes/no from DB, honestly"
 },
 {
  "q": "Is there an opening called the intercontinental ballistic missile?",
  "screen": "home",
  "kind": "opening",
  "about": "does ICBM exist",
  "expect": "yes/no from DB, honestly"
 },
 {
  "q": "teach me more traps in the bishops opening",
  "screen": "learn",
  "kind": "command",
  "about": "more traps: Bishop's Opening",
  "expect": "more traps"
 },
 {
  "q": "Ok!",
  "screen": "learn",
  "kind": "smalltalk",
  "about": "ok",
  "expect": "short ack"
 },
 {
  "q": "Why was that a bad move",
  "screen": "home",
  "kind": "move",
  "about": "why last move bad",
  "expect": "explain the last move's cost"
 },
 {
  "q": "Why did loving my queen there give ground",
  "screen": "home",
  "kind": "move",
  "about": "why queen move gave ground (voice)",
  "expect": "explain the queen move's cost"
 },
 {
  "q": "Why do you think they move their queen like that",
  "screen": "play",
  "kind": "move",
  "about": "their queen move",
  "expect": "why they played it"
 },
 {
  "q": "Doesn't that mess the structure up",
  "screen": "play",
  "kind": "move",
  "about": "structure after their move",
  "expect": "does it damage the structure: yes/no why"
 },
 {
  "q": "My night to D5 was that a good move",
  "screen": "play",
  "kind": "move",
  "about": "was Nd5 good",
  "expect": "verdict on Nd5 with reason"
 },
 {
  "q": "My night to D5 was out a good move",
  "screen": "play",
  "kind": "move",
  "about": "was Nd5 good (voice)",
  "expect": "verdict on Nd5"
 },
 {
  "q": "I did put my notes oh you said wait you said night to D5 where I put it",
  "screen": "play",
  "kind": "unclear",
  "about": "garbled about Nd5",
  "expect": "ask, or verdict on Nd5"
 },
 {
  "q": "I did put my nights oh you said wait you said night to D5 where I put it",
  "screen": "play",
  "kind": "unclear",
  "about": "garbled about Nd5",
  "expect": "ask, or verdict on Nd5"
 },
 {
  "q": "My knight  to d5 was that a good move",
  "screen": "play",
  "kind": "move",
  "about": "was Nd5 good",
  "expect": "verdict on Nd5"
 },
 {
  "q": "I’m thinking pawn b3 so i can bring my bishop",
  "screen": "play",
  "kind": "move",
  "about": "plan b3 + bishop",
  "expect": "evaluate b3/fianchetto idea"
 },
 {
  "q": "Why qe1 is correct in this position",
  "screen": "play",
  "kind": "move",
  "about": "why Qe1",
  "expect": "explain Qe1"
 },
 {
  "q": "Do you understand me",
  "screen": "learn",
  "kind": "smalltalk",
  "about": "do you understand me",
  "expect": "short yes / ask what they need"
 },
 {
  "q": "How do improve my middle game",
  "screen": "home",
  "kind": "learning",
  "about": "middlegame",
  "expect": "how to improve middlegame"
 },
 {
  "q": "How to improve middle game",
  "screen": "home",
  "kind": "learning",
  "about": "middlegame",
  "expect": "how to improve middlegame"
 },
 {
  "q": "You there",
  "screen": "home",
  "kind": "smalltalk",
  "about": "are you there",
  "expect": "short yes"
 },
 {
  "q": "What should I work on?",
  "screen": "learn",
  "kind": "record",
  "about": "what to work on",
  "expect": "from record or gate"
 },
 {
  "q": "What's my next move",
  "screen": "puzzle",
  "kind": "board",
  "about": "next move",
  "expect": "best move with reason"
 },
 {
  "q": "Good thank",
  "screen": "puzzle",
  "kind": "smalltalk",
  "about": "thanks",
  "expect": "short ack"
 },
 {
  "q": "Why did you make that sound",
  "screen": "home",
  "kind": "app",
  "about": "sound",
  "expect": "explain the sound (or honest)"
 },
 {
  "q": "Why am I losing",
  "screen": "home",
  "kind": "record",
  "about": "why losing (games)",
  "expect": "why the student loses, from record or gate"
 },
 {
  "q": "Why can’t I figure out this chest thing?",
  "screen": "home",
  "kind": "learning",
  "about": "frustration with chess",
  "expect": "encouragement + one concrete next step"
 },
 {
  "q": "', Any help",
  "screen": "puzzle",
  "kind": "app",
  "about": "help",
  "expect": "what the coach can do"
 },
 {
  "q": ". Help.",
  "screen": "puzzle",
  "kind": "app",
  "about": "help",
  "expect": "what the coach can do"
 },
 {
  "q": "Help",
  "screen": "puzzle",
  "kind": "app",
  "about": "help",
  "expect": "what the coach can do"
 },
 {
  "q": "How often do I blunder?",
  "screen": "learn",
  "kind": "record",
  "about": "blunder rate",
  "expect": "from record or gate"
 },
 {
  "q": "Couldn’t he take the knight with the king",
  "screen": "play",
  "kind": "move",
  "about": "couldn't he Kxf7",
  "expect": "why the king capture fails or works"
 },
 {
  "q": "What does G stand for",
  "screen": "play",
  "kind": "knowledge",
  "about": "what g means",
  "expect": "the g-file / g-pawn in notation"
 },
 {
  "q": "So I need to go GXF4",
  "screen": "play",
  "kind": "move",
  "about": "so gxf4?",
  "expect": "evaluate gxf4"
 },
 {
  "q": "Still having a hard time understanding you're teaching",
  "screen": "home",
  "kind": "learning",
  "about": "confused by teaching",
  "expect": "slow down, ask what's unclear"
 },
 {
  "q": "How is how is Megan giving checkmate a blunder",
  "screen": "play",
  "kind": "move",
  "about": "why checkmate move a blunder (voice)",
  "expect": "explain the verdict"
 },
 {
  "q": "How was a how is Megan checkmate a blunder",
  "screen": "play",
  "kind": "move",
  "about": "why checkmate move a blunder (voice)",
  "expect": "explain the verdict"
 },
 {
  "q": "How can I visual the next moves",
  "screen": "home",
  "kind": "learning",
  "about": "visualisation",
  "expect": "how to visualise moves ahead"
 },
 {
  "q": "What is the blacks opening",
  "screen": "play",
  "kind": "opening",
  "about": "Black's opening",
  "expect": "name the opening on the board"
 },
 {
  "q": "Can you help me out I don’t know how to proceed",
  "screen": "play",
  "kind": "board",
  "about": "what now",
  "expect": "best move or plan"
 },
 {
  "q": "What is bxe7",
  "screen": "play",
  "kind": "knowledge",
  "about": "what is Bxe7",
  "expect": "bishop takes on e7"
 },
 {
  "q": "How should I proceed",
  "screen": "play",
  "kind": "board",
  "about": "how to proceed",
  "expect": "best move or plan"
 },
 {
  "q": "Is that bishop attacks e7?",
  "screen": "play",
  "kind": "board",
  "about": "does bishop attack e7",
  "expect": "yes/no on the board"
 },
 {
  "q": "Explain",
  "screen": "play",
  "kind": "followup",
  "about": "explain (last)",
  "expect": "explain the coach's last statement"
 },
 {
  "q": "Explain my",
  "screen": "play",
  "kind": "followup",
  "about": "explain my (move)",
  "expect": "explain the student's last move"
 },
 {
  "q": "I don’t understand your language",
  "screen": "play",
  "kind": "learning",
  "about": "confused by notation",
  "expect": "explain in plain words, offer notation help"
 },
 {
  "q": "What does Bxe7 mean though",
  "screen": "play",
  "kind": "knowledge",
  "about": "what is Bxe7",
  "expect": "bishop takes on e7"
 },
 {
  "q": "We are going in circles I don’t k",
  "screen": "play",
  "kind": "learning",
  "about": "going in circles",
  "expect": "acknowledge, change approach"
 },
 {
  "q": "What the next best tactic",
  "screen": "play",
  "kind": "board",
  "about": "next tactic",
  "expect": "tactic on the board"
 },
 {
  "q": "[White \"player\"] [Black \"player\"] [Result \"1/2-1/2\"]  1. e4 e5 2. Nc3 Nc6 3. Nf3 Nf6 4. d3 Nd4 5. Be3 Bb4 6. Be2 Nxf3+ 7. Bxf3 Bxc3+ 8. bxc3 Ke7 9. O-O Rf8 10. Bg5 b5 11. Rb1 g6 12. c4 Rb8 13. cxb5 Rg8 14. c4 Qf8 15. Re1 h6 16. Bxf6+ Kxf6 17. h4 h5 18. g3 Qa3 19. Rb3 Bb7 20. Rxa3 c6 21. Rxa7 Rge8 22. Qa4 Rh8 23. Qa5 Rbg8 24. Rxb7 cxb5 25. Qb6+ Kg7 26. Rxd7 b4 27. Qc7 g5 28. Rxf7+ Kg6 29. Rb1 Rb8 30. a3 g4 31. Bxg4 Rbe8 32. axb4 hxg4 33. Rg7+ Kh6 34. Rh7+ Rxh7 35. Qc6+ Kh5 36. Qxe8+ Kh6 37. c5 Rc7 38. Qh8+ Kg6 39. h5+ Kf7 40. Qh7+ Kf6 41. Qxc7 Ke6 42. Qd6+ Kf7 43. c6 Kg7 44. Qxe5+ Kh7 45. Qf5+ Kg8 46. h6 Kh8 47. Qf7 1/2-1/2",
  "screen": "home",
  "kind": "command",
  "about": "review pasted game",
  "expect": "analyse the pasted game"
 },
 {
  "q": "You suck",
  "screen": "home",
  "kind": "smalltalk",
  "about": "insult",
  "expect": "short, calm"
 },
 {
  "q": "Review",
  "screen": "home",
  "kind": "command",
  "about": "review",
  "expect": "open game review"
 },
 {
  "q": "Last game",
  "screen": "home",
  "kind": "command",
  "about": "review last game",
  "expect": "open last game review"
 },
 {
  "q": "I Beat Janjay! https://chess.com/game/…",
  "screen": "home",
  "kind": "command",
  "about": "review linked game",
  "expect": "import/review the game"
 },
 {
  "q": "Review my lastt",
  "screen": "home",
  "kind": "command",
  "about": "review last game",
  "expect": "open last game review"
 },
 {
  "q": "What does bxe7 mean?",
  "screen": "learn",
  "kind": "knowledge",
  "about": "what is Bxe7",
  "expect": "bishop takes on e7"
 },
 {
  "q": "How do I improve my middle game?",
  "screen": "learn",
  "kind": "learning",
  "about": "middlegame",
  "expect": "how to improve middlegame"
 },
 {
  "q": "Tell me my weaknesses",
  "screen": "learn",
  "kind": "record",
  "about": "weaknesses",
  "expect": "from record or gate"
 },
 {
  "q": "What are key ideas in the scandi?",
  "screen": "learn",
  "kind": "opening",
  "about": "Scandinavian ideas",
  "expect": "key ideas of the Scandinavian"
 },
 {
  "q": "What is a fork in chess?",
  "screen": "home",
  "kind": "knowledge",
  "about": "fork",
  "expect": "define a fork"
 },
 {
  "q": "Name a famous chess player",
  "screen": "learn",
  "kind": "knowledge",
  "about": "famous player",
  "expect": "name a famous player"
 },
 {
  "q": "What is en passant?",
  "screen": "home",
  "kind": "knowledge",
  "about": "en passant",
  "expect": "explain en passant"
 },
 {
  "q": "Why did white not take with the queen?",
  "screen": "learn",
  "kind": "move",
  "about": "why not Qxd4",
  "expect": "why White didn't recapture with the queen"
 },
 {
  "q": "how do I attack the king?",
  "screen": "learn",
  "kind": "board",
  "about": "attack the king",
  "expect": "how to attack here"
 },
 {
  "q": "what is the best move here?",
  "screen": "play",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "What is the best move here and why?",
  "screen": "play",
  "kind": "board",
  "about": "best move + why",
  "expect": "best move with reason"
 },
 {
  "q": "What does pushing d5 do here?",
  "screen": "play",
  "kind": "move",
  "about": "what d5 does",
  "expect": "effect of d4-d5"
 },
 {
  "q": "What is my bishop on c4 aiming at?",
  "screen": "play",
  "kind": "board",
  "about": "bishop c4 targets",
  "expect": "what the bishop attacks/aims at"
 },
 {
  "q": "Is there a strong attacking idea for me here?",
  "screen": "play",
  "kind": "board",
  "about": "attacking idea",
  "expect": "attacking idea or none"
 },
 {
  "q": "Why is my position better than my opponent's?",
  "screen": "play",
  "kind": "board",
  "about": "why better",
  "expect": "why the student is better"
 },
 {
  "q": "Are any of my pieces hanging right now?",
  "screen": "play",
  "kind": "board",
  "about": "hanging pieces",
  "expect": "hanging pieces or none"
 },
 {
  "q": "what is my opponent threatening?",
  "screen": "play",
  "kind": "board",
  "about": "their threat",
  "expect": "the opponent's threat or none"
 },
 {
  "q": "who controls the e5 square?",
  "screen": "play",
  "kind": "board",
  "about": "control of e5",
  "expect": "who controls e5"
 },
 {
  "q": "what does pushing d5 accomplish?",
  "screen": "play",
  "kind": "move",
  "about": "what d5 does",
  "expect": "effect of d4-d5"
 },
 {
  "q": "Was h3 a good move or unnecessary pawn move?",
  "screen": "review",
  "kind": "move",
  "about": "was h3 good",
  "expect": "verdict on h3"
 },
 {
  "q": "What is my plan in this position?",
  "screen": "review",
  "kind": "board",
  "about": "plan",
  "expect": "the plan"
 },
 {
  "q": "Can I sac on h7? Is that sound?",
  "screen": "learn",
  "kind": "move",
  "about": "Bxh7 sac sound?",
  "expect": "is the sac sound, with line"
 },
 {
  "q": "What is the best move here",
  "screen": "puzzle",
  "kind": "board",
  "about": "best move",
  "expect": "best move with reason"
 },
 {
  "q": "Show me the traxler walkthrough.",
  "screen": "learn",
  "kind": "command",
  "about": "teach: Traxler",
  "expect": "start Traxler lesson"
 },
 {
  "q": "Traxler counter gambit",
  "screen": "home",
  "kind": "command",
  "about": "teach: Traxler",
  "expect": "start Traxler lesson"
 },
 {
  "q": "[White \"player\"] [Black \"player\"] [Result \"1-0\"]  1. e4 e5 2. d3 Nf6 3. Nc3 h5 4. Nf3 h4 5. Nxe5 d6 6. Nf3 c5 7. Nd5 Nxd5 8. exd5 Qe7+ 9. Be2 a5 10. O-O Qd8 11. Bg5 f6 12. Be3 Bf5 13. Qd2 Nc6 14. h3 Ne7 15. c4 g5 16. Rac1 Ra6 17. Qc3 g4 18. Bd2 Kd7 19. Qxf6 Bg7 20. Qg5 gxf3 21. Bxf3 Bxb2 22. Rc2 Kc8 23. Rxb2 Kb8 24. Bc3 Bxd3 25. Bxh8 Bxf1 26. Kxf1 Ra7 27. Bc3 Qc7 28. Bf6 Ka8 29. Bxe7 Ra6 30. Qg8+ Ka7 31. Qd8 Qxd8 32. Bxd8 a4 33. Re2 Kb8 34. Be7 Kc7 35. Bxh4 a3 36. Re7+ Kb8 37. Re8+ Ka7 38. Be7 Rb6 39. Bd8 Rb1+ 40. Ke2 Rb4 41. Be7 Rb6 42. Bf8 Rb2+ 43. Kf1 Rxa2 44. Kg1 Rc2 45. Bxd6 Rxc4 46. Rc8 Rc1+ 47. Kh2 a2 48. Bxc5+ b6 49. Bxb6+ Ka6 50. Rxc1 Kxb6 51. Rc6+ Kb7 52. Rc1 a1=Q 53. Rxa1 Kc7 54. g4 Kd6 55. h4 Ke5 56. g5 Kf4 57. Bg2 Kg4 58. Ra4+ Kf5 59. d6 Ke6 60. Rd4 Ke5 61. Rd1 Kf5 62. d7 Kg4 63. Rd4+ Kh5 64. d8=Q Kg6 65. Qf6+ Kh7 66. Rd7+ Kg8 67. Qd8# 1-0",
  "screen": "home",
  "kind": "command",
  "about": "review pasted game",
  "expect": "analyse the pasted game"
 },
 {
  "q": "Did I have any good moves",
  "screen": "learn",
  "kind": "record",
  "about": "good moves in my game",
  "expect": "the student's good moves in the game"
 },
 {
  "q": "Do I have any strong points",
  "screen": "home",
  "kind": "record",
  "about": "strengths",
  "expect": "strengths or gate"
 },
 {
  "q": "Which phase am I weakest in?",
  "screen": "learn",
  "kind": "record",
  "about": "weakest phase",
  "expect": "from record or gate"
 },
 {
  "q": "some_username",
  "screen": "chat",
  "kind": "unclear",
  "about": "username",
  "expect": "ask / offer to import that account"
 },
 {
  "q": "What's my best opening?",
  "screen": "learn",
  "kind": "record",
  "about": "best opening",
  "expect": "from record or gate"
 },
 {
  "q": "What should I play against the alapin",
  "screen": "learn",
  "kind": "opening",
  "about": "vs Alapin",
  "expect": "recommend a line vs the Alapin"
 },
 {
  "q": "[Result \"0-1\"]  1. e4 e5 2. Nc3 Nc6 3. Nf3 Nf6 4. Bb5 a6 5. Ba4 b5 6. Bb3 Bb7 7. O-O Qb8 8. d4 exd4 9. Nxd4 Nxd4 10. Qxd4 c5 11. Qd1 b4 12. Na4 Bxe4 13. Qe1 Bd6 14. f3 O-O 15. fxe4 Bxh2+ 16. Kf2 Qg3+ 17. Ke2 Qxg2+ 18. Rf2 Qg4+ 19. Kf1 Nxe4 20. Rxh2 Ng3+ 21. Kg2 Rfe8 22. Qf2 Ne4+ 23. Qg3 Qxg3+ 24. Kf1 Qf3+ 25. Kg1 Qd1+ 26. Kg2 Qe2+ 27. Kh1 Qf1# 0-1",
  "screen": "home",
  "kind": "command",
  "about": "review pasted game",
  "expect": "analyse the pasted game"
 },
 {
  "q": "How is Kf3 a trap?",
  "screen": "learn",
  "kind": "move",
  "about": "why Kf3 a trap",
  "expect": "explain"
 },
 {
  "q": "If white take the e pawn with knight does black have the bishop sac?",
  "screen": "learn",
  "kind": "move",
  "about": "bishop sac after Nxe5?",
  "expect": "does Black have the sac: yes/no with line"
 },
 {
  "q": "D5",
  "screen": "puzzle",
  "kind": "unclear",
  "about": "bare square",
  "expect": "ask, or treat as move d5"
 },
 {
  "q": "Whywasknighte5better?",
  "screen": "review",
  "kind": "move",
  "about": "why Ne5 better",
  "expect": "explain Ne5"
 },
 {
  "q": "Tell me about my weaknessew",
  "screen": "learn",
  "kind": "record",
  "about": "weaknesses",
  "expect": "from record or gate"
 },
 {
  "q": "Tell me about my last 3 games",
  "screen": "learn",
  "kind": "record",
  "about": "last 3 games",
  "expect": "summary of last 3 games"
 },
 {
  "q": "Set up a custom lesson",
  "screen": "home",
  "kind": "command",
  "about": "custom lesson",
  "expect": "start custom lesson"
 },
 {
  "q": "Coach me on tactical sequences",
  "screen": "learn",
  "kind": "learning",
  "about": "tactical sequences",
  "expect": "teach/drill tactical sequences"
 },
 {
  "q": "สวัสดีครั้บผมยากพัตนาการเปิดเกมครับ",
  "screen": "home",
  "kind": "command",
  "about": "learn openings (Thai)",
  "expect": "reply in Thai; offer opening lessons"
 },
 {
  "q": "ผมอยากซ้อมการเปิดเกมครับแบบอิตาลีให้เชี่ยวชาญตอนนี้ผมเป็นมือใหม่",
  "screen": "home",
  "kind": "command",
  "about": "Italian practice (Thai)",
  "expect": "reply in Thai; start Italian"
 },
 {
  "q": "ผมอยากซ้อมเปิดเกมแบบอิตาลีสอนหน่อย",
  "screen": "learn",
  "kind": "command",
  "about": "teach Italian (Thai)",
  "expect": "reply in Thai; start Italian"
 },
 {
  "q": "ตอนนี้คุณแชทแล้วทำตอนนี้คุณแชทแล้วทำอะไรกับผมได้บ้างนอกจากแชตในแชตคุณสามารถ สร้างแผนให้ผมได้ไหม",
  "screen": "learn",
  "kind": "app",
  "about": "what can you do / plan (Thai)",
  "expect": "reply in Thai with capabilities/plan"
 },
 {
  "q": "สร้างแผน ฝึกแบบเต็มของผมเลยหรือว่าจะลองดูสกิลผมแล้วก็พัฒนาให้ผมไปเรื่อยเรื่อยก็ได้top eloผมตอนเเข่งคือ1050เฉลี่ย700-900 เล่นมาเป็นเวลาหนึ่งอาทิตย์",
  "screen": "learn",
  "kind": "app",
  "about": "training plan (Thai)",
  "expect": "reply in Thai; build a plan"
 },
 {
  "q": "สอนทุกอย่างเลยทั้งเริ่มเกมยังไง ดูกับดักยังไงแล้วถ้าจมควรเดินไปทางไหนอะไรประมาณนี้เราก็สอนจบเกมว่าได้วิธีไหนได้บ้างแบ่งวันละวันละประมาณ 20 นาทีถึงวันละ 3 ชั่วโมง",
  "screen": "learn",
  "kind": "app",
  "about": "teach everything (Thai)",
  "expect": "reply in Thai; plan/lesson"
 },
 {
  "q": "วันนี้จะฝึกเปิดเกมก่อน 10 นาทีพอมีพื้นฐานดีอยู่แล้วแต่ยังไม่ค่อยแม่นบางทีก็ลืม",
  "screen": "learn",
  "kind": "command",
  "about": "10 min opening practice (Thai)",
  "expect": "reply in Thai; start"
 },
 {
  "q": "เอาเลย",
  "screen": "learn",
  "kind": "followup",
  "about": "let's go (Thai)",
  "expect": "carry out last offer"
 },
 {
  "q": "แป๊บนึงนะรีเซ็ทกระดานใหม่แล้วสอนผมเดินแบบอิตาลี",
  "screen": "learn",
  "kind": "command",
  "about": "reset + teach Italian (Thai)",
  "expect": "reset and start Italian"
 },
 {
  "q": "วางแผนการสอนเปิดเกมแบบอิตาลีผมพอมีพื้นฐานแต่ยังไม่แน่นบางทีก็ลืมผมเป็นมือใหม่ที่eloเคยสุดที่1450 แต่เฉลี่ย 900 สร้างแผนแบบด่วนซ้อม 5 นาที",
  "screen": "home",
  "kind": "app",
  "about": "plan (Thai)",
  "expect": "reply in Thai with a plan"
 },
 {
  "q": "ผมเริ่มได้เลยใช่ไหม",
  "screen": "learn",
  "kind": "followup",
  "about": "can I start (Thai)",
  "expect": "yes, start"
 },
 {
  "q": "ที่ผ่านมาเมื่อกี๊ผมเปิดเกมแบบอิตาลีไหม",
  "screen": "learn",
  "kind": "record",
  "about": "did I play Italian (Thai)",
  "expect": "answer from the game"
 },
 {
  "q": "sollte springer schlagen",
  "screen": "opening",
  "kind": "move",
  "about": "should the knight take (German)",
  "expect": "answer in German: evaluate the knight capture"
 },
 {
  "q": "Why do I want to prepare e5? Doesn’t that shut out my bishop?",
  "screen": "puzzle",
  "kind": "move",
  "about": "why prepare e5 / bishop shut",
  "expect": "explain e5 and the bishop concern"
 },
 {
  "q": "Why is Qb6 not best?",
  "screen": "puzzle",
  "kind": "move",
  "about": "why not Qb6",
  "expect": "explain"
 },
 {
  "q": "Can I sac the knight on f7?",
  "screen": "learn",
  "kind": "move",
  "about": "Nxf7 sac?",
  "expect": "is it sound, with line"
 },
 {
  "q": "Teach me something",
  "screen": "learn",
  "kind": "command",
  "about": "teach something",
  "expect": "start a lesson"
 },
 {
  "q": "What do I need to practice?",
  "screen": "learn",
  "kind": "record",
  "about": "what to practise",
  "expect": "from record or gate"
 },
 {
  "q": "Can you play f4 instead?",
  "screen": "opening",
  "kind": "command",
  "about": "coach play f4 instead",
  "expect": "replay with f4 / explain f4"
 },
 {
  "q": "What's my weakest opening?",
  "screen": "learn",
  "kind": "record",
  "about": "weakest opening",
  "expect": "from record or gate"
 },
 {
  "q": "Why was e2 best?",
  "screen": "puzzle",
  "kind": "move",
  "about": "why Be2 best",
  "expect": "explain Be2"
 },
 {
  "q": "Why is Nd7 best? Can’t I win the queen?",
  "screen": "learn",
  "kind": "move",
  "about": "why Nd7, can't I win queen",
  "expect": "explain + why queen win fails"
 },
 {
  "q": "What should I be looking for?",
  "screen": "learn",
  "kind": "board",
  "about": "what to look for",
  "expect": "the thinking routine for this board"
 },
 {
  "q": "I need arrows. Too fast!",
  "screen": "learn",
  "kind": "command",
  "about": "arrows + slower",
  "expect": "arrows on, slow down"
 },
 {
  "q": "Say those moves again",
  "screen": "learn",
  "kind": "followup",
  "about": "repeat moves",
  "expect": "repeat the last line"
 },
 {
  "q": "It’s not letting me take b5",
  "screen": "learn",
  "kind": "app",
  "about": "can't take b5",
  "expect": "explain why b5 capture not allowed"
 },
 {
  "q": "Where is next?",
  "screen": "learn",
  "kind": "app",
  "about": "where is next",
  "expect": "where the Next control is"
 }
];
