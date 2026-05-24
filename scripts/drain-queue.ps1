<#
.SYNOPSIS
    Headless factory queue drainer. Invoked on a schedule (Windows Task Scheduler) so the
    factory keeps advancing while you're away and resumes after a usage-limit window resets.

.DESCRIPTION
    Each run is independent and safe to repeat:
      1. Skips if another drainer / interactive operator holds a fresh lock.
      2. Runs Claude headless on the `/queue drain` command (auto-approves the safe early
         stages, hard-stops before build and ship).
      3. If a usage/rate limit is hit, exits quietly -the next scheduled tick retries, so the
         queue naturally resumes once the limit window lapses.

    Register to run every ~30 min (see scripts/register-drain-task.txt for the schtasks command).
    Logs to scripts/drain-queue.log.

.NOTES
    Requires the `claude` CLI on PATH. PC must be powered on for the schedule to fire.
#>

$ErrorActionPreference = 'Stop'

# --- Paths -------------------------------------------------------------------
$RepoRoot = Split-Path -Parent $PSScriptRoot   # scripts/ -> repo root
$LockFile = Join-Path $RepoRoot 'registry\queue.lock'
$LogFile  = Join-Path $PSScriptRoot 'drain-queue.log'

function Write-Log([string]$msg) {
    $line = "{0}  {1}" -f (Get-Date -Format 's'), $msg
    Add-Content -Path $LogFile -Value $line -Encoding utf8
}

Set-Location $RepoRoot

# --- 1. Pre-check the lock (cheap; the /queue drain command is authoritative) -
if (Test-Path $LockFile) {
    $age = (Get-Date) - (Get-Item $LockFile).LastWriteTime
    if ($age.TotalMinutes -lt 30) {
        Write-Log "skip: lock held ($([int]$age.TotalMinutes)m old)"
        exit 0
    }
    Write-Log "stale lock ($([int]$age.TotalMinutes)m) -proceeding; /queue drain will reclaim it"
}

# --- 2. Locate the CLI -------------------------------------------------------
# Prefer PATH; otherwise fall back to the packaged desktop build (version-stamped
# folder, so pick the highest version). Keeps working across Claude updates.
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

# --- 3. Run the drain headless ----------------------------------------------
# Slash command in print mode. If this build can't run a bare slash command via -p,
# swap the prompt for the natural-language fallback on the next line.
$prompt   = '/queue drain'
$fallback = 'Drain the factory work queue exactly as specified in .claude/commands/queue.md (the /queue drain engine).'

Write-Log "drain start"
# Pipe empty stdin so the CLI doesn't stall 3s waiting for piped input.
$output = '' | & $claudeExe -p $prompt 2>&1 | Out-String
$exit   = $LASTEXITCODE

# Retry once with the natural-language fallback if the slash form produced nothing useful.
if ([string]::IsNullOrWhiteSpace($output) -or $output -match 'unknown command|no such command') {
    Write-Log "slash form unrecognized - retrying with natural-language fallback"
    $output = '' | & $claudeExe -p $fallback 2>&1 | Out-String
    $exit   = $LASTEXITCODE
}

# --- 4. Detect a usage/rate limit so we just retry next tick -----------------
if ($output -match '(?i)usage limit|rate limit|limit reached|too many requests|resets? at|try again later') {
    Write-Log "rate/usage limit hit - will retry next tick"
    exit 0
}

# --- 5. Record outcome -------------------------------------------------------
$summary = ($output -split "`n" | Where-Object { $_.Trim() } | Select-Object -Last 3) -join ' | '
Write-Log ("drain done (exit {0}): {1}" -f $exit, $summary)
exit 0
