# Pushing to GitHub — one-time setup (action needed from you)

The factory is now a git repo and everything is committed locally. It is **not yet on
GitHub**, because this machine has no way for me to publish it unattended:

- the **GitHub CLI (`gh`) is not installed**;
- there is **no git remote** configured;
- there are **no stored git credentials / token**, and `gh auth login` needs an interactive
  browser/device sign-in I can't complete while you're away.

So I did everything that doesn't require your GitHub account, and left the publish step for
you. It's a few minutes, once.

## Do this when you're back

Pick one path. Both end with `main` and the `lacuna/alpha-0.1` branch on GitHub.

### Option A — GitHub CLI (recommended)

```powershell
winget install --id GitHub.cli -e      # install gh
gh auth login                          # sign in (browser/device flow)
cd C:\Users\phili\Documents\BoardGameMVPs
gh repo create BoardGameMVPs --private --source . --remote origin --push   # pushes main
git push -u origin lacuna/alpha-0.1    # push the polish branch too
```

### Option B — plain git + an empty GitHub repo

1. On github.com, create a new **empty** private repo named `BoardGameMVPs`
   (no README/.gitignore/license — the repo already has them).
2. Then:

```powershell
cd C:\Users\phili\Documents\BoardGameMVPs
git remote add origin https://github.com/<your-username>/BoardGameMVPs.git
git push -u origin main
git push -u origin lacuna/alpha-0.1
```

You'll be prompted for credentials — use a **Personal Access Token** (Settings → Developer
settings → Tokens) as the password, or install Git Credential Manager.

## After the remote exists

- `git push` from any branch/worktree publishes it.
- The `lacuna/alpha-0.1` branch is where the ship-polish work lives; open a PR from it when
  you want to review/merge to `main`.
- Once pushed, this file's job is done — you can delete it.

See `docs/git-and-branching.md` for the full branching + worktree workflow.
