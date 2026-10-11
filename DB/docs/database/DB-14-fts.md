# DB-14 — PostgreSQL Full-Text Search

The specification explicitly requires `skills.search_vector` as a generated `tsvector` indexed with GIN. The migration uses the `simple` PostgreSQL text-search configuration over `title || description`. This is a rebuildable projection and does not become a source of truth.

No Elasticsearch, MongoDB or backend search implementation is introduced.
