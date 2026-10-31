# API conventions

Successful resources use `{ "data": ... }`; lists also include `pagination`. Errors use `{ "error": { "code", "message", "details" } }`. Lists default to page 1 and 20 entries, with a maximum of 100. Routes whitelist sorting and validate filters.

The API enforces authorization server-side. Dates are ISO-8601 and date filters must state their meaning. Timestamps are UTC. INR money is sent as two-decimal strings, never JavaScript floating point. The current public routes require no authorization.
