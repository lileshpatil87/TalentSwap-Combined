import { Inject, Injectable } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { Role } from '@talentswap/types';
import { PROFILES_REPOSITORY } from './profiles.constants';
import type { ProfilesRepository, ProfileRecord } from './profiles.repository';
import { ProfileNotFoundException, ProfileOwnershipException } from './profiles.exceptions';
import { UsersService } from '../users/users.service';

@Injectable()
export class ProfilesService {
 constructor(@Inject(PROFILES_REPOSITORY) private readonly repository:ProfilesRepository, private readonly users:UsersService){}
 async getByUserId(userId:string, publicOnly=false){const profile=await this.repository.findByUserId(userId); if(!profile) throw new ProfileNotFoundException(userId); return publicOnly?this.toPublic(profile):profile;}
 async getOrCreate(userId:string){const existing=await this.repository.findByUserId(userId); if(existing)return existing; const user=await this.users.getById(userId); return this.repository.create(userId,user.email.split('@')[0].slice(0,100));}
 async update(userId:string,actorId:string,actorRole:Role,input:Record<string,unknown>){if(actorId!==userId && actorRole!==Role.ADMIN) throw new ProfileOwnershipException(); await this.getOrCreate(userId); const clean={...input,bio:typeof input.bio==='string'?sanitizeHtml(input.bio,{allowedTags:[],allowedAttributes:{}}):undefined}; return this.repository.update(userId,clean as any);}
 async addExperience(userId:string,points:number,level:any){return this.repository.addExperience(userId,points,level);}
 async updateReputation(userId:string,score:number){return this.repository.updateReputation(userId,score);}
 async markVerified(userId:string,badge?:string){await this.getOrCreate(userId); return this.repository.markVerified(userId,badge);}
 async touch(userId:string){await this.repository.touch(userId);}
 private toPublic(p:ProfileRecord){return {id:p.id,userId:p.userId,displayName:p.displayName,bio:p.bio,avatarUrl:p.avatarUrl,location:p.location,reputationScore:p.reputationScore,totalExchanges:p.totalExchanges,isVerified:p.isVerified,verificationBadge:p.verificationBadge,experienceLevel:p.experienceLevel,experiencePoints:p.experiencePoints};}
}
