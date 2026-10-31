# Team workflow

Suggested branches are `mohan/foundation`, `vijay/backend`, `basim/frontend`, and `najid/frontend`. Each contributor makes their own meaningful commits and pull requests; `main` is the integration/deployment branch.

Mohan owns Prisma schema and migrations. Contributors coordinate any schema change with Mohan, never apply destructive commands, and remember that shared VPS changes are visible to everyone. Frontend contributors coordinate shared layout/components before editing them. The production proxy should serve HTTPS and route `/api` to Express; database traffic should use least-privilege credentials and VPS TLS or an SSH tunnel as Mohan configures it.
