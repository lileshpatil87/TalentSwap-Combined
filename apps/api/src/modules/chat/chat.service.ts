import { Injectable } from '@nestjs/common'; import { ChatRepository } from './chat.repository'; import { ConversationAccessException, ConversationNotFoundException } from './chat.exceptions'; import { RealtimeService } from '../../realtime/realtime.service'; import { UsersService } from '../users/users.service';
@Injectable() export class ChatService {constructor(private readonly repo:ChatRepository,private readonly realtime:RealtimeService,private readonly users:UsersService){}
 async createConversation(userId:string,participantIds:string[]){const ids=[...new Set([userId,...participantIds])];if(ids.length<2)throw new ConversationAccessException();for(const id of ids)await this.users.assertActive(id);const c=await this.repo.createConversation(ids);return c;}
 async getConversation(id:string,userId:string){const c=await this.repo.findConversation(id);if(!c)throw new ConversationNotFoundException();if(!c.participantIds.includes(userId))throw new ConversationAccessException();return c;}
 async list(userId:string){return this.repo.list(userId);}
 async messages(id:string,userId:string,page=1,limit=50){await this.getConversation(id,userId);return this.repo.messages(id,page,limit);}
 async send(userId:string,id:string,content:string){const c=await this.getConversation(id,userId);const m=await this.repo.send(id,userId,content);this.realtime.emitToRoom(`conversation:${c.id}`,'message:received',m);return m;}
}
