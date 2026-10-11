import { Logger } from '@nestjs/common';
import { TokenService } from '@app/modules/auth/token.service'; import { OnGatewayConnection, OnGatewayDisconnect, WebSocketGateway, WebSocketServer } from '@nestjs/websockets'; import type { Server, Socket } from 'socket.io'; import { RealtimeService } from './realtime.service';
@WebSocketGateway({cors:{origin:true,credentials:true}}) export class RealtimeGateway implements OnGatewayConnection,OnGatewayDisconnect { @WebSocketServer() server!:Server; private readonly logger=new Logger(RealtimeGateway.name); constructor(private readonly realtime:RealtimeService, private readonly tokens:TokenService){}
 afterInit(server:Server){this.realtime.setServer(server);}
 handleConnection(socket:Socket){const token=typeof socket.handshake.auth?.token==='string'?socket.handshake.auth.token:null;if(!token){socket.disconnect(true);return;}try{const payload=this.tokens.verifyAccessToken(token);this.realtime.joinUser(socket,payload.sub);socket.data.user=payload;}catch{socket.disconnect(true);}}
 handleDisconnect(socket:Socket){this.logger.debug(`Socket disconnected: ${socket.id}`);}
}
