# A10 — Sandbox Engine

The Sandbox Engine is the isolated execution boundary for code tests and other untrusted execution requested by the Code Agent.

## Primary implementation

A10 starts with Docker containers rather than executing test commands directly on the Open Claude host process.

```text
Agent
  ↓
Code Agent
  ↓
Permission Engine
  ↓
Sandbox Engine
  ↓
Docker container
  ↓
Tests / lint / typecheck / build
```

## Isolation defaults

- Docker container per run
- `--network none` by default
- read-only container filesystem
- only an ephemeral workspace is mounted read/write
- Linux capabilities dropped
- `no-new-privileges`
- PID limit
- memory limit
- CPU limit
- execution timeout
- bounded stdout/stderr
- abort/cancellation support
- temporary workspace deleted after execution
- no Docker socket mounted
- no host credentials or `.env` mounted

## Workspace

The caller supplies explicit files. The runner validates paths and rejects absolute paths, traversal, and `.git` paths. The host workspace is temporary and is removed after the run.

## Network

Network access is disabled unless a future permission-controlled execution path explicitly authorizes it. A test cannot obtain GitHub, Supabase, model-provider, or arbitrary internet access by default.

## Trusted images

Production deployments should use a small, pinned, internally approved test image rather than allowing arbitrary user-controlled images. The image should contain only the language/runtime/tooling needed by the relevant test profile.

## Resource limits

Defaults are intentionally conservative:

- 120 seconds
- 512 MiB RAM
- 1 CPU
- 128 processes
- 64,000 characters per output stream

These are execution safeguards, not guarantees of perfect containment. Production deployment should add container-runtime hardening, image provenance/scanning, host-level isolation, monitoring, and preferably dedicated sandbox workers.

## A10 boundary

A10 executes commands only inside the container. It does not grant GitHub, network, shell, account, or filesystem permissions. Permission decisions remain authoritative outside the sandbox.

## Future hardening

- trusted image registry and image digest pinning
- rootless Docker/container runtime
- seccomp/AppArmor/SELinux profiles
- dedicated worker nodes
- per-project dependency caches
- test profiles for Node/Python/etc.
- sandbox execution audit events
- resource usage telemetry
- optional disposable VM backend for higher-risk workloads
