// THE TAB-PLAN TABLE — which hand-picked middlegame plans each opening tab owns
// (WO-OPENINGS-REWRITE-01 R2). One row per curated opening, read by ONE lookup
// (`tabPlans.curatedTabPlanIds` / `tabPlanIds`). It replaces 84 per-opening
// resolver functions joined with `??`, where an opening that forgot to add its
// function to the chain silently fell back.
//
// No algorithm decides what shows on a tab — every plan id below was chosen
// for that specific line (David 2026-05-21: "I want you hand picking all lines
// that go into these tabs. no algos make decisions like that"). Values are
// exact ids from middlegame-plans.json. A tab may carry several ids: an
// `-endgame` plan renders in the tab's endgame section (EndgamePlansSection
// filters on the suffix).
//
// A NEW OPENING with hand-picked tab plans adds its row here — nothing else.
// An opening with no row falls back in `tabPlanIds`: a variation → its own
// `mp-<id>-<tab>` plan, the main line → every plan of the opening.

/** Which of a tab's two names a row's keys are: `label` = the tab's display
 *  label (variationTabs.ts CURATED), `name` = the full variation name
 *  (repertoire / pro-repertoires.json `variation.name`). The display label can
 *  be truncated ("Austrian Attack w…"), so the Pirc and the pro rows key on
 *  the full name. Both are lower-cased; the main line is always `main`. */
export type TabPlanKey = 'label' | 'name';

export interface TabPlanRow {
  key: TabPlanKey;
  /** Plan ids per tab key. An explicit [] = "no plan for this tab" (the
   *  section stays empty — empty > generic); a tab not listed here falls
   *  through to `containing`, then `otherTabs`, then the generic fallback. */
  tabs: Readonly<Record<string, readonly string[]>>;
  /** A tab whose key CONTAINS `text` owns `ids` (first match, in order). */
  containing?: ReadonlyArray<{ readonly text: string; readonly ids: readonly string[] }>;
  /** What every other tab of this opening owns. Absent → an unlisted tab is
   *  not curated and takes the generic fallback. */
  otherTabs?: readonly string[];
}

export const TAB_PLAN_TABLE: Readonly<Record<string, TabPlanRow>> = {
  // ── THE MASTERCLASS COURSES (repertoire.json) — keyed on the tab's
  // display label, except the Pirc (its full variation name).
  'ruy-lopez': {
    key: 'label',
    tabs: {
      main: ['mp-ruylopez-d4'],
      berlin: ['mp-ruylopez-berlin', 'mp-ruylopez-berlin-endgame'],
      open: ['mp-ruylopez-open'],
      marshall: ['mp-ruylopez-marshall'],
      exchange: ['mp-ruylopez-exchange'],
      breyer: ['mp-ruylopez-breyer'],
      chigorin: ['mp-ruylopez-chigorin'],
      zaitsev: ['mp-ruylopez-zaitsev'],
    },
  },
  'pirc-defence': {
    key: 'name',
    tabs: {
      // The main line carries NO plan: it is just the d6/Nf6/g6 move order, and
      // a concrete plan only exists once White commits to a system (each lands
      // on its own tab). `main: []` keeps the section empty instead of showing
      // every plan (playbook §3: empty > generic).
      main: [],
      'austrian attack': ['mp-pircdefence-austrian'],
      'classical system': ['mp-pircdefence-classical'],
      '150 attack': ['mp-pircdefence-150'],
      'byrne variation': ['mp-pircdefence-byrne'],
      'lion variation': ['mp-pircdefence-lion'],
      'fianchetto system': ['mp-pircdefence-fianchetto'],
      'czech defence': ['mp-pircdefence-czech'],
      'austrian attack with e5 c5': ['mp-pircdefence-austrian-e5'],
    },
  },
  'vienna-game': {
    key: 'label',
    tabs: {
      main: ['mp-viennagame-classical'],
      gambit: ['mp-viennagame-gambit'],
      'vs 2…nc6': ['mp-viennagame-vs-nc6'],
      'frankenstein-dracula': ['mp-viennagame-frankenstein-dracula'],
      paulsen: ['mp-viennagame-paulsen'],
    },
  },
  'italian-game': {
    key: 'label',
    tabs: {
      // Main line is the modern Giuoco Pianissimo (data spine, 2026-05-29) → its
      // middlegame plan is the d3-structure plan. The classical d4 isolani plan
      // (mp-italiangame-main) is retained in the JSON for a future Giuoco Piano tab.
      main: ['mp-italiangame-modern'],
      'two knights': ['mp-italiangame-twoknights'],
      'evans gambit': ['mp-italiangame-evans'],
      'møller': ['mp-italiangame-moller'],
    },
  },
  'scotch-game': {
    key: 'label',
    tabs: {
      main: ['mp-scotchgame-main'],
      mieses: ['mp-scotchgame-mieses'],
      'scotch gambit': ['mp-scotchgame-gambit'],
      'four knights': ['mp-scotchgame-fourknights'],
      'kasparov nb3': ['mp-scotchgame-kasparov'],
      steinitz: ['mp-scotchgame-steinitz'],
    },
  },
  'french-defence': {
    key: 'label',
    tabs: {
      // The main pill (Steinitz) carries the endgame plan; its middlegame ideas
      // live on the variation tabs.
      main: ['mp-frenchdefence-main-endgame'],
      exchange: ['mp-frenchdefence-exchange'],
      advance: ['mp-frenchdefence-advance'],
      tarrasch: ['mp-frenchdefence-tarrasch'],
      rubinstein: ['mp-frenchdefence-rubinstein'],
      winawer: ['mp-frenchdefence-winawer'],
      classical: ['mp-frenchdefence-classical'],
      burn: ['mp-frenchdefence-burn'],
      mccutcheon: ['mp-frenchdefence-mccutcheon'],
      'milner-barry': ['mp-frenchdefence-milnerbarry'],
      'fort knox': ['mp-frenchdefence-fortknox'],
    },
  },
  'scandinavian-defence': {
    key: 'label',
    tabs: {
      main: ['mp-scandinaviandefence-main'],
      'qa5 solid': ['mp-scandinaviandefence-qa5'],
      tiviakov: ['mp-scandinaviandefence-tiviakov'],
      modern: ['mp-scandinaviandefence-modern'],
      portuguese: ['mp-scandinaviandefence-portuguese'],
      icelandic: ['mp-scandinaviandefence-icelandic'],
      'gubinsky-melts': ['mp-scandinaviandefence-gubinsky'],
    },
  },
  'alekhine-defence': {
    key: 'label',
    tabs: {
      main: ['mp-alekhinedefence-main'],
      'four pawns': ['mp-alekhinedefence-fourpawns'],
      exchange: ['mp-alekhinedefence-exchange'],
      chase: ['mp-alekhinedefence-chase'],
      scandinavian: ['mp-alekhinedefence-scandtrans'],
      voronezh: ['mp-alekhinedefence-voronezh'],
    },
  },
  'benko-gambit': {
    key: 'label',
    tabs: {
      main: ['mp-benkogambit-main', 'mp-benkogambit-endgame'],
      declined: ['mp-benkogambit-declined'],
      zaitsev: ['mp-benkogambit-zaitsev'],
      'half-accepted': ['mp-benkogambit-halfaccepted'],
    },
  },
  'dutch-defence': {
    key: 'label',
    tabs: {
      main: ['mp-dutchdefence-main'],
      stonewall: ['mp-dutchdefence-stonewall'],
      classical: ['mp-dutchdefence-classical'],
      'ilyin-zhenevsky': ['mp-dutchdefence-ilyinzhenevsky'],
      'leningrad …e5': ['mp-dutchdefence-leningrade5'],
    },
  },
  'nimzo-indian': {
    key: 'label',
    tabs: {
      main: ['mp-nimzoindian-main', 'mp-nimzoindian-main-endgame'],
      rubinstein: ['mp-nimzoindian-rubinstein'],
      hübner: ['mp-nimzoindian-huebner'],
      leningrad: ['mp-nimzoindian-leningrad'],
      kasparov: ['mp-nimzoindian-kasparov'],
      sämisch: ['mp-nimzoindian-saemisch'],
      '4.f3': ['mp-nimzoindian-f3'],
      fischer: ['mp-nimzoindian-fischer'],
    },
  },
  'caro-kann': {
    key: 'label',
    tabs: {
      main: ['mp-carokann-main', 'mp-carokann-main-endgame'],
      advance: ['mp-carokann-advance', 'mp-carokann-advance-endgame'],
      exchange: ['mp-carokann-exchange'],
      'two knights': ['mp-carokann-two-knights'],
      panov: ['mp-carokann-panov'],
      fantasy: ['mp-carokann-fantasy'],
      tartakower: ['mp-carokann-tartakower'],
    },
  },
  'kings-gambit': {
    key: 'label',
    tabs: {
      // Main line (KGA Modern) → the central-bind plan; Classical (3…g5) → the
      // g3-lever / open-f-file plan. Other tabs have no dedicated plan yet, so the
      // section self-hides for them (empty > generic — playbook §0).
      main: ['mp-kings-gambit-bishop-pair-attack', 'mp-kings-gambit-endgame'],
      classical: ['mp-kings-gambit-open-f-file'],
    },
  },
  'sicilian-dragon': {
    key: 'label',
    tabs: {
      main: ['mp-siciliandragon-main'],
      soltis: ['mp-siciliandragon-soltis'],
      'chinese dragon': ['mp-siciliandragon-chinese'],
      classical: ['mp-siciliandragon-classical'],
      levenfish: ['mp-siciliandragon-levenfish'],
      accelerated: ['mp-siciliandragon-accelerated'],
      'anti-dragon bg5': ['mp-siciliandragon-antibg5'],
    },
  },
  'four-knights-game': {
    key: 'label',
    tabs: {
      main: ['mp-fourknightsgame-main'],
      'scotch four knights': ['mp-fourknightsgame-scotchfk'],
      'italian four knights': ['mp-fourknightsgame-italian'],
      'glek system': ['mp-fourknightsgame-glek', 'mp-fourknightsgame-glek-f4trap'],
      rubinstein: ['mp-fourknightsgame-rubinstein'],
    },
  },
  'glek-system': {
    key: 'label',
    tabs: {
      main: ['mp-gleksystem-bc5-f5', 'mp-gleksystem-traditional-f4', 'mp-gleksystem-f4trap'],
      'central 4...d5': ['mp-gleksystem-d5-outpost'],
      // Explicit EMPTY entries, so this table decides these tabs rather than
      // the generic fallback (main-line plans once leaked onto Pin and
      // Fianchetto). No dedicated plan exists for them yet; empty > wrong-tab
      // content. Author real plans when the corpus supports them, then fill
      // the lists.
      'pin 4...bb4': [],
      'fianchetto 4...g6': [],
    },
  },
  'london-system': {
    key: 'label',
    tabs: {
      main: ['mp-londonsystem-main'],
      'vs kid': ['mp-londonsystem-kid'],
      jobava: ['mp-londonsystem-jobava'],
    },
  },
  'catalan-opening': {
    key: 'label',
    tabs: {
      main: ['mp-catalanopening-main'],
      closed: ['mp-catalanopening-closed'],
      'vs slav': ['mp-catalanopening-slav'],
    },
  },
  'english-opening': {
    key: 'label',
    tabs: {
      main: ['mp-englishopening-main'],
      symmetrical: ['mp-englishopening-symmetrical'],
      mikenas: ['mp-englishopening-mikenas'],
    },
  },
  'reti-opening': {
    key: 'label',
    tabs: {
      main: ['mp-retiopening-main'],
      'anti-slav': ['mp-retiopening-antislav'],
    },
  },
  'kings-indian-attack': {
    key: 'label',
    tabs: {
      main: ['mp-kingsindianattack-main'],
      'kid-style': ['mp-kingsindianattack-kid'],
    },
  },
  'evans-gambit': {
    key: 'label',
    tabs: {
      main: ['mp-evansgambit-main', 'mp-evansgambit-endgame'],
      declined: ['mp-evansgambit-declined'],
      compromised: ['mp-evansgambit-compromised'],
      lasker: ['mp-evansgambit-lasker'],
    },
  },
  'sicilian-najdorf': {
    key: 'label',
    tabs: {
      main: ['mp-siciliannajdorf-main'],
      classical: ['mp-siciliannajdorf-classical'],
      '6.bg5': ['mp-siciliannajdorf-6bg5'],
      'poisoned pawn': ['mp-siciliannajdorf-poisoned'],
      '6.f3': ['mp-siciliannajdorf-6f3'],
      'fischer-sozin': ['mp-siciliannajdorf-fischer'],
      '6.g3': ['mp-siciliannajdorf-6g3'],
      ng4: ['mp-siciliannajdorf-ng4'],
      '6.a4': ['mp-siciliannajdorf-6a4'],
    },
  },
  'sicilian-sveshnikov': {
    key: 'label',
    tabs: {
      main: ['mp-siciliansveshnikov-main'],
      '9.bxf6': ['mp-siciliansveshnikov-9bxf6'],
      'chelyabinsk c4': ['mp-siciliansveshnikov-chelyabinsk'],
      'anti-svesh 6.nf3': ['mp-siciliansveshnikov-antisvesh'],
      kalashnikov: ['mp-siciliansveshnikov-kalashnikov'],
    },
  },
  'sicilian-alapin': {
    key: 'label',
    tabs: {
      main: ['mp-sicilianalapin-main'],
      // Every curated tab gets an EXPLICIT entry, so this table decides it
      // rather than the generic fallback (the Glek leak, 2026-07-30). The old
      // '2...d5' key matched no actual tab label (labels lower-case to
      // '2...d5 iqp' etc), so the d5 plan reached its tab only via the leak.
      '2...nf6 main': [],
      '2...d5 iqp': ['mp-sicilianalapin-d5'],
      '2...e6': [],
      '2...g6': [],
      '2...nf6 5.nf3': [],
      '2...d5 qxd5': ['mp-sicilianalapin-d5'],
      '2...nf6 iqp': [],
      '2...d5 nf6': [],
      'stoltz 4.nf3': [],
    },
  },
  'petrov-defence': {
    key: 'label',
    tabs: {
      main: ['mp-petrovdefence-main', 'mp-petrovdefence-main-endgame'],
      'steinitz 3.d4': ['mp-petrovdefence-steinitz'],
      'dxc3 lines': ['mp-petrovdefence-italian'],
      'three knights': ['mp-petrovdefence-threeknights'],
      '5.bd3': ['mp-petrovdefence-bd3'],
    },
  },
  'philidor-defence': {
    key: 'label',
    tabs: {
      main: ['mp-philidordefence-main'],
      exchange: ['mp-philidordefence-exchange'],
      antoshin: ['mp-philidordefence-antoshin'],
      nimzowitsch: ['mp-philidordefence-nimzowitsch'],
    },
  },
  'qgd': {
    key: 'label',
    tabs: {
      main: ['mp-qgd-main', 'mp-qgd-main-endgame'],
      tartakower: ['mp-qgd-tartakower'],
      lasker: ['mp-qgd-lasker'],
      exchange: ['mp-qgd-exchange'],
      'bf4 lines': ['mp-qgd-bf4'],
    },
  },
  'qga': {
    key: 'label',
    tabs: {
      main: ['mp-qga-main', 'mp-qga-main-endgame'],
      smyslov: ['mp-qga-smyslov'],
      sadler: ['mp-qga-sadler'],
      janowski: ['mp-qga-janowski'],
    },
  },
  'slav-defence': {
    key: 'label',
    tabs: {
      main: ['mp-slavdefence-main', 'mp-slavdefence-main-endgame'],
      'geller gambit': ['mp-slavdefence-geller'],
      schlechter: ['mp-slavdefence-schlechter'],
    },
  },
  'semi-slav': {
    key: 'label',
    tabs: {
      main: ['mp-semislav-main', 'mp-semislav-main-endgame'],
      meran: ['mp-semislav-meran'],
      botvinnik: ['mp-semislav-botvinnik'],
      moscow: ['mp-semislav-moscow'],
      stoltz: ['mp-semislav-stoltz'],
    },
  },
  'kings-indian-defence': {
    key: 'label',
    tabs: {
      main: ['mp-kingsindiandefence-main'],
      bayonet: ['mp-kingsindiandefence-bayonet'],
      'four pawns': ['mp-kingsindiandefence-fourpawns'],
      fianchetto: ['mp-kingsindiandefence-fianchetto'],
    },
  },
  'grunfeld-defence': {
    key: 'label',
    tabs: {
      main: ['mp-grunfelddefence-main'],
      'russian system': ['mp-grunfelddefence-russian'],
      'classical bc4': ['mp-grunfelddefence-bc4'],
      'modern rb1': ['mp-grunfelddefence-modernrb1'],
    },
  },
  'benoni-defence': {
    key: 'label',
    tabs: {
      main: ['mp-benonidefence-main'],
      fianchetto: ['mp-benonidefence-fianchetto'],
      taimanov: ['mp-benonidefence-taimanov'],
      'four pawns': ['mp-benonidefence-fourpawns'],
    },
  },
  'queens-indian': {
    key: 'label',
    tabs: {
      main: ['mp-queensindian-main', 'mp-queensindian-main-endgame'],
      'petrosian a3': ['mp-queensindian-petrosian'],
      '…bb4+': ['mp-queensindian-bb4'],
      'miles …ba6': ['mp-queensindian-miles'],
    },
  },
  'old-indian-defence': {
    key: 'label',
    tabs: {
      main: ['mp-oldindiandefence-main', 'mp-oldindiandefence-main-endgame'],
      czech: ['mp-oldindiandefence-czech'],
      'be2 system': ['mp-oldindiandefence-be2'],
    },
  },
  'two-knights-defence': {
    key: 'label',
    tabs: {
      main: ['mp-twoknightsdefence-main', 'mp-twoknightsdefence-main-endgame'],
      '4.d4 italian': ['mp-twoknightsdefence-d4'],
      'fried liver': ['mp-twoknightsdefence-friedliver'],
      'max lange': ['mp-twoknightsdefence-maxlange'],
    },
  },
  'budapest-gambit': {
    key: 'label',
    tabs: {
      main: ['mp-budapestgambit-main', 'mp-budapestgambit-endgame'],
      adler: ['mp-budapestgambit-adler'],
      fajarowicz: ['mp-budapestgambit-fajarowicz'],
    },
  },
  'albin-countergambit': {
    key: 'label',
    tabs: {
      main: ['mp-albincountergambit-main', 'mp-albincountergambit-endgame'],
      fianchetto: ['mp-albincountergambit-fianchetto'],
      'lasker trap': ['mp-albincountergambit-lasker'],
      spassky: ['mp-albincountergambit-spassky'],
    },
  },
  'schliemann-defence': {
    key: 'label',
    tabs: {
      main: ['mp-schliemanndefence-main'],
      'schönemann 4.d4': ['mp-schliemanndefence-schonemann'],
      '4.exf5': ['mp-schliemanndefence-exf5'],
      'dyckhoff 4.d3': ['mp-schliemanndefence-dyckhoff'],
    },
  },
  'queens-gambit': {
    key: 'label',
    tabs: {
      main: ['mp-queensgambit-minority'],
      exchange: ['mp-queensgambit-minority'],
      accepted: ['mp-queensgambit-accepted'],
      slav: ['mp-queensgambit-slav'],
    },
  },
  'trompowsky-attack': {
    key: 'label',
    tabs: {
      main: ['mp-trompowskyattack-main'],
      raptor: ['mp-trompowskyattack-raptor'],
      '2...e6': ['mp-trompowskyattack-e6'],
    },
  },
  'birds-opening': {
    key: 'label',
    tabs: {
      main: ['mp-birdsopening-main'],
      stonewall: ['mp-birdsopening-stonewall'],
      'nimzo-larsen': ['mp-birdsopening-nimzo'],
    },
  },

  // ── THE PRO REPERTOIRES (pro-repertoires.json) — keyed on the full variation
  // name. Without a row, every plan surfaces only on the main tab (pro-rep
  // doctrine STEP 12.5).
  'pro-naroditsky-alapin': {
    key: 'name',
    tabs: {
      // Main spine (2…Nf6) — plans anchored at the FULL 32-ply spine end
      // (where the opening actually finishes), walking real middlegame +
      // endgame play from his game vs FaustinoOro (2971). Hand-written
      // narration per move. Rebuilt 2026-05-28 after David caught both
      // bugs (auto-generated narration + mid-opening anchors).
      main: [
        'mp-pronaroAlapin-nf6main-mg',
      ],
      '2…d5 open variation': [
        'mp-pronaroAlapin-d5open-mg',
        'mp-pronaroAlapin-d5open-endgame',
      ],
      '2…e6 french-style': [
        'mp-pronaroAlapin-e6french-mg',
        'mp-pronaroAlapin-e6french-endgame',
      ],
      '2…d6 mainline': [
        'mp-pronaroAlapin-d6main-mg',
        'mp-pronaroAlapin-d6main-endgame',
      ],
      '2…g6 hyper-dragon': [
        'mp-pronaroAlapin-g6dragon-mg',
        'mp-pronaroAlapin-g6dragon-endgame',
      ],
      '2…nc6 line': [
        'mp-pronaroAlapin-nc6-mg',
        'mp-pronaroAlapin-nc6-endgame',
      ],
      'spine 4…d6 bc4 gambit': [
        'mp-pronaroAlapin-spined6-mg',
        'mp-pronaroAlapin-spined6-endgame',
      ],
      'spine 4…e6 iqp lines': [
        'mp-pronaroAlapin-spinee6-mg',
        'mp-pronaroAlapin-spinee6-endgame',
      ],
    },
  },
  'pro-naroditsky-kid': {
    key: 'name',
    tabs: {
      main: [],
      'classical mar del plata (be2)': ['mp-pronaroKID-classical-kingside'],
      'fianchetto variation (g3)': ['mp-pronaroKID-fianchetto-queenside', 'mp-pronaroKID-fianchetto-simplify'],
      'anti-kid with nf3 first': ['mp-pronaroKID-antikidnf3-yugoslav', 'mp-pronaroKID-antikidnf3-rooklift'],
      'makogonov (h3)': ['mp-pronaroKID-makogonov-kingside', 'mp-pronaroKID-makogonov-nc5'],
      'sämisch (f3)': ['mp-pronaroKID-saemisch-queenside', 'mp-pronaroKID-saemisch-central', 'mp-pronaroKID-saemisch-endgame'],
      'petrosian / nge2': ['mp-pronaroKID-petrosian-central', 'mp-pronaroKID-petrosian-re8'],
      'four pawns attack (f4)': ['mp-pronaroKID-fourpawns-reroute', 'mp-pronaroKID-fourpawns-counter'],
    },
  },
  // Naroditsky's remaining openings (KIA, Rossolimo, Fantasy Caro, Najdorf,
  // Alekhine, Ruy Lopez, Dragodorf, Jobava London) — two plans per variation
  // where the games support it (David 2026-05-29: "Always attempt for 2").
  'pro-naroditsky-kia': {
    key: 'name',
    tabs: {
      'main': ['mp-pronaroKIA-symmetric-attack'],
      'g6 modern setup': ['mp-pronaroKIA-symmetric-e5push'],
      'd5 kia mainline': ['mp-pronaroKIA-reti-attack'],
      'd4 kid transposition': ['mp-pronaroKIA-kid-transposition'],
      'vs ...e5 (reti gambit)': ['mp-pronaroKIA-vs-e5-conversion', 'mp-pronaroKIA-vs-e5-endgame'],
      'vs ...c6 (slav-like)': ['mp-pronaroKIA-vs-c6-attack', 'mp-pronaroKIA-vs-c6-endgame'],
      'vs ...b6 (owen)': ['mp-pronaroKIA-vs-b6-expand', 'mp-pronaroKIA-vs-b6-endgame'],
      'vs ...e6 (french-style)': ['mp-pronaroKIA-vs-e6-attack', 'mp-pronaroKIA-vs-e6-endgame'],
    },
  },
  'pro-naroditsky-rossolimo': {
    key: 'name',
    tabs: {
      'main': [],
      'nc6 rossolimo proper': ['mp-pronaroRoss-nc6-maroczy'],
      'e6 open avoidance': ['mp-pronaroRoss-e6-taimanov'],
      'bxd7+ trade': ['mp-pronaroRoss-bd7-conversion'],
      'c3 sideline': ['mp-pronaroRoss-c3-spanish', 'mp-pronaroRoss-c3-endgame'],
      'bc4 vs ...d6': ['mp-pronaroRoss-bc4-italian', 'mp-pronaroRoss-bc4-endgame'],
      'vs ...g6 (hyper dragon)': ['mp-pronaroRoss-g6-maroczy', 'mp-pronaroRoss-g6-endgame'],
    },
  },
  'pro-naroditsky-fantasy-caro': {
    key: 'name',
    tabs: {
      'main': [],
      'black accepts with dxe4': ['mp-pronaroFantasy-kingside-attack'],
    },
  },
  'pro-naroditsky-najdorf': {
    key: 'name',
    tabs: {
      'main': ['mp-pronaroNajdorf-opposite-castle-race'],
      'be3 english attack': ['mp-pronaroNaj-english-race', 'mp-pronaroNaj-english-bxh6'],
      'be2 classical': ['mp-pronaroNaj-classical-development', 'mp-pronaroNaj-classical-nb6'],
      'h3 adams attack': ['mp-pronaroNaj-adams-defense', 'mp-pronaroNaj-adams-counter'],
      'bc4 sozin / fischer attack': [],
    },
  },
  'pro-naroditsky-alekhine': {
    key: 'name',
    tabs: {
      'main': [],
      'nc3 two knights': ['mp-pronaroAlek-twoknights-equality'],
      'c4 modern main': ['mp-pronaroAlek-modern-development', 'mp-pronaroAlek-modern-nb4'],
      'nf3 / modern quiet': ['mp-pronaroAlek-modernquiet-conversion'],
    },
  },
  'pro-naroditsky-ruy-lopez': {
    key: 'name',
    tabs: {
      'main': [],
      'berlin defense': ['mp-pronaroRuy-berlin-endgame', 'mp-pronaroRuy-berlin-bd2'],
      'closed with d3': ['mp-pronaroRuy-d3-positional', 'mp-pronaroRuy-d3-flank'],
      'steinitz defense': ['mp-pronaroRuy-steinitz-d4', 'mp-pronaroRuy-steinitz-e5push'],
    },
  },
  'pro-naroditsky-dragodorf': {
    key: 'name',
    tabs: {
      'main': ['mp-pronardragodorf-main-cfile'],
      'english attack (be3)': ['mp-pronardragodorf-english-queenside'],
      'classical (be2)': ['mp-pronardragodorf-classical-e5'],
      'h3 adams attack': [],
    },
  },
  'pro-naroditsky-jobava-london': {
    key: 'name',
    tabs: {
      'main': [],
      'e6 french setup': ['mp-pronaroJob-french-attack'],
      'c6 slav-style': ['mp-pronaroJob-slav-trade'],
      'a6 with ...c5': ['mp-pronaroJob-a6c5-bd3'],
    },
  },
  'pro-naroditsky-caro-kann': {
    key: 'name',
    tabs: {
      'main': [],
      'two knights variation (nc3)': ['mp-pronarocaro-twoknights-b5-coord', 'mp-pronarocaro-two-knights-endgame'],
      "king's indian attack (nf3)": ['mp-pronarocaro-kia-b5-expansion', 'mp-pronarocaro-kia-reti-endgame'],
      'exchange variation (exd5)': ['mp-pronarocaro-exchange-bg4-pin', 'mp-pronarocaro-exchange-endgame'],
      'classical variation (nc3)': ['mp-pronarocaro-classical-kingside-storm', 'mp-pronarocaro-classical-endgame'],
      'fantasy variation (f3)': ['mp-pronarocaro-fantasy-central-break', 'mp-pronarocaro-fantasy-endgame'],
      'modern defense transposition (d4 g6)': ['mp-pronarocaro-modern-trade-and-develop', 'mp-pronarocaro-modern-trans-endgame'],
      'advance variation (3.e5 c5)': ['mp-pronarocaro-advance-knight-reroute', 'mp-pronarocaro-advance-c5-endgame'],
      'advance variation (3.e5 bf5)': ['mp-pronarocaro-advance-bf5-piece-storm', 'mp-pronarocaro-advance-bf5-endgame'],
      'panov-botvinnik attack (4.c4)': ['mp-pronarocaro-panov-queenside-coordination', 'mp-pronarocaro-panov-endgame'],
      'd3 sideline (2.d3)': ['mp-pronarocaro-d3-bishop-trade-pressure', 'mp-pronarocaro-d3-sideline-endgame'],
    },
  },
  // The ...Bxd5 outpost plan anchors on the shared Be2/Nd5 path the main line
  // and the Classical tab both run through; the English Attack tab has no
  // authored plan yet (empty = the zone self-hides, never fabricated).
  'pro-caruana-najdorf': {
    key: 'name',
    tabs: {
      'main': ['mp-pro-caruana-najdorf-outpost'],
      'english attack 6.be3': [],
      'classical 6.be2': ['mp-pro-caruana-najdorf-outpost', 'mp-pro-caruana-najdorf-endgame'],
    },
  },
  'pro-gothamchess-caro-kann': {
    key: 'name',
    tabs: {
      // Main line IS the Classical 4...Bf5 (opening.pgn), so it carries the two
      // Classical counter-race plans + the standalone d3-sideline endgame.
      main: [
        'mp-pro-gothamchess-carokann-c5',
        'mp-pro-gothamchess-carokann-solid',
        'mp-progothamchess-caro-d3-endgame',
      ],
      'classical 4...bf5 (main line)': [
        'mp-pro-gothamchess-carokann-c5',
        'mp-pro-gothamchess-carokann-solid',
      ],
      'classical capablanca 4...bf5 5.ng3 bg6 6.h4': [
        'mp-pro-gothamchess-carokann-c5',
        'mp-pro-gothamchess-carokann-solid',
      ],
      'tartakower / two knights 3...nf6': ['mp-progothamchess-caro-classical-bd6'],
      'two knights 2.nc3 d5 3.nf3 bg4': ['mp-progothamchess-caro-two-knights'],
      'advance variation 3.e5 bf5': ['mp-progothamchess-caro-bf5-trade'],
      'advance variation 3.e5 c5': ['mp-progothamchess-caro-advance-c5'],
      // Exchange: middlegame fianchetto plan only. A true Exchange (non-Panov)
      // endgame anchor is deferred — the cleanest R+B win in the corpus (vs Kobalia
      // 2777) was a long grind without a sharp teachable conversion (empty >
      // confusing, per doctrine).
      'exchange variation 3.exd5': ['mp-progothamchess-caro-exchange-fianchetto'],
      // Panov: the …g6 fianchetto plan hunting the isolani + the b3-bishop trade,
      // and the R+B endgame from his win over GM Bortnyk (2780) — the fianchetto
      // bishop converting against the isolani structure.
      'panov-botvinnik attack 3.exd5 cxd5 4.c4': [
        'mp-progothamchess-caro-panov',
        'mp-progothamchess-caro-panov-endgame',
      ],
      'fantasy variation 3.f3': [
        'mp-progothamchess-caro-fantasy-bd6',
        'mp-progothamchess-caro-fantasy-endgame',
      ],
    },
  },
  'pro-gothamchess-trompowsky': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-tromp-e6-bishoppair',
        'mp-progothamchess-tromp-c5-gambit',
      ],
      'main line vs …e6': ['mp-progothamchess-tromp-e6-bishoppair'],
      'vaganian attack (…ne4)': ['mp-progothamchess-tromp-vaganian-gambit'],
      '…d5 system': ['mp-progothamchess-tromp-d5-squeeze'],
      '…g6 fianchetto': ['mp-progothamchess-tromp-g6-doubled'],
    },
  },
  'pro-gothamchess-english': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-english-botvinnik-main',
        'mp-progothamchess-english-flank-attack',
      ],
      'botvinnik system vs kid-setup': [
        'mp-progothamchess-english-botvinnik-main',
        'mp-progothamchess-english-flank-attack',
      ],
      'symmetric (…e5)': ['mp-progothamchess-eng-e5-reversedsicilian'],
      'anti-french (…e6)': ['mp-progothamchess-eng-e6-doublefianchetto'],
      'symmetric (…c5)': ['mp-progothamchess-eng-c5-maroczy'],
      'vs …c6 (slav-style)': ['mp-progothamchess-eng-c6-slav-g4'],
    },
  },
  'pro-gothamchess-vienna': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-vie-gambit-main-attack',
        'mp-progothamchess-vienna-gambit-main',
      ],
      'vienna gambit main line': [
        'mp-progothamchess-vie-gambit-main-attack',
        'mp-progothamchess-vienna-gambit-main',
      ],
      'vienna quiet (bc4 + d3)': ['mp-progothamchess-vie-quiet-bc4-na4'],
      'vienna with …nc6 + …bc5': ['mp-progothamchess-vie-nc6-forcing'],
      'vienna gambit accepted': ['mp-progothamchess-vie-accepted-space'],
    },
  },
  'pro-gothamchess-italian': {
    key: 'name',
    tabs: {
      main: ['mp-progothamchess-italian-evans-style'],
      'giuoco piano c3-d4': ['mp-progothamchess-italian-evans-style'],
      'slow italian d3': [],
      'evans gambit': ['mp-progothamchess-italian-evans-bigcenter'],
      'two knights (…nf6)': ['mp-progothamchess-italian-twoknights-kside'],
      // The lines he teaches, added as tabs 2026-11-11 (docs/levy-lines/decisions):
      // no middlegame plan is anchored at their terminals yet.
      'fried liver attack': [],
      'knight attack …na5': [],
      'evans: castle first': [],
      'evans: …be7': [],
      'scotch gambit': [],
    },
  },
  'pro-gothamchess-london': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-london-standard-ne5',
        'mp-progothamchess-london-classical-attack',
      ],
      'standard setup vs d5': [
        'mp-progothamchess-london-standard-ne5',
        'mp-progothamchess-london-e6-classical',
      ],
      'vs …c6 (via 2.bf4)': ['mp-progothamchess-london-c6-c4break'],
      "vs king's indian (bh6 + opposite-side castle attack)": [
        'mp-progothamchess-london-kid-rooksac',
      ],
      'aggressive jobava-london hybrid': [
        'mp-progothamchess-london-jobava-nb5',
      ],
      // The six tabs added from the repertoire's taught lines (2026-11-11): no
      // middlegame plan is anchored at their ends yet.
      'pyramid with ne5': [],
      'qb3 vs …qb6': [],
      'vs early …bf5': [],
      'vs grünfeld setup': [],
      'poisoned b2 pawn': [],
      'd5 vs …c5': [],
    },
  },
  'pro-gothamchess-ponziani': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-ponziani-main-qb3',
        'mp-progothamchess-ponziani-d4-thrust',
      ],
      'main line 3...nf6 4.d4': [
        'mp-progothamchess-ponziani-main-qb3',
        'mp-progothamchess-ponziani-d4-thrust',
      ],
      '4…nxe4 (dxc6)': ['mp-progothamchess-ponziani-nxe4-gambit'],
      '3...d5 central counter': ['mp-progothamchess-ponziani-d5-qa4'],
    },
  },
  'pro-gothamchess-anti-sicilian': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-antisic-e6-open',
        'mp-progothamchess-antisic-g6-d4break',
      ],
      'rossolimo 3.bb5 e6': ['mp-progothamchess-antisic-e6-open'],
      'rossolimo 3.bb5 g6': ['mp-progothamchess-antisic-g6-d4break'],
      'accelerated pawn storm (positional squeeze)': ['mp-progothamchess-antisic-accel-storm'],
    },
  },
  'pro-gothamchess-milner-barry': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-mb-main-fstorm',
        'mp-progothamchess-mb-advance-battery',
      ],
      'main gambit line': [
        'mp-progothamchess-mb-main-fstorm',
        'mp-progothamchess-french-rubinstein',
      ],
      'black declines with bd7': ['mp-progothamchess-mb-declines-na4'],
      'anti-french 3.e5 advance': ['mp-progothamchess-mb-advance-battery'],
    },
  },
  'pro-gothamchess-fantasy-caro': {
    key: 'name',
    tabs: {
      main: ['mp-progothamchess-fantasy-dxe4-center'],
      'main line 3...dxe4 4.fxe4': ['mp-progothamchess-fantasy-dxe4-center'],
      'solid 3...e6': ['mp-progothamchess-fantasy-e6-qg4attack'],
      'aggressive 3...g6': ['mp-progothamchess-fantasy-g6-poisonpawn'],
      'counter 3...qb6': ['mp-progothamchess-fantasy-qb6-na4'],
    },
  },
  'pro-gothamchess-stafford-refute': {
    key: 'name',
    tabs: {
      main: ['mp-progothamchess-stafford-consolidate'],
      'main refutation d3': ['mp-progothamchess-stafford-consolidate'],
      '4...dxc6 5.e5 line': ['mp-progothamchess-stafford-e5space'],
    },
  },
  'pro-gothamchess-caro-advance-white': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-caroadv-qxd4-punish',
      ],
      'main line (vs …bf5)': [
        'mp-progothamchess-caro-advance-h4-pin',
        'mp-progothamchess-caroadv-h6-g4space',
        'mp-progothamchess-caroadv-qxd4-punish',
      ],
      'vs …c5 (botvinnik-carls)': ['mp-progothamchess-caroadv-c5-dxc5'],
    },
  },
  'pro-gothamchess-kia': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-kia-e5-kingside',
        'mp-progothamchess-kia-system-attack',
      ],
      'vs …d5 + …c5': [
        'mp-progothamchess-kia-e5-kingside',
        'mp-progothamchess-kia-system-attack',
      ],
      'vs sicilian (kia vs …c5 + …nf6)': ['mp-progothamchess-kia-sicilian-reroute'],
    },
  },
  'pro-gothamchess-closed-sicilian': {
    key: 'name',
    tabs: {
      main: ['mp-progothamchess-closedsic-bb5-bg5', 'mp-progothamchess-closed-sicilian-bb5-trade'],
      'closed sicilian main': ['mp-progothamchess-closedsic-bb5-bg5', 'mp-progothamchess-closed-sicilian-bb5-trade'],
      'vs …d6': ['mp-progothamchess-closedsic-d6-oppositecastle'],
      'vs …e6': ['mp-progothamchess-closedsic-e6-oooattack'],
      'vs …g6 (bxc6)': ['mp-progothamchess-closedsic-g6-nd5'],
    },
  },
  'pro-gothamchess-scandinavian': {
    key: 'name',
    tabs: {
      main: ['mp-progothamchess-scand-qa5-bxc3'],
      'main line qa5': ['mp-progothamchess-scand-qa5-bxc3'],
      '2...nf6 scandinavian': [],
      'portuguese …bg4': [
        'mp-progothamchess-scandi-portuguese',
        'mp-progothamchess-scand-nf6bg4-oooattack',
      ],
      'vs nc3 (nxd5)': ['mp-progothamchess-scand-nf6nc3-bg4pin'],
      'vs bb5+': ['mp-progothamchess-scand-bb5-ne5'],
    },
  },
  'pro-gothamchess-qgd': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-qgd-carlsbad-e5',
        'mp-progothamchess-qgd-tartakower-b6',
      ],
      'classical 5.bf4 line': [
        'mp-progothamchess-qgd-classical',
        'mp-progothamchess-qgd-tartakower-b6',
      ],
      'exchange variation': ['mp-progothamchess-qgd-carlsbad-e5'],
    },
  },
  'pro-gothamchess-french-defense': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-french-rubinstein-qxd4',
        'mp-progothamchess-french-tarrasch-b5gambit',
      ],
      'rubinstein main line': [
        'mp-progothamchess-french-rubinstein-qxd4',
        'mp-progothamchess-french-defense-rubinstein',
      ],
      'tarrasch (nd2)': ['mp-progothamchess-french-tarrasch-b5gambit'],
      'exchange (exd5 lines)': [
        'mp-progothamchess-french-exchange-develop',
        'mp-progothamchess-french-advance-counter',
      ],
    },
  },
  'pro-gothamchess-pirc-defense': {
    key: 'name',
    tabs: {
      main: [
        'mp-progothamchess-pirc-austrian-c5',
        'mp-progothamchess-pirc-classical-e5',
      ],
      'austrian attack (f4)': [
        'mp-progothamchess-pirc-austrian-c5',
        'mp-progothamchess-pirc-c5-break',
      ],
      'classical (nf3 setup)': ['mp-progothamchess-pirc-classical-e5'],
      '150 attack (be3 + f3)': ['mp-progothamchess-pirc-150-b5'],
    },
  },
  'pro-ericrosen-stafford': {
    key: 'name',
    tabs: {
      'main': [],
      'five knights (5.nc3)': ['mp-proericstafford-nc3-openh'],
      'space grab (5.e5)': [],
      'knight retreat (4.nf3)': [],
      'four knights decline (3.nc3)': ['mp-proericstafford-fourknights-bishop'],
      'pawn returned (4.d4)': [],
    },
  },
  'pro-ericrosen-london': {
    key: 'name',
    tabs: {
      'main': ['mp-proericlondon-ne5-battery', 'mp-proericlondon-endgame'],
      'vs …d5 classical': ['mp-proericlondon-ne5-battery'],
      'vs …e6 setup': ['mp-proericlondon-ne5-battery'],
      'vs …c5 and …qb6': [],
      'vs …d6 (e4 attacking hybrid)': ['mp-proericlondon-h4-storm'],
    },
  },
  'pro-ericrosen-sicilian': {
    key: 'name',
    tabs: {
      'main': ['mp-proericsicilian-maroczy-a5', 'mp-proericsicilian-endgame'],
      'taimanov (…e6)': [],
      'vs rossolimo (bb5)': [],
      'vs alapin (c3)': [],
      'vs 2.nc3': [],
    },
  },
  // Eric Rosen's QGD, Budapest, Closed Sicilian, Scandinavian and French: the
  // main tab carries the middlegame (+ endgame) plans; every variation tab has
  // no dedicated plan yet, so it resolves to [] rather than falling back.
  'pro-ericrosen-qgd': {
    key: 'name',
    tabs: { main: ['mp-proericqgd-minority-counter', 'mp-proericqgd-endgame'] },
    otherTabs: [],
  },
  'pro-ericrosen-budapest': {
    key: 'name',
    tabs: { main: ['mp-proericbudapest-e5knight'] },
    otherTabs: [],
  },
  'pro-ericrosen-closed-sicilian': {
    key: 'name',
    tabs: { main: ['mp-proericclosedsic-f5storm'] },
    otherTabs: [],
  },
  'pro-ericrosen-scandinavian': {
    key: 'name',
    tabs: { main: ['mp-proericscandi-e5break'] },
    otherTabs: [],
  },
  'pro-ericrosen-french': {
    key: 'name',
    tabs: { main: ['mp-proericfrench-c5break'] },
    otherTabs: [],
  },
  // Magnus Carlsen: the main-line middlegame plan (+ endgame) under 'main', the
  // authored variation plans by name, [] for every other Carlsen tab. A
  // `pro-carlsen…` opening with no row of its own still resolves to [] on every
  // tab (`TAB_PLAN_FAMILIES`).
  'pro-carlsen-open-sicilian': {
    key: 'name',
    tabs: { main: ['mp-procarlsen-opensicilian-storm', 'mp-carlsen-opensic-endgame'], 'classical bc4': ['mp-carlsen-opensic-classical'] },
    otherTabs: [],
  },
  'pro-carlsen-ruy-lopez': {
    key: 'name',
    tabs: { main: ['mp-procarlsen-ruy-knighttour', 'mp-procarlsen-ruy-endgame'], 'italian bc4': ['mp-carlsen-ruy-italian'], 'four knights nc3': ['mp-carlsen-ruy-fourknights'] },
    otherTabs: [],
  },
  'pro-carlsen-queens-pawn': {
    key: 'name',
    tabs: { main: ['mp-procarlsen-queenspawn-battery', 'mp-procarlsen-queenspawn-endgame'], "vs king's indian g6": ['mp-carlsen-qp-kid'], 'catalan g3': ['mp-carlsen-qp-catalan'] },
    otherTabs: [],
  },
  'pro-carlsen-sicilian': {
    key: 'name',
    tabs: { main: ['mp-procarlsen-sicilian-qstorm', 'mp-carlsen-sicilian-endgame'], 'open vs ...nc6': ['mp-carlsen-sic-opennc6'] },
    otherTabs: [],
  },
  'pro-carlsen-1e5': {
    key: 'name',
    tabs: { main: ['mp-procarlsen-1e5-chigorin', 'mp-procarlsen-1e5-endgame'], 'vs anti-marshall d3': ['mp-carlsen-1e5-antimarshall'] },
    otherTabs: [],
  },
  'pro-carlsen-nimzo': {
    key: 'name',
    tabs: { main: ['mp-procarlsen-nimzo-qside', 'mp-procarlsen-nimzo-endgame'], 'vs catalan g3': ['mp-carlsen-nimzo-catalan'] },
    otherTabs: [],
  },
  'pro-carlsen-kid': {
    key: 'name',
    tabs: { main: ['mp-procarlsen-kid-f5storm', 'mp-carlsen-kid-endgame'] },
    otherTabs: [],
  },
  'pro-carlsen-french': {
    key: 'name',
    tabs: { main: ['mp-procarlsen-french-qbreak', 'mp-carlsen-french-endgame'], 'vs advance e5': ['mp-carlsen-french-advance'] },
    otherTabs: [],
  },
  'pro-carlsen-scandinavian': {
    key: 'name',
    tabs: { main: ['mp-carlsen-scandinavian-c5', 'mp-carlsen-scandinavian-endgame'] },
    otherTabs: [],
  },
  'pro-carlsen-caro-kann': {
    key: 'name',
    tabs: { main: ['mp-carlsen-caro-c5', 'mp-carlsen-caro-endgame'] },
    otherTabs: [],
  },
  'pro-carlsen-modern': {
    key: 'name',
    tabs: { main: ['mp-carlsen-modern-c5', 'mp-carlsen-modern-endgame'] },
    otherTabs: [],
  },
  'pro-carlsen-closed-sicilian': {
    key: 'name',
    tabs: { main: ['mp-carlsen-closedsic-f5', 'mp-carlsen-closedsic-endgame'] },
    otherTabs: [],
  },
  'pro-carlsen-reti': {
    key: 'name',
    tabs: { main: ['mp-carlsen-reti-e5', 'mp-carlsen-reti-endgame'] },
    otherTabs: [],
  },
  'pro-carlsen-kings-gambit': {
    key: 'name',
    tabs: { main: ['mp-carlsen-kg-d4'] },
    otherTabs: [],
  },
  // Samay Raina: the main tab carries the middlegame (+ endgame) plan; every
  // variation tab resolves to [] until its plan is authored.
  'pro-samayraina-open-sicilian': {
    key: 'name',
    tabs: { main: ['mp-prosamayopensic-d5outpost', 'mp-prosamayOpenSicilian-endgame'] },
    otherTabs: [],
  },
  'pro-samayraina-ruy': {
    key: 'name',
    tabs: { main: ['mp-prosamayruy-d4break'] },
    otherTabs: [],
  },
  'pro-samayraina-italian': {
    key: 'name',
    tabs: { main: ['mp-prosamayitalian-reroute', 'mp-prosamayItalian-endgame'] },
    otherTabs: [],
  },
  'pro-samayraina-french-white': {
    key: 'name',
    tabs: { main: ['mp-prosamayfrenchw-minority'] },
    otherTabs: [],
  },
  'pro-samayraina-caro-white': {
    key: 'name',
    tabs: { main: ['mp-prosamaycarow-iqp'] },
    otherTabs: [],
  },
  // Main tab (Italian Pianissimo) carries the …d5-break plan; any tab whose
  // name contains "ruy" keeps the Chigorin plan; other tabs resolve to [].
  'pro-samayraina-open-e5': {
    key: 'name',
    tabs: { main: ['mp-prosamayopene5-d5break'] },
    containing: [{ text: 'ruy', ids: ['mp-prosamayopene5-chigorin'] }],
    otherTabs: [],
  },
  'pro-samayraina-sicilian-black': {
    key: 'name',
    tabs: { main: ['mp-prosamaysicb-d5break', 'mp-prosamaysicb-b5expansion', 'mp-prosamaySicilianBlack-endgame'] },
    otherTabs: [],
  },
  'pro-samayraina-scandi': {
    key: 'name',
    tabs: { main: ['mp-prosamayscandi-c5break'] },
    otherTabs: [],
  },
  'pro-samayraina-kings-gambit': {
    key: 'name',
    tabs: { main: ['mp-prosamaykg-centralbreak'] },
    otherTabs: [],
  },
};

/** An opening FAMILY by id prefix: an opening with no row of its own whose id
 *  starts with `prefix` takes `row`. Every Carlsen tab without an authored plan
 *  resolves to [] (the pro-rep tab-plan coverage gate), including a Carlsen
 *  opening added before its row is. */
export const TAB_PLAN_FAMILIES: ReadonlyArray<{ readonly prefix: string; readonly row: TabPlanRow }> = [
  { prefix: 'pro-carlsen', row: { key: 'name', tabs: {}, otherTabs: [] } },
];
