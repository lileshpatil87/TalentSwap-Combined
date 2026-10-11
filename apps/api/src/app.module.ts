import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WinstonModule } from 'nest-winston';
import { createWinstonConfig } from './logger/winston.config';
import { CacheModule } from './cache/cache.module';
import { ConfigModule } from './config/config.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseTransformInterceptor } from './common/interceptors/response-transform.interceptor';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { ZodValidationPipe } from './common/pipes/zod-validation.pipe';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { PrismaModule } from './database/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { SkillsModule } from './modules/skills/skills.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ChatModule } from './modules/chat/chat.module';
import { StorageModule } from './modules/storage/storage.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { LeaderboardsModule } from './modules/leaderboards/leaderboards.module';
import { AiEmbeddingsModule } from './modules/ai-embeddings/ai-embeddings.module';
import { MatchingModule } from './modules/matching/matching.module';
import { CallingModule } from './modules/calling/calling.module';
import { CommunityModule } from './modules/community/community.module';
import { SearchModule } from './modules/search/search.module';
import { AdminModule } from './modules/admin/admin.module';
import { RealtimeModule } from './realtime/realtime.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule,
    WinstonModule.forRoot(
      createWinstonConfig({
        level: process.env.LOG_LEVEL ?? 'info',
        nodeEnv: process.env.NODE_ENV ?? 'development',
      }),
    ),
    PrismaModule,
    CacheModule,
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.' }),
    AuthModule,
    UsersModule,
    ProfilesModule,
    SkillsModule,
    WalletModule,
    TransactionsModule,
    RealtimeModule,
    NotificationsModule,
    ChatModule,
    StorageModule,
    DocumentsModule,
    RatingsModule,
    GamificationModule,
    LeaderboardsModule,
    AiEmbeddingsModule,
    MatchingModule,
    CallingModule,
    CommunityModule,
    SearchModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },
    { provide: APP_PIPE, useClass: ZodValidationPipe },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void { consumer.apply(RequestIdMiddleware).forRoutes('*'); }
}
