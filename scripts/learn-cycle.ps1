<#
.SYNOPSIS
    One-shot factory LEARN-cycle runner, invoked by Windows Task Scheduler tonight at 05:00 (after
    the Claude usage window resets). Mirrors drain-queue.ps1's headless pattern.

.DESCRIPTION
    Runs Claude headless on a thorough /learn prompt that distills this session's production-quality
    work on "Cull the Crown" (a live audio engine, a front-of-house shell + run persistence,
    presentation/UX polish, and engineering gotchas) into knowledge/ + templates/ + docs/ so future
    games launch in a more finished state.

    Robust to a not-yet-reset limit: registered to tick every 30 min from 05:00; if a usage/rate
    limit is hit it exits quietly so the next tick retries. After one real run it drops a
    scripts/.learn-done marker (so /learn never runs twice) and disables its own task.

.NOTES
    Requires the `claude` CLI on PATH (or the packaged desktop build). PC must be on for it to fire.
    Watch:   Get-Content scripts\learn-cycle.log -Tail 40 -Wait
    Remove:  schtasks /Delete /TN "BoardGameFactory-LearnCycle" /F
#>

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot   # scripts/ -> repo root
$LogFile  = Join-Path $PSScriptRoot 'learn-cycle.log'
$Marker   = Join-Path $PSScriptRoot '.learn-done'
$TaskName = 'BoardGameFactory-LearnCycle'

function Write-Log([string]$msg) {
    Add-Content -Path $LogFile -Value ("{0}  {1}" -f (Get-Date -Format 's'), $msg) -Encoding utf8
}

Set-Location $RepoRoot

# --- 0. Already done? Then just stand down. (Marker guards against ever running /learn twice.) ----
if (Test-Path $Marker) {
    Write-Log "skip: .learn-done present - disabling task"
    try { schtasks /Change /TN $TaskName /DISABLE 2>$null | Out-Null } catch {}
    exit 0
}

# --- 1. Locate the CLI (same fallback as drain-queue.ps1) -----------------------------------------
$claudeExe = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claudeExe) {
    $packaged = Get-ChildItem "$env:LOCALAPPDATA\Packages\Claude_*\LocalCache\Roaming\Claude\claude-code\*\claude.exe" -ErrorAction SilentlyContinue |
        Sort-Object { try { [version]($_.Directory.Name) } catch { [version]'0.0' } } -Descending |
        Select-Object -First 1 -ExpandProperty FullName
    if ($packaged) { $claudeExe = $packaged }
}
if (-not $claudeExe) {
    Write-Log "error: 'claude' CLI not found on PATH or in the packaged desktop build"
    exit 1
}
Write-Log "using cli: $claudeExe"

# --- 2. The thorough learn prompt (self-contained; the headless agent has the repo + CLAUDE.md) ---
$prompt = @'
Invoke the factory Stage-5 LEARN cycle (.claude/commands/learn.md / the /learn skill) for the
project "cull-the-crown". This is the post-ship close-the-loop step, NOT a re-spec — respect the
factory gates and operate inline (no subagents). Keep projects/cull-the-crown/project-state.json and
registry/projects.json consistent if status changes.

OVER-ARCHING GOAL: make NEW games land in a far more finished, better-produced state on the FIRST
build, by baking this recent session's hard-won polish into the factory defaults. Read the current
cull-the-crown app/ code to ground every lesson in real files, then distill crawlable, reusable
guidance. Focus on these areas:

1. AUDIO (the biggest new capability). A self-contained Web Audio "chiptune" engine in
   app/src/audio/chiptune.ts: a synthesized 8-bit medieval music loop + a full SFX kit
   (click/leaf/select/hold/pile/draw/heal/block/damage/strike/kill/coin/buy/jester), per-channel
   music+SFX volume with persisted sliders, and a master mute that double-gates the buses AND the
   master. Capture the IP-clean "no external audio assets" approach. CRITICAL gotcha to record: keep
   the AudioEngine a single instance pinned to globalThis, or Vite HMR spawns multiple loops the UI
   can't control (mute/volume appear broken). Add a dedicated audio/sound PLAYBOOK and wire sound +
   a settings mixer into the spec/build-plan templates so future games ship with audio by default.

2. FRONT-OF-HOUSE / SHELL. A real main menu (Continue / New run / Past runs / Settings / Rules), a
   Pause screen (gear icon) that actually freezes the board, a Settings panel with audio sliders, a
   structured Rules menu, and run PERSISTENCE (autosave + continue + a past-runs history, all via a
   JSON-serializable RunState in localStorage). Files: app/src/ui/{App,PauseMenu,SettingsMenu,
   PastRunsOverlay,HelpOverlay}.tsx + store.ts. Distill these as the expected baseline shell for any
   run-based / roguelike MVP, in a new "front-of-house shell + persistence" playbook.

3. PRESENTATION / UX polish that should be first-try defaults: a gilded arcade-cabinet frame +
   corner HUD plaque + edge-mounted control racks; an action box that shows ONLY the hovered/selected
   card's suit power with a full plain-language description + a buff-folded resolution trace; per-suit
   visually-distinct enemy sprites; a deferred-outcome Claim gate with coin-to-purse; auto-block that
   computes minimal overkill; card lists always sorted by suit then value-descending; deck inspected
   via a button/modal (not an inline list); larger legible cards; readable tooltip/menu font sizes.
   Fold these into knowledge/playbooks/visual-first-try.md and knowledge/patterns/presentation-fx.md
   with concrete reuse pointers to the cull-the-crown files.

4. ENGINEERING GOTCHAS to record so they are never re-hit: (a) disable Pixi v8 texture/renderable GC
   for fixed-asset games (its periodic text-texture sweep throws returnTexture -> undefined.push) and
   guard Text re-rasterization; (b) deal a fresh FULL hand at the START of every fight, reshuffling
   the used pile if low, so the hand never depletes across fights; (c) on board remount, seen-mark
   the FX-event cursor so a stale "kill" event does not re-fire the win cascade on the next fight's
   first turn; (d) use capture-phase global listeners when modal panels stopPropagation on their
   content.

DELIVERABLES: write/append projects/cull-the-crown/retrospective.md; update
knowledge/playbooks/visual-first-try.md and knowledge/patterns/presentation-fx.md; ADD an
audio/sound playbook and a front-of-house-shell+persistence playbook under knowledge/playbooks/;
refresh knowledge/index.md; and propagate the new defaults into templates/03-mvp-spec.md,
templates/04-build-plan.md, and docs/03-* / docs/04-* so the next game's spec and build plan demand
sound + a settings mixer, a pause/menu shell, save/continue, and the presentation checklist out of
the gate. Be thorough and specific; prefer concrete file pointers over generic advice.
'@

# --- 3. Run it headless (empty stdin so the CLI doesn't stall waiting for piped input) ------------
Write-Log "learn start"
$output = '' | & $claudeExe -p $prompt 2>&1 | Out-String
$exit   = $LASTEXITCODE

# --- 4. Usage/rate limit? Then stand down quietly so the next 30-min tick retries -----------------
if ($output -match '(?i)usage limit|rate limit|limit reached|too many requests|resets? at|try again later') {
    Write-Log "rate/usage limit hit - will retry next tick"
    exit 0
}

# --- 5. A real run completed: mark done so it never repeats, then disable the task ----------------
New-Item -ItemType File -Path $Marker -Force | Out-Null
$summary = ($output -split "`n" | Where-Object { $_.Trim() } | Select-Object -Last 5) -join ' | '
Write-Log ("learn done (exit {0}): {1}" -f $exit, $summary)
try { schtasks /Change /TN $TaskName /DISABLE 2>$null | Out-Null } catch {}
exit 0
