<#
.SYNOPSIS
    One-shot headless continuation of the tcg-circuit world build. Fired by Windows Task Scheduler at
    ~2am (the usage-limit reset) so the build keeps going unattended. Mirrors drain-queue.ps1's CLI
    discovery + rate-limit handling, but runs a self-contained BUILD prompt (tcg-continue.prompt.md)
    with --dangerously-skip-permissions so it can write files / run npm / git unattended.

.NOTES
    Requires the `claude` CLI. PC must be on (and ideally logged in) for the schedule to fire.
    Unattended + permission-skipping by design — the operator authorized this for THIS build only.
#>

$ErrorActionPreference = 'Stop'

$RepoRoot   = Split-Path -Parent $PSScriptRoot
$PromptFile = Join-Path $PSScriptRoot 'tcg-continue.prompt.md'
$LogFile    = Join-Path $PSScriptRoot 'continue-tcg-build.log'

function Write-Log([string]$msg) {
    $line = "{0}  {1}" -f (Get-Date -Format 's'), $msg
    Add-Content -Path $LogFile -Value $line -Encoding utf8
}

Set-Location $RepoRoot

# Locate the CLI (PATH, else the packaged desktop build — highest version).
$claudeExe = (Get-Command claude -ErrorAction SilentlyContinue).Source
if (-not $claudeExe) {
    $packaged = Get-ChildItem "$env:LOCALAPPDATA\Packages\Claude_*\LocalCache\Roaming\Claude\claude-code\*\claude.exe" -ErrorAction SilentlyContinue |
        Sort-Object { try { [version]($_.Directory.Name) } catch { [version]'0.0' } } -Descending |
        Select-Object -First 1 -ExpandProperty FullName
    if ($packaged) { $claudeExe = $packaged }
}
if (-not $claudeExe) { Write-Log "error: 'claude' CLI not found"; exit 1 }
if (-not (Test-Path $PromptFile)) { Write-Log "error: prompt file missing: $PromptFile"; exit 1 }

$prompt = Get-Content -Path $PromptFile -Raw -Encoding utf8

# Make Node visible to the headless session (it's installed but not on PATH on this PC).
if (Test-Path 'C:\Program Files\nodejs') { $env:Path = 'C:\Program Files\nodejs;' + $env:Path }

Write-Log "using cli: $claudeExe"
Write-Log "continue-tcg-build start"

# A few attempts in case 2am is still inside a usage window; long-running agentic session per attempt.
for ($i = 1; $i -le 3; $i++) {
    $output = '' | & $claudeExe -p $prompt --dangerously-skip-permissions 2>&1 | Out-String
    if ($output -match '(?i)usage limit|rate limit|limit reached|too many requests|resets? at|try again later') {
        Write-Log "attempt $i: rate/usage limit hit - sleeping 30m then retrying"
        Start-Sleep -Seconds 1800
        continue
    }
    $summary = ($output -split "`n" | Where-Object { $_.Trim() } | Select-Object -Last 4) -join ' | '
    Write-Log ("attempt {0}: done - {1}" -f $i, $summary)
    break
}

Write-Log "continue-tcg-build finished"
exit 0
