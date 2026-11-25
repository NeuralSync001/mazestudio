---
name: gh-cli
description: Prefer authenticated GitHub CLI workflows for GitHub repositories, files, pull requests, issues, releases, and API access.
---

# GitHub CLI workflows

Use this skill when working with GitHub repositories, pull requests, issues,
releases, GitHub URLs, or authenticated GitHub API access.

## Prefer `gh` for GitHub

Use the authenticated GitHub CLI instead of unauthenticated `curl`, `wget`, or
web-fetch tools for GitHub content whenever the CLI supports the operation.
This is especially useful for private repositories, API rate limits, and
complete API responses.

Examples:

```powershell
gh repo view owner/repo
gh pr view 123 --repo owner/repo
gh pr list --repo owner/repo
gh issue view 123 --repo owner/repo
gh api repos/owner/repo/pulls
```

For repository files, prefer cloning the repository and reading it locally with
workspace tools rather than fetching `raw.githubusercontent.com` files or using
the GitHub `/contents/` API:

```powershell
gh repo clone owner/repo C:\path\to\task-clone
```

Choose a specific task-scoped clone directory and only remove that directory
when finished. Do not use broad or unresolved deletion paths.

## Map GitHub URLs to CLI commands

- Repository page: `gh repo view owner/repo`
- Pull request: `gh pr view NUMBER --repo owner/repo`
- Issue: `gh issue view NUMBER --repo owner/repo`
- Pull request list: `gh pr list --repo owner/repo`
- Issue list: `gh issue list --repo owner/repo`
- Release list: `gh release list --repo owner/repo`
- Release asset: `gh release download TAG --repo owner/repo`
- Other API endpoints: `gh api ENDPOINT`
- Blob, tree, or raw file URL: clone the repository, then inspect the file
  locally.
- Gist: `gh gist view ID`

Use ordinary `git` commands for local repository operations such as status,
diff, commit, fetch, and push.

## Authentication

Check authentication with:

```powershell
gh auth status
```

If authentication is missing, tell the user to run `gh auth login` and complete
the interactive browser/device flow in their terminal. Never request, print,
store, or commit their access token.

If `gh` is unavailable or unauthenticated, report that clearly. Do not silently
fall back to unauthenticated GitHub fetches for private or rate-limited data.

## Scope and confirmation

Use read-only commands for inspection. Before making remote changes such as
creating or merging a pull request, editing an issue, changing repository
settings, or pushing commits, confirm the user requested that specific action.

## Installation note

This workspace skill provides guidance to the assistant; it does not install
the upstream Claude Code hooks that automatically intercept fetch tools and
shim `gh`. Those hooks are not part of this Copilot-compatible import.

## Attribution

Adapted from Trail of Bits' `gh-cli` plugin:
https://github.com/trailofbits/skills/tree/main/plugins/gh-cli

Source is licensed under Creative Commons Attribution-ShareAlike 4.0
International (CC BY-SA 4.0):
https://creativecommons.org/licenses/by-sa/4.0/

Changes: adapted the skill for this VS Code Copilot workspace, including
PowerShell examples and clarifying that upstream Claude Code hooks are not
installed here.
