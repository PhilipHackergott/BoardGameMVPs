<#
.SYNOPSIS
    Create a project working branch and its own git worktree, so another Claude Code
    console can work that branch in parallel without clobbering the main checkout.

.DESCRIPTION
    The factory is one git repo (see docs/git-and-branching.md). A worktree is a second
    working directory backed by the same .git, checked out to a different branch. This
    script:
      1. Creates branch  <slug>/<topic>  off <base> (default: main), if it doesn't exist.
      2. Adds a worktree at a sibling folder  ..\BoardGameMVPs-<slug>-<topic>.
      3. Prints the path to open in a new console.

    Branch naming follows the convention: always namespace with the project slug.

.PARAMETER Slug
    The project slug, e.g. "lacuna". Must match a folder under projects/.

.PARAMETER Topic
    The branch topic, e.g. "online-mp" or "alpha-0.1".

.PARAMETER Base
    The branch to fork from. Default: main.

.EXAMPLE
    scripts\new-worktree.ps1 lacuna online-mp
    scripts\new-worktree.ps1 lacuna alpha-0.1 main

.NOTES
    Remember: run `npm install` in the new worktree's app/ before building
    (node_modules is per-checkout and git-ignored). Remove a finished worktree with
    `git worktree remove <path>`.
#>
param(
    [Parameter(Mandatory = $true)][string]$Slug,
    [Parameter(Mandatory = $true)][string]$Topic,
    [string]$Base = 'main'
)

$ErrorActionPreference = 'Stop'

$RepoRoot = Split-Path -Parent $PSScriptRoot   # scripts/ -> repo root
$Branch   = "$Slug/$Topic"
$WtName   = "BoardGameMVPs-$Slug-$Topic"
$WtPath   = Join-Path (Split-Path -Parent $RepoRoot) $WtName

Push-Location $RepoRoot
try {
    if (-not (Test-Path (Join-Path $RepoRoot "projects\$Slug"))) {
        Write-Warning "No projects\$Slug folder found - check the slug. Continuing anyway."
    }

    # Does the branch already exist?
    git show-ref --verify --quiet "refs/heads/$Branch"
    $branchExists = $?

    if (Test-Path $WtPath) {
        throw "Worktree path already exists: $WtPath"
    }

    if ($branchExists) {
        Write-Host "Branch '$Branch' exists - attaching a worktree to it." -ForegroundColor Cyan
        git worktree add "$WtPath" "$Branch"
    } else {
        Write-Host "Creating branch '$Branch' off '$Base' + worktree." -ForegroundColor Cyan
        git worktree add "$WtPath" -b "$Branch" "$Base"
    }

    Write-Host ""
    Write-Host "Worktree ready:" -ForegroundColor Green
    Write-Host "  branch : $Branch"
    Write-Host "  path   : $WtPath"
    Write-Host ""
    Write-Host "Open a new Claude Code console there, then in its app/ run:  npm install"
    Write-Host "List all worktrees:  git worktree list"
}
finally {
    Pop-Location
}
