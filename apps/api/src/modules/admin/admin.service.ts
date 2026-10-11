import { Injectable } from '@nestjs/common'; import { AdminRepository } from './admin.repository'; import { Role } from '@talentswap/types'; import { UsersService } from '../users/users.service'; import { DocumentsService } from '../documents/documents.service'; import { TransactionsService } from '../transactions/transactions.service';
@Injectable() export class AdminService {constructor(private readonly repo:AdminRepository,private readonly users:UsersService,private readonly docs:DocumentsService,private readonly tx:TransactionsService){}
 async usersList(page=1,limit=20){return this.users.listForAdmin(page,limit);}
 async ban(adminId:string,userId:string,ban=true){const updated=await this.users.update(userId,adminId,Role.ADMIN,{isBanned:ban});await this.log(adminId,ban?'BAN_USER':'UNBAN_USER','USER',userId,{});return updated;}
 async documents(){return this.docs.list('',true);} async reviewDocument(adminId:string,id:string,status:'APPROVED'|'REJECTED',reason?:string){const r=await this.docs.review(id,adminId,status,reason);await this.log(adminId,'REVIEW_DOCUMENT','DOCUMENT',id,{status});return r;}
 async flaggedTransactions(){return this.tx.flaggedForAdmin();} async dashboard(){const [users,stats]=await Promise.all([this.users.count(),this.tx.statsForAdmin()]);return {users,transactions:stats.total,completed:stats.completed,disputes:stats.disputed};}
 private log(adminId:string,action:string,targetType:string,targetId:string,metadata:any){return this.repo.log({adminId,action,targetType,targetId,metadata});}
}
