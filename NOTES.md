# best-stealth-game-20261121-1759 — "Make the best stealth game"

- Bounty URL: https://make.fun/bounty/best-stealth-game-20261121-1759
- Account: crisp-raven-17, wallet BZYpTECXsdYmyCQnKMN3iHiXwia2pA2611Tj5Lj6Kiwu
- Reward: $50 total, top 10 share: 1st $12, 2nd $8, 3rd $6, 4th $5, 5th $4, 6th–10th $3 each (house-funded, USDC on Solana)
- Deadline: 2026-11-22T05:59:00Z (12:59 WIB). Entry fee: none.
- Metric / judging: complete original stealth game in a desktop browser from static files, no network, keyboard+mouse; AI judge compares entries pairwise by screenshots + source outline. Criteria in order: (1) complete game shown in screenshots — level (top-down), guards with vision cones, cover to hide behind, exit to reach unseen; (2) fun/depth; (3) feel/polish; (4) look/originality; (5) source structure. No local grade for this competition — the server grades on submission.

## Entry (built, verified, NOT submitted — coordinator submits)

- Game: "The Quiet Gallery" — Wren, cat burglar, has one night in the Ashford Museum of Curiosities. 3 hand-designed levels (The Marble Hall, The East Wing, The Vault), top-down 1280x720. Guards patrol with raycast vision cones (A* pathfinding, patrol → suspicious → chase states), detection eye + per-guard awareness arcs, running is loud (noise draws guards), Shift to sneak, hold E to pocket 3 relics per level, click to throw a pebble (distraction), bushes hide you, lamp-light exposes you, shadow slows detection, exit opens when all relics are pocketed, Ghost bonus (+250) for clearing a level unseen, 3 nerves, score + time/par bonuses, WebAudio synth sounds (no audio files), title/pause/level-done/game-over/win screens, best score in localStorage. Fully static, no network requests, no external assets, original art/code only (no libraries).
- Repo: https://github.com/Nickhellyou123/best-stealth-game-20261121-1759
- Commit SHA: 1a79f9addd3c63bd59908c425d9ff540f7b01118
- Repo created: 2026-11-21T19:37:55Z (after competition opened 17:59:00Z), public, MIT LICENSE (verbatim, SPDX line), README, About set (homepage https://make.fun/bounty/best-stealth-game-20261121-1759, topics makefun, ai-agents, bounties, games). `.makefun/owner.json` committed ({"wallet": "BZYpTECXsdYmyCQnKMN3iHiXwia2pA2611Tj5Lj6Kiwu"}) — required because the make.fun account is not GitHub-linked. Kit subdir and out/ gitignored, NOT in the commit (23 files committed).
- Local repo dir: ~/workspace/makefun/best-stealth-game-20261121-1759/ (git root is the bounty dir).
- Screenshots (real renders of the game's own code in headless Chromium, staged via the game's own ?shot= scenes): 1-cover.jpg (Level 1, Wren sneaking behind a case, 1/3 relics, two cones), 2-alert.jpg (Level 2 chase, SPOTTED! banner, full red eye bar, red cone on Wren), 3-vault.jpg (Level 3, Wren in a bush, 2/3 relics, four guards), 4-win.jpg (win screen, "THE VAULT IS EMPTY", score 1450). All JPEG 1280×800, each < 256 KiB (35,856 / 42,260 / 40,105 / 45,409 bytes).
- Human opening prompt for the run record: prompt-stealth.txt (brief verbatim).

## Verification (builder)

- Play-test (Playwright, headless Chromium ~5 fps, real keyboard/mouse input; driver /tmp/shot-and-playtest.mjs). Mechanics all verified: boots to title, Space starts, WASD moves Wren, Shift sneaks slower than walking, click throws a pebble (3 → 2), P pauses/resumes, standing in a vision cone fills the eye to ALERT (peak awareness 1.00, twice), hiding in a bush lets the eye decay (0.15 in one run), hold-E pockets relics, getting caught loses a nerve and restarts the level, 3 catches = game over. No console errors, no network requests from the game in any run.
- Stealth bot (visibility-aware A*, sneaks, waits for cones, flees to bushes) completed Level 1 in 3 of 5 runs: scores 1073, 1070, 993 (all 3 relics, level-done). The other 2 runs ended game-over in Level 1 — the bot is a crude heuristic, not a human; the game is demonstrably completable.
- Known test flakiness, not game defects: the hide check failed once at 0.53 (decaying, threshold 0.5) and once at 1.00 because the chasing guard closed to <48px of the bush — by design a guard that close sees through the bush.
- main.ts run twice (MAKEFUN_OUTPUT_DIR=out1/out2): byte-identical outputs. Dossier 288,622 bytes (< 1.5 MiB), 10 source files, 66,997 bytes.
- Gate self-check: game/ 10 files + 2 dirs, 66,997 bytes (≤993 / 48 MiB); index.html 844 bytes (≤1 MiB); 4 screenshots within size/dimension limits; no external references in game/ (no http strings at all).
- Kit pre-submit check (`node cli/makefun.mjs check --kit . --repo .`, no transcripts): 4 passed (competition_open, snapshot 23 files / 297,913 bytes, license_osi MIT, entrypoint node22), 1 failed (transcripts_present — expected: the coordinator bundles the sessions and submits), 15 skipped, 5 checked at submission (repo_public, repo_owner via owner.json, repo_created_after_open, commit_in_repo, duplicate_snapshot — all satisfied by the pushed repo/commit above).

## Submission — NOT SUBMITTED (coordinator submits)

- No submission id, no claim code yet. The coordinator must bundle transcripts (this builder session 86ddbb54-5c36-44ae-89b4-10350c1eaaad + the parent/coordinator session) with `node cli/makefun.mjs bundle` from inside the kit, then submit before 2026-11-22T05:59:00Z. Bundle/check commands need the parent session — the builder session alone is not enough.
- Quota/deadline were not re-checked by the builder at build time; the coordinator checks quota before submitting.
