import { WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RepairsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger('RepairsGateway');
  
  // Mapping UserID -> SocketID
  private activeUsers: Map<string, string> = new Map();

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway Initialized');
  }

  handleConnection(client: Socket, ...args: any[]) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
        this.activeUsers.set(userId, client.id);
        // this.logger.log(`User ${userId} connected with socket ${client.id}`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = [...this.activeUsers.entries()]
        .find(({ 1: socketId }) => socketId === client.id)?.[0];
    
    if (userId) {
        this.activeUsers.delete(userId);
        // this.logger.log(`User ${userId} disconnected`);
    }
  }

  // Method to broadcast changes (General reload)
  notifyRepairUpdate() {
    this.server.emit('repair_updated', { timestamp: new Date() });
  }

  // Method to send specific notification to a user
  sendToUser(userId: number, message: string) {
      const socketId = this.activeUsers.get(String(userId));
      if (socketId) {
          this.server.to(socketId).emit('notification', { message });
          // this.logger.log(`Sent notification to User ${userId}`);
      }
  }
}
