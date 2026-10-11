import { Injectable } from '@nestjs/common';
import { PrismaService } from '@app/database/prisma.service';
import type { Role } from '@talentswap/types';

export interface UserRecord {
  id: string; email: string; role: Role; isEmailVerified: boolean; isBanned: boolean; createdAt: Date; updatedAt: Date;
}
export interface UserUpdateInput { email?: string | undefined; role?: Role | undefined; isEmailVerified?: boolean | undefined; isBanned?: boolean | undefined; }
export interface UsersRepository {
  findById(id: string): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  update(id: string, input: UserUpdateInput): Promise<UserRecord>;
  delete(id: string): Promise<void>; list(page:number,limit:number):Promise<UserRecord[]>; count():Promise<number>;
}

@Injectable()
export class PrismaUsersRepository implements UsersRepository {
  constructor(private readonly prisma: PrismaService) {}
  async findById(id: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, email: true, role: true, isEmailVerified: true, isBanned: true, createdAt: true, updatedAt: true } }) as Promise<UserRecord | null>;
  }
  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.prisma.user.findUnique({ where: { email }, select: { id: true, email: true, role: true, isEmailVerified: true, isBanned: true, createdAt: true, updatedAt: true } }) as Promise<UserRecord | null>;
  }
  async update(id: string, input: UserUpdateInput): Promise<UserRecord> {
    return this.prisma.user.update({
      where: { id },
      data: {
        ...(input.email ? { email: input.email } : {}),
        ...(input.role ? { role: input.role as any } : {}),
        ...(input.isEmailVerified !== undefined ? { isEmailVerified: input.isEmailVerified } : {}),
        ...(input.isBanned !== undefined ? { isBanned: input.isBanned } : {}),
      },
      select: { id: true, email: true, role: true, isEmailVerified: true, isBanned: true, createdAt: true, updatedAt: true },
    }) as Promise<UserRecord>;
  }
  async count(){return this.prisma.user.count();}
  async list(page:number,limit:number){return this.prisma.user.findMany({select:{id:true,email:true,role:true,isEmailVerified:true,isBanned:true,createdAt:true,updatedAt:true},orderBy:{createdAt:'desc'},skip:(page-1)*limit,take:limit}) as Promise<UserRecord[]>;}
  async delete(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { isBanned: true } });
  }
}
