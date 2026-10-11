# BE-06/07 — Wallet

`WalletService` is the sole application financial mutation boundary. It uses the shared serializable transaction + PostgreSQL advisory-lock helper. Ledger rows are immutable and balances are taken from the latest ledger snapshot.
