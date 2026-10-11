export const TRANSACTIONS_REPOSITORY = Symbol('TRANSACTIONS_REPOSITORY');
export const TRANSACTION_EVENTS = { ESCROW_FUNDED:'transaction.escrow_funded', COMPLETED:'transaction.completed', DISPUTED:'transaction.disputed', CONFIRMED:'transaction.confirmed' } as const;
