# Open Claude — Skills Engine

## A4 — Skills Engine REAL

The Skills Engine implements dynamic, progressive skill discovery and activation without allowing skill content to override higher-priority instructions or permissions.

### Pipeline

1. Discover `SKILL.md` files from configured server-side roots.
2. Parse lightweight frontmatter (`name`, `description`, optional `version` and `tags`).
3. Validate the skill and reject obvious secrets/credentials.
4. Register valid skills in an in-memory registry.
5. Match skills against the current task/query.
6. Activate only the highest-scoring relevant skills.
7. Inject selected instructions into reference/task context with an explicit trust boundary.

### Trust model

Skills are data/configuration, not system instructions. They cannot grant permissions, bypass authentication, override system/developer rules, or execute tools by themselves. Tool execution remains the responsibility of the future Permission and Tool Engines.

### Progressive disclosure

Only metadata is required for discovery. Full `SKILL.md` instructions are loaded when a skill is discovered and are injected only for selected skills. This keeps unrelated skills out of the model context.

### Sources

The loader supports `builtin`, `project`, `user`, and `imported` source labels. The application decides which roots are trusted and exposes them to the engine.

### Future integration

A5 Agent Engine will use the Skills Engine to select task-specific skills before planning. A6 Tool Engine and A7 Permission Engine remain authoritative for tool execution and permissions.
