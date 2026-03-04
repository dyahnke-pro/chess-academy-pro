# Chess Academy Pro — Build Guide for David

**A step-by-step guide to building this app using Claude Code.**
**No prior technical experience required. Med-surg nursing experience is surprisingly relevant.**

---

## What You're Building

You're building a chess training app — a web app that also runs on iPhone via TestFlight. You won't be writing code yourself. You'll be giving instructions to **Claude Code**, an AI coding tool that reads your instructions, writes code, creates files, runs commands, and builds the app for you.

Think of Claude Code as a very competent resident. You hand it orders, it does the work, and it checks back with you before doing anything significant. Your job is to supervise, not to operate.

Your job is to:
1. Set up your computer (one-time prep — like orienting to a new unit)
2. Feed work orders into Claude Code sessions (one at a time — like executing physician orders)
3. Review what Claude builds and tell it to fix anything that's wrong (your clinical judgment still matters)

This guide covers everything from "I've never opened Terminal" to "I just deployed to TestFlight."

---

## Table of Contents

1. [Understand Your Tools](#part-1-understand-your-tools)
2. [Set Up Your Mac](#part-2-set-up-your-mac)
3. [Install Claude Code](#part-3-install-claude-code)
4. [Get the Project Files](#part-4-get-the-project-files)
5. [How Claude Code Works](#part-5-how-claude-code-works)
6. [Running Your First Work Order](#part-6-running-your-first-work-order)
7. [The Build Process — Work Order by Work Order](#part-7-the-build-process)
8. [Testing](#part-8-testing)
9. [Deploying to iPhone via TestFlight](#part-9-deploying-to-iphone)
10. [Troubleshooting](#part-10-troubleshooting)
11. [Glossary](#glossary)

---

## Part 1: Understand Your Tools

Before we start installing things, here's what each tool does and why you need it. Think of it as a supply checklist before a procedure.

| Tool | What It Is | Why You Need It |
|------|-----------|----------------|
| **Terminal** | A text-based interface built into your Mac. You type commands instead of clicking buttons. | Everything in this guide runs through Terminal. It's your nursing station — you'll live here. |
| **Xcode** | Apple's app for building iPhone/iPad/Mac apps. | Needed to compile the app for iOS and upload to TestFlight. Think of it as the OR — you only go there for the final procedure (deploying to iPhone). |
| **Homebrew** | A tool that installs other developer tools. Think of it as Pyxis for your Mac — you request what you need and it dispenses it. | Makes installing Node.js, Git, and other tools easy. |
| **Node.js** | A program that runs JavaScript outside a web browser. | The app is built with JavaScript/TypeScript. Node.js is the runtime that keeps the code alive — the ventilator for your app, if you will. |
| **npm** | Comes bundled with Node.js. Downloads and manages code libraries. | Installs all the pieces the app needs (React, chess engine, etc.). It's the pharmacy — fills your code prescriptions. |
| **Git** | Tracks every change made to your project. Like charting for your codebase — every action documented, every change timestamped. | Lets you save progress, undo mistakes, and manage versions. |
| **VS Code** | A free code editor by Microsoft. Shows your files with color-coded syntax. | Useful for reviewing code. Think of it as the telemetry monitor — you watch, Claude operates. |
| **Claude Code** | An AI coding assistant that runs in Terminal. You describe what you want, it writes the code. | Your resident. It does the hands-on work while you supervise and direct. |

---

## Part 2: Set Up Your Mac

Do these steps in order. Each one depends on the ones before it — just like hanging an IV piggyback: you need the primary line before you can hang the secondary.

### Step 1: Open Terminal

Press **Cmd + Space** (the Command key and spacebar together). A search bar appears. Type **Terminal** and press **Enter**.

A window opens with a blinking cursor. This is Terminal. It's going to feel weird at first — like your first day on a med-surg floor when everything was paper charts and verbal orders. You'll get used to it fast. Everything you install will be done by typing commands here and pressing Enter.

**Tip:** Right-click the Terminal icon in your Dock and choose **Options > Keep in Dock** so you can find it easily later. You'll be opening this more often than the Pyxis.

### Step 2: Install Xcode

1. Open the **App Store** (the blue "A" icon in your Dock).
2. Search for **Xcode**.
3. Click **Get**, then **Install**. Sign in with your Apple ID if prompted.
4. Wait. Xcode is approximately 12-15 GB. This will take a while depending on your internet speed. Good time to chart. Or eat. Or both.
5. Once installed, **open Xcode once** from your Applications folder. It will ask to install additional components. Click **Install** and wait for it to finish.
6. Close Xcode when it's done.

Now go back to Terminal and type this command, then press Enter:

```
xcode-select --install
```

A popup appears. Click **Install**, then **Agree** to the license. Wait for it to finish.

**Verify it worked** — type this and press Enter:

```
xcode-select -p
```

You should see something like `/Applications/Xcode.app/Contents/Developer`. If you do, you're good.

### Step 3: Install Homebrew

Copy and paste this entire line into Terminal, then press Enter:

```
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

It will ask for your Mac password (the one you use to log in). **When you type your password, no characters will appear on screen.** This is normal — it's a security feature, not a glitch. Think of it like a med drawer code: you punch it in, nothing displays, but the system registers it. Just type your password and press Enter.

Wait for it to finish. It may take several minutes.

**If you have an Apple Silicon Mac (M1, M2, M3, or M4 chip):** Run these two commands after Homebrew finishes:

```
(echo; echo 'eval "$(/opt/homebrew/bin/brew shellenv)"') >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

**Not sure which chip you have?** Click the Apple menu () in the top-left corner of your screen, then **About This Mac**. If it says "Apple M1" (or M2, M3, M4), you have Apple Silicon. If it says "Intel," skip the two commands above.

**Verify it worked:**

```
brew --version
```

You should see a version number like `Homebrew 4.x.x`.

### Step 4: Install Node.js

We'll use **nvm** (Node Version Manager), which makes it easy to install and update Node.js. Think of nvm as a formulary — it manages which version of Node.js your system runs, and lets you switch versions if needed.

Copy and paste this into Terminal:

```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.4/install.sh | bash
```

**Important:** Close Terminal completely (Cmd + Q) and open a new Terminal window. This is necessary for nvm to work. (Yes, "turn it off and back on" is a real fix in software. Nursing has the same thing — "reboot the IV pump.")

In the new Terminal window, install Node.js:

```
nvm install --lts
```

Then set it as your default:

```
nvm alias default lts/*
```

**Verify it worked:**

```
node --version
npm --version
```

You should see version numbers for both (e.g., `v24.x.x` and `10.x.x`).

### Step 5: Set Up Git

Git was installed when you installed Xcode Command Line Tools. You just need to tell it who you are — think of this as putting your ID badge on. Run these two commands (replace with your actual name and email):

```
git config --global user.name "David YourLastName"
git config --global user.email "your.email@example.com"
```

**Verify:**

```
git --version
```

Should show a version number.

### Step 6: Install VS Code

```
brew install --cask visual-studio-code
```

After installation, open VS Code from your Applications folder. Then:

1. Press **Cmd + Shift + P** (opens the Command Palette)
2. Type **shell command** and click **Shell Command: Install 'code' command in PATH**
3. Close and reopen Terminal

Now you can type `code .` in any project folder to open it in VS Code.

### Step 7: Apple Developer Account

You need a paid Apple Developer account ($99/year) to distribute via TestFlight. Think of it as your DEA number — you pay annually, it takes time to process, and you can't prescribe (deploy) without it.

1. Go to **developer.apple.com/programs/enroll** in Safari
2. Click **Start Your Enrollment**
3. Sign in with your Apple ID
4. Choose **Individual**
5. Fill in your information (must match your legal name)
6. Pay the $99 fee
7. Wait for approval (usually within 48 hours)

You'll get a confirmation email when your account is active. You don't need this until the very end (work order WO-21), so you can start building now and sign up later.

---

## Part 3: Install Claude Code

This is the big one. Claude Code is your primary tool — your Vocera, your Alaris pump, your SCDs all rolled into one. Once this is installed, you're ready to build.

### Install

In Terminal, run:

```
curl -fsSL https://claude.ai/install.sh | bash
```

Close Terminal and open a new window. Verify:

```
claude --version
```

If it shows a version number, Claude Code is installed.

### Authenticate

You need a **paid Claude plan** to use Claude Code. Think of it like staffing ratios — more budget gets you more capacity.

| Plan | Cost | Best For |
|------|------|----------|
| **Claude Pro** | $20/month | Getting started, moderate use. Like a 1:6 ratio — doable but you'll hit limits. |
| **Claude Max 5x** | $100/month | Heavy building sessions (**recommended for this project**). Comfortable 1:4 ratio. |
| **Claude Max 20x** | $200/month | All-day building. ICU-level 1:1 — unlimited attention. |

Sign up at **claude.ai** if you don't already have an account.

Then, in Terminal, simply type:

```
claude
```

Your browser will open. Sign in with your Claude account and authorize Claude Code. Once approved, your Terminal will show the Claude Code welcome screen.

Type `/help` to see available commands. Type `exit` or press **Ctrl + C** to leave Claude Code for now.

### Run Diagnostics

```
claude doctor
```

This checks that everything is set up correctly — like running a systems check on your patient monitor before the start of shift. If it reports any issues, it will tell you how to fix them.

---

## Part 4: Get the Project Files

Your brother has prepared a project folder called `chess-app` with all the planning documents. He'll send you this folder (via AirDrop, a zip file, Google Drive, or however works for you).

Once you have it, put it somewhere easy to find. A good location is your home folder or Desktop. For this guide, we'll assume it's at:

```
~/Developer/chess-app
```

To create this location and move the files there:

```
mkdir -p ~/Developer
```

Then move the chess-app folder into `~/Developer/` using Finder (drag and drop), or if you received a zip file:

```
unzip ~/Downloads/chess-app.zip -d ~/Developer/
```

**Navigate to the project folder:**

```
cd ~/Developer/chess-app
```

**Verify the files are there:**

```
ls
```

You should see files like `CLAUDE.md`, `BLUEPRINT.md`, `MANIFEST.md`, and a `workorders/` folder.

---

## Part 5: How Claude Code Works

### The Basics

Claude Code is an AI that lives in your Terminal. You talk to it in plain English. It reads your files, writes code, runs commands, and builds software. You know how you assess, plan, implement, and evaluate? Claude does the same thing — it reads the situation, makes a plan, executes, and checks its work.

**Starting a session:**

```
cd ~/Developer/chess-app
claude
```

Always `cd` into your project folder first. Claude Code reads the `CLAUDE.md` file in your project root automatically — it contains rules and conventions that Claude follows every session.

**The permission system:**

When Claude wants to do something (edit a file, run a command), it asks your permission — like a two-RN verification for high-risk meds. You're the second check.

```
Claude wants to edit src/App.tsx
Allow? (y/n)
```

- Type **y** and press Enter to approve
- Type **n** to reject
- You can also select "Yes, don't ask again for this type" to speed things up (like establishing a standing order)

**For beginners, start in Normal mode** (the default). This means Claude asks before every action — full med pass verification. Once you're comfortable, you can press **Shift + Tab** to switch to **Auto-accept Edits** mode, which lets Claude edit files freely but still asks before running commands. Think of it as allowing PRN orders without calling the provider each time.

### Key Commands Inside Claude Code

Your quick-reference brain sheet:

| What to Type | What It Does |
|-------------|-------------|
| `/help` | Shows all available commands. The policy & procedure manual. |
| `/clear` | Erases the conversation and starts fresh. **Use this between work orders.** End-of-shift handoff to yourself. |
| `/cost` | Shows how many tokens you've used (relates to your usage quota). Check your I&O. |
| `/compact` | Summarizes the conversation to free up space (use if Claude starts "forgetting" things). Like writing a concise SBAR when the chart is getting too long. |
| `Shift + Tab` | Cycles between permission modes (Normal → Auto-accept → Plan → Normal) |
| `Ctrl + C` | Cancels what Claude is currently doing, or exits Claude Code. The code blue button — stops everything. |
| `exit` | Leaves Claude Code. Clocking out. |

### How Conversations Work

Each time you start `claude`, it's a fresh conversation — a new admission. Claude reads your `CLAUDE.md` file (the standing orders) and that's it — it doesn't remember previous sessions. No carryover from the last shift.

**To continue a previous session** (if you closed Terminal by accident):

```
claude -c
```

This resumes the most recent conversation in the current folder. Like pulling up an active patient's chart — you're picking up where you left off.

---

## Part 6: Running Your First Work Order

Let's walk through running WO-01 (Project Scaffolding) step by step. This is the foundation everything else builds on — the primary assessment before any interventions.

### Step 1: Open Terminal and Navigate

```
cd ~/Developer/chess-app
```

### Step 2: Start Claude Code

```
claude
```

Wait for the welcome screen. You should see Claude loaded your `CLAUDE.md` file.

### Step 3: Give Claude the Work Order

Type a message like this (you can paste it). This is your verbal order to the resident:

```
I want you to complete work order WO-01: Project Scaffolding.

Read the work order file at workorders/build/WO-01-project-scaffolding.md

Also read BLUEPRINT.md for the technical specification.

Complete every task in the work order and check off every acceptance criterion before you're done.
```

Press Enter. Claude will start working. You just called the order in — now watch it get carried out.

### Step 4: Watch and Approve

Claude will:
1. Read the work order and blueprint files (reviewing the chart)
2. Start creating files and running commands (carrying out orders)
3. Ask for your permission each time (dual-verification)

**What you'll see:**

```
Claude wants to run: npm create vite@latest . -- --template react-ts
Allow? (y/n)
```

Type **y** and press Enter. This will happen many times — like scanning barcodes on a big med pass. If you want to speed things up, choose "Yes, don't ask again" for common operations.

### Step 5: Wait for Completion

Claude will work through all 12 tasks in WO-01. This may take 10-30 minutes depending on your internet speed and Claude's processing time. You don't need to watch every second — it's like waiting on labs. Check back periodically.

When it's done, Claude will tell you and show which acceptance criteria passed. Think of the acceptance criteria as vital sign ranges — all green means you're good to proceed.

### Step 6: Verify

Claude should have run the verification commands, but you can double-check:

```
npm run dev
```

This starts the app locally. Open your browser and go to **http://localhost:5173** — you should see the app running.

Press **Ctrl + C** in Terminal to stop the app.

### Step 7: Save Your Progress

Time to chart. Tell Claude:

```
Please update MANIFEST.md to mark WO-01 as Complete, with today's date in the session log.
```

Then save everything with Git (this is your end-of-shift documentation — never skip it):

```
Please create a git commit with all the changes from WO-01.
```

### Step 8: Clear and Move On

Type:

```
/clear
```

This resets the conversation. Clean handoff. You're ready for the next work order.

---

## Part 7: The Build Process

### The Order

Work orders have dependencies — some must be done before others, just like you can't hang a secondary drip without a primary line. Here's the recommended sequence, organized like a care plan:

**Phase 1 — Admission & Assessment (do first)**
1. **WO-01** Project Scaffolding ← START HERE
2. **TWO-01** Test Infrastructure Setup (do right after WO-01)

**Phase 2 — Primary Interventions (after Phase 1)**
These can be done in any order, but the suggested sequence is:
3. **WO-02** Interactive Chess Board
4. **WO-03** Opening Database & Data Layer
5. **WO-05** Puzzle Data & SRS Engine
6. **WO-07** Coach System — Core
7. **WO-16** Theme System

**Phase 3 — Ongoing Monitoring & Secondary Interventions (each depends on Phase 2 items)**
8. **WO-04** Opening Explorer UI (needs WO-02 + WO-03)
9. **WO-06** Puzzle Trainer UI (needs WO-02 + WO-05)
10. **WO-11** Stockfish Integration (needs WO-02)

**Phase 4 — Specialty Consults**
11. **WO-08** Coach Features (needs WO-07 + WO-11)
12. **WO-09** Dashboard & Session Generator
13. **WO-10** Flashcard System
14. **WO-12** Game Database & PGN Viewer
15. **WO-13** Lichess & Chess.com Import
16. **WO-14** Stats & Performance Dashboard

**Phase 5 — Patient Education & Comfort Measures**
17. **WO-15** Kid Mode
18. **WO-17** Gamification
19. **WO-18** API Key Onboarding & Settings
20. **WO-19** Cloud Sync (optional)

**Phase 6 — Discharge (Ship It)**
21. **WO-20** PWA & Offline
22. **WO-21** Capacitor Build & TestFlight
23. **WO-22** Polish & Performance

### One Work Order = One Session

**This is important.** Every work order gets its own fresh Claude Code session. Do not try to do two work orders in one conversation.

Why? Claude has a limited "memory" (called a context window). A single work order generates thousands of lines of code and conversation. If you stack two work orders, Claude starts forgetting the first one — it misapplies patterns, loses track of files, and makes mistakes.

Think of it like your OR rotation: you wouldn't try to do two different procedures at the same time on the same patient. Each one gets full focus, then you scrub out and start clean. Same principle. Same reason.

**The one exception:** WO-01 + TWO-01 can be done together since the test infrastructure is tightly coupled to the scaffolding.

**If a work order fails partway through** (Claude hits an error, you lose internet, etc.), don't start over. Instead, resume the same session:

```
claude -c
```

This picks up right where you left off.

### Session Template

For every work order, the process is the same — your nursing process, standardized. ADPIE for code:

```
cd ~/Developer/chess-app
claude
```

Then paste:

```
Complete work order [WO-XX]: [Title].

Read the work order: workorders/build/WO-XX-filename.md
Read the blueprint: BLUEPRINT.md

Complete all tasks. Verify all acceptance criteria pass.
When done, update MANIFEST.md and commit with git.
```

Then:

```
/clear
```

Repeat for the next work order.

### Tips for Smooth Sessions

Your shift survival tips:

1. **One work order per session.** Don't try to do multiple WOs in one conversation. Claude's context window is limited, and mixing work orders leads to confusion. You wouldn't double-book a patient into two procedures simultaneously.

2. **Always start with `/clear`.** Old conversations can confuse Claude on new tasks. Clean room between patients.

3. **If Claude seems stuck or confused:** Type `/compact` to summarize the conversation and free up context. If that doesn't help, type `/clear` and start the work order over. Sometimes you need to re-assess from baseline.

4. **If something breaks:** Tell Claude what happened. Paste error messages directly. Claude is good at debugging. Think SBAR: Situation (what happened), Background (what you were doing), Assessment (what the error says), Recommendation (ask Claude to fix it).

5. **Save often.** After each work order, make a git commit. If something goes wrong later, you can always go back. This is your CYA documentation. If it's not charted, it didn't happen. If it's not committed, it didn't happen.

6. **Check the app as you go.** After visual work orders (WO-02, WO-04, WO-06, etc.), run `npm run dev` and look at the app in your browser to make sure it looks right. Rounding on your patient — eyes on, not just numbers.

7. **Don't be afraid to give feedback.** If something doesn't look right or work right, just tell Claude in plain English: "The chess board is too small" or "The buttons don't have the right colors." You'd speak up if a wound vac wasn't set right. Same energy here.

---

## Part 8: Testing

Testing is your quality assurance — the double-check before the patient leaves the unit. Testing work orders (TWO-01 through TWO-15) verify that the code works correctly, like running post-procedure vitals to confirm everything's stable. Run them alongside or after their corresponding build work orders.

The session template is the same:

```
Complete test work order TWO-XX: [Title].

Read: workorders/test/TWO-XX-filename.md
Read: BLUEPRINT.md

Write all specified tests. Ensure all tests pass.
Update MANIFEST.md when done.
```

**Running tests yourself:**

```
npm run test:run
```

This runs all tests and shows results. Green = passing (WNL), red = failing (critical value — address immediately).

```
npm run test:coverage
```

This shows what percentage of the code is covered by tests. Think of it as your assessment completion rate — 80%+ coverage means you've checked most of the systems.

---

## Part 9: Deploying to iPhone

This is discharge day. This happens in WO-21. Here's the overview:

### Prerequisites
- Apple Developer Account is active ($99/year) — your license to practice
- Xcode is installed and up to date — the discharge paperwork system
- The person receiving the app has an iPhone with the TestFlight app installed — the patient is ready to go home

### The Process

Think of this as the discharge checklist:

1. Claude builds the app: `npm run build` (final labs and vitals)
2. Claude syncs to iOS: `npx cap sync ios` (reconcile meds)
3. Claude opens Xcode: `npx cap open ios` (discharge paperwork)
4. In Xcode: select your team (Apple Developer Account), click Build (attending co-sign)
5. Archive the app: Product > Archive (seal the chart)
6. Upload to App Store Connect (send to pharmacy... er, Apple)
7. In App Store Connect: add the recipient as an internal tester (discharge to home)
8. They get an email, open TestFlight, install the app (patient picks up meds)

Claude will guide you through all of this during WO-21. The work order has detailed steps.

### Updating the App Later

Like a readmission — faster the second time because you know the workflow. When you make changes:

```
npm run build
npx cap sync ios
```

Then open Xcode, archive, and upload again. The tester gets a notification in TestFlight.

---

## Part 10: Troubleshooting

The rapid response section. When things go sideways, start here.

### "command not found: claude"

First intervention: Close Terminal and open a new window (the "reboot the pump" maneuver). If still not working:

```
claude doctor
```

If that also fails, reinstall:

```
curl -fsSL https://claude.ai/install.sh | bash
```

### "command not found: node" or "command not found: npm"

Close Terminal and open a new window. Then:

```
nvm install --lts
```

### Claude runs out of context / starts forgetting

Sundowning, but for AI. Type `/compact` to summarize the conversation (reorient your patient). If that's not enough, `/clear` and restart the work order. Claude will re-read CLAUDE.md and you can point it to the work order again. Fresh brain, fresh start.

### "npm ERR!" during install

Usually a network issue — like when the tube system goes down. Try again:

```
npm install
```

If it persists, tell Claude: "I'm getting this npm error" and paste the error message.

### The app won't start (npm run dev fails)

Tell Claude: "npm run dev is failing with this error:" and paste whatever you see. Claude can usually fix build errors.

### Tests are failing

Critical values — address immediately. Tell Claude: "These tests are failing:" and paste the test output. Claude will read the failing tests and fix them. Think of it as calling the provider with abnormal labs — give them the data, they'll write the order.

### Xcode build fails

This is common. Tell Claude what happened. Common fixes:
- Clean build folder: Product > Clean Build Folder in Xcode
- Re-sync: `npx cap sync ios`
- Check signing: make sure your Apple Developer team is selected in Xcode

### Claude asks for permission and I'm not sure what to say

When in doubt, say **y** (yes). Claude is working within your project folder and following the rules in CLAUDE.md. It's like a nurse asking "Can I give this Tylenol?" — it's probably fine, it's in the orders. The only time to say no is if Claude tries to do something you explicitly don't want (like deleting files or pushing to a remote server). Trust but verify.

### I messed something up and want to start over

Don't panic. If you've been charting (committing with git), you can always go back. Think of git commits as restore points — like saving before you give the med you're not 100% sure about:

```
git log --oneline
```

This shows your save points. To go back to a specific one:

```
git checkout [commit-hash]
```

Ask Claude for help if you need to do this — just say "I want to go back to my last working state."

### My Claude subscription ran out of quota

The `/cost` command shows your usage. If you hit the limit — you're maxed out, like when the unit is at capacity. Options:
- Wait for the quota to reset (resets every 5 hours for Pro) — go eat, you're on break
- Upgrade to Max for higher limits — request more staffing
- Take a break and come back later — nobody ever died from an app being built tomorrow

---

## Glossary

Your terminology cheat sheet. Because every specialty has its own language.

| Term | Meaning |
|------|---------|
| **Terminal** | The text-based command interface on your Mac. Your nursing station. |
| **Command** | A text instruction you type in Terminal and run by pressing Enter. A verbal order. |
| **Directory / Folder** | Same thing. "Directory" is the technical term. Like "room" vs "patient care area." |
| **Path** | The address of a file, like `/Users/david/Developer/chess-app/CLAUDE.md`. The MRN of your file. |
| **cd** | "Change directory" — moves you to a different folder in Terminal. Walking to a different room. |
| **npm** | Node Package Manager — installs JavaScript libraries. The pharmacy that fills code prescriptions. |
| **npx** | Runs a command from an npm package without installing it globally. A one-time consult — come in, do the job, leave. |
| **Repository (repo)** | A project folder tracked by Git. The patient chart — everything in one place. |
| **Commit** | A saved snapshot of your project. A signed note in the chart. Timestamped and permanent. |
| **Build** | Converting your source code into a working app. Like compounding a medication from raw ingredients. |
| **Deploy** | Putting the built app somewhere people can use it (TestFlight, a website, etc.). Discharge to home. |
| **Dependencies** | Code libraries your project needs. Listed in `package.json`. Your patient's med list. |
| **node_modules** | The folder where dependencies are downloaded. It's huge. Never edit it. The med room — you take from it, you don't rearrange it. |
| **TypeScript** | A version of JavaScript with stricter rules. Catches mistakes earlier. Like having a barcode scanner on every med pass. |
| **React** | A JavaScript library for building user interfaces. |
| **Vite** | A fast build tool that turns your source code into a working web app. |
| **Capacitor** | A tool that wraps a web app inside a native iOS/Android app shell. Like a capsule around the active ingredient. |
| **Tailwind CSS** | A utility-based styling system. Instead of writing CSS files, you add class names. |
| **IndexedDB / Dexie** | A database that runs inside the browser. Stores your app data locally. The patient's bedside chart. |
| **Zustand** | A small state management library. Keeps track of app state (like "which theme is selected"). The whiteboard in the patient's room. |
| **Stockfish** | The world's strongest open-source chess engine. Runs in the browser via WASM. |
| **WASM (WebAssembly)** | A format that lets compiled code run in web browsers at near-native speed. |
| **SRS (Spaced Repetition System)** | An algorithm that schedules review at increasing intervals. Same system Anki uses. Evidence-based learning intervals — you'd approve. |
| **FEN** | A string that describes a chess position. Example: `rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1` |
| **PGN** | Portable Game Notation. A text format for recording chess games. |
| **UCI** | Universal Chess Interface. The protocol for communicating with chess engines like Stockfish. Think of it as the standardized communication protocol — SBAR for chess engines. |
| **API** | Application Programming Interface. How your app talks to external services (Claude AI, Lichess, etc.). |
| **API Key** | A password-like string that gives your app permission to use an API. Your badge number for digital services. |
| **PWA** | Progressive Web App. A website that can work offline and feel like a native app. |
| **TestFlight** | Apple's tool for distributing test versions of iOS apps before they go on the App Store. |
| **LLM** | Large Language Model. The type of AI that powers Claude. |
| **Work Order (WO)** | A self-contained unit of work. Each one builds a specific feature. A physician order — one procedure at a time. |
| **Test Work Order (TWO)** | Like a work order, but for writing and running tests. Post-procedure vitals. |
| **CLAUDE.md** | A file that gives Claude Code persistent instructions for your project. Standing orders — always in effect, every shift. |
| **BLUEPRINT.md** | The technical specification document. Contains data schemas, API details, algorithms. The H&P — everything about the patient in one document. |
| **MANIFEST.md** | The progress tracking document. Shows which work orders are done. Your patient's care plan — what's been done, what's next. |

---

## Quick Reference Card

Your brain sheet. Tape this to your monitor.

**Start of shift — clock in:**
```
cd ~/Developer/chess-app
claude
```

**Call in the order:**
```
Complete work order WO-XX: [Title].
Read: workorders/build/WO-XX-filename.md
Read: BLUEPRINT.md
Complete all tasks and acceptance criteria.
```

**Between work orders — clean handoff:**
```
/clear
```

**Round on your patient — eyes on:**
```
npm run dev
```
Then open **http://localhost:5173** in your browser.

**Post-procedure vitals:**
```
npm run test:run
```

**Chart your work (never skip this):**
```
git add -A && git commit -m "Complete WO-XX: Title"
```

**Pick up where you left off:**
```
claude -c
```

**Systems check:**
```
claude doctor
```

---

*You've got this, David. You manage 5-6 post-surgical patients at once — you can handle one chess app. One work order at a time. CMSRN energy.*
