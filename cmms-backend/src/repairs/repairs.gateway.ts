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

  // ==================== REPAIRS ====================
  /** Broadcast: danh sách phiếu sửa chữa đã thay đổi */
  notifyRepairUpdate() {
    this.server.emit('repair_updated', { timestamp: new Date() });
  }

  // ==================== DEVICES ====================
  /** Broadcast: danh sách thiết bị đã thay đổi (thêm/sửa/xoá) */
  notifyDeviceUpdate() {
    this.server.emit('device_updated', { timestamp: new Date() });
  }

  // ==================== USERS / PROFILE ====================
  /** Broadcast: thông tin user đã thay đổi (profile, department) */
  notifyUserUpdate(targetUserId?: number) {
    if (targetUserId) {
      // Gửi riêng cho user cụ thể
      this.sendToUser(targetUserId, 'Thông tin cá nhân đã được cập nhật');
    }
    this.server.emit('user_updated', { timestamp: new Date(), targetUserId });
  }

  // ==================== DASHBOARD ====================
  /** Broadcast: dữ liệu dashboard cần refresh */
  notifyDashboardRefresh() {
    this.server.emit('dashboard_refresh', { timestamp: new Date() });
  }

  // ==================== PROFILE REQUESTS ====================
  /** Broadcast: có yêu cầu cập nhật profile mới */
  notifyProfileRequestUpdate() {
    this.server.emit('profile_request_updated', { timestamp: new Date() });
  }

  // ==================== NOTIFICATION ====================
  /** Gửi thông báo riêng cho 1 user */
  sendToUser(userId: number, message: string) {
      const socketId = this.activeUsers.get(String(userId));
      if (socketId) {
          this.server.to(socketId).emit('notification', { message });
      }
  }
}
