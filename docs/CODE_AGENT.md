# Code Agent

The Code Agent is the controlled code-editing layer built on the GitHub Agent and Tool/Permission architecture.

## Flow

```text
Agent → Code Agent → GitHub Agent → GitHub API
                    ↓
              Permission Engine
```

## Capabilities

- create new files
- update existing files
- require the current blob SHA for updates
- refuse stale updates
- refuse accidental overwrites of new files
- validate repository, branch, paths, file count and file size
- return structured changes and failures

## Safety

- repository must use `owner/repository`
- paths cannot traverse with `..`
- `.git/` paths are rejected
- duplicate paths are rejected
- updates require `expectedSha`
- existing files cannot be overwritten through a create operation
- GitHub credentials remain inside the server-side GitHub client
- code execution is intentionally not part of this stage

## Boundary

A9 edits code through the GitHub Agent. It does not execute arbitrary shell commands, install packages, run untrusted code, merge pull requests, force-push, delete branches, or bypass the Permission Engine. Those capabilities belong to later stages and must remain explicitly permissioned.

## Validation

The runtime validates the requested edit set before changing the repository. Runtime build/typecheck execution depends on the application's execution environment and is not performed by the GitHub connector itself.
