import { Injectable } from '@nestjs/common';
import type { UserRole as PrismaUserRole } from '@prisma/client';
import { Prisma } from '@prisma/client';

import { Role } from '@talentswap/types';

import { PrismaService } from '@app/database/prisma.service';
import { TransactionHelper } from '@app/database/transaction.helper';

import { EmailAlreadyRegisteredException } from './auth.exceptions';

/**
 * Repository-layer shapes, deliberately decoupled from `@prisma/client`'s
 * generated types (Backend Constitution §21 Dependency Inversion —
 * "services depend on repository interfaces... never a direct class
 * reference that would prevent test-double substitution"). `AuthService`
 * and its unit tests only ever see these plain shapes.
 */
export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string | null;
  role: Role;
  isEmailVerified: boolean;
  isBanned: boolean;
  createdAt: Date;
}

export interface CreateUserInput {
  email: string;
  passwordHash: string;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  replacedByTokenId: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

/**
 * Narrow, module-specific repository interface (Backend Constitution §10
 * Interface Segregation — "exposes only what `AuthService` needs, nothing
 * more"). Bound to `PrismaAuthRepository` via the `AUTH_REPOSITORY` token
 * in `auth.module.ts`.
 */
export interface AuthRepository {
  findUserByEmail(email: string): Promise<AuthUserRecord | null>;
  findUserById(id: string): Promise<AuthUserRecord | null>;
  createUser(input: CreateUserInput): Promise<AuthUserRecord>;

  /**
   * Looks up a refresh token by its hash REGARDLESS of revoked/expired
   * state — reuse-detection (Spec §8.2) depends on being able to find an
   * already-revoked token, not just active ones. The caller decides what
   * "invalid" means for its purposes.
   */
  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;
  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;

  /**
   * Atomically revokes `oldTokenId` and creates its replacement in one
   * transaction (Backend Constitution §51) — a rotation must never
   * partially apply: either the old token is revoked AND the new one
   * exists, or neither change happens, so a mid-rotation failure can
   * never leave a user with zero valid tokens.
   */
  rotateRefreshToken(
    oldTokenId: string,
    newToken: CreateRefreshTokenInput,
  ): Promise<RefreshTokenRecord>;

  revokeRefreshToken(id: string): Promise<void>;

  /** Bulk-revokes every non-revoked token in a family (theft/replay response). */
  revokeRefreshTokenFamily(familyId: string): Promise<void>;
}

function toAuthUserRecord(user: {
  id: string;
  email: string;
  passwordHash: string | null;
  role: PrismaUserRole;
  isEmailVerified: boolean;
  isBanned: boolean;
  createdAt: Date;
}): AuthUserRecord {
  return {
    id: user.id,
    email: user.email,
    passwordHash: user.passwordHash,
    // Safe without a runtime check: `PrismaUserRole`'s generated type is
    // exactly the string-literal union `'USER' | 'VERIFIED_USER' | ...`
    // that `Role`'s own members resolve to (Backend Constitution §19 —
    // see the schema's `// === auth module ===` doc comment for why no
    // `@map` is used). If this ever stops type-checking, the two enums
    // have drifted and CI will catch it here, not silently at runtime.
    role: Role[user.role],
    isEmailVerified: user.isEmailVerified,
    isBanned: user.isBanned,
    createdAt: user.createdAt,
  };
}

function toRefreshTokenRecord(token: {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  replacedByTokenId: string | null;
  expiresAt: Date;
  createdAt: Date;
}): RefreshTokenRecord {
  return { ...token };
}

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionHelper: TransactionHelper,
  ) {}

  async findUserByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return user ? toAuthUserRecord(user) : null;
  }

  async findUserById(id: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    return user ? toAuthUserRecord(user) : null;
  }

  async createUser(input: CreateUserInput): Promise<AuthUserRecord> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          passwordHash: input.passwordHash,
        },
      });
      return toAuthUserRecord(user);
    } catch (error) {
      // A concurrent registration for the same email can slip past the
      // service layer's pre-check and still hit the unique constraint —
      // map it to the same domain exception the pre-check would have
      // thrown, rather than the generic mapPrismaError() conflict, so the
      // client always sees the same stable EMAIL_ALREADY_REGISTERED code
      // regardless of which path caught the collision.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new EmailAlreadyRegisteredException();
      }
      throw error;
    }
  }

  async findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    const token = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    return token ? toRefreshTokenRecord(token) : null;
  }

  async createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord> {
    const token = await this.prisma.refreshToken.create({ data: input });
    return toRefreshTokenRecord(token);
  }

  async rotateRefreshToken(
    oldTokenId: string,
    newToken: CreateRefreshTokenInput,
  ): Promise<RefreshTokenRecord> {
    return this.transactionHelper.withTransaction(async (tx) => {
      const created = await tx.refreshToken.create({ data: newToken });

      await tx.refreshToken.update({
        where: { id: oldTokenId },
        data: { isRevoked: true, replacedByTokenId: created.id },
      });

      return toRefreshTokenRecord(created);
    });
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id },
      data: { isRevoked: true },
    });
  }

  async revokeRefreshTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { familyId, isRevoked: false },
      data: { isRevoked: true },
    });
  }
}
