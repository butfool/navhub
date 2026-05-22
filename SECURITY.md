# Security Policy

## Security Model

NavHub is designed for trusted self-hosted environments such as a private network, homelab, or an authenticated reverse proxy.

By default, NavHub does not include user accounts, sessions, authentication, or authorization. The dashboard and CRUD API should not be exposed directly to the public internet without an external access-control layer.

Recommended protections include:

- Reverse proxy authentication
- Basic Auth
- Cloudflare Access
- OAuth proxy
- VPN or private network access

## Sensitive Data

The SQLite database can contain private service names, URLs, and descriptions. Do not commit database files or deployment data directories.

Ignored local data includes:

- `dev.db`
- `*.db`
- `*.sqlite`
- `data/`
- `.env*`

## Reporting a Vulnerability

Please report security issues privately to the maintainer instead of opening a public issue with exploit details. Include:

- Affected version or commit
- Reproduction steps
- Impact
- Suggested fix, if known

## Supported Versions

This project is early-stage. Security fixes are expected to target the latest version on the default branch unless a tagged release policy is introduced later.
