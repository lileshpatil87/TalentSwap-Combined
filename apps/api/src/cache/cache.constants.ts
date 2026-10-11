/** DI token for the single shared ioredis client instance. */
export const REDIS_CLIENT = Symbol('REDIS_CLIENT');

/** DI token for the shared BullMQ Redis connection options. */
export const BULLMQ_CONNECTION = Symbol('BULLMQ_CONNECTION');
