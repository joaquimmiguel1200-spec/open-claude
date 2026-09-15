# Open Claude Skills

Skills follow the Agent Skills convention: each skill is a directory containing a `SKILL.md` with YAML frontmatter (`name`, `description`) followed by instructions.

Skills are loaded dynamically and are not all injected into every prompt. This keeps context small and follows progressive-disclosure principles.

Imported third-party skills must be reviewed for license compatibility before being copied into this directory.
