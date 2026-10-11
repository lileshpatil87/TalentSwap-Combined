import { Global, Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';

import configuration from './configuration';
import { validateEnv } from './env.schema';

/**
 * Global configuration module — imported exactly once, in `AppModule`.
 * Every other module injects `ConfigService` rather than importing this
 * module directly (Architecture Foundation §8.2).
 */
@Global()
@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['apps/api/.env', '.env'],
      load: [configuration],
      validate: validateEnv,
    }),
  ],
})
export class ConfigModule {}
