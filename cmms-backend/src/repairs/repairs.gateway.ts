import {WebSocketGateway, WebSocketServer, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect} from '@nestjs/websockets';
import {Server, Socket} from 'socket.io';
import {Logger} from '@nestjs/common';

@WebSocketGateway({
    cors: {
        origin: '*',
    },
})
export class RepairsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private logger: Logger = new Logger('RepairsGateway');

    afterInit() {
        this.logger.log('WebSocket Gateway Initialized');
    }

    handleConnection(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId) {
            client.join(`user_${userId}`);
            this.logger.log(`User ${userId} connected on socket ${client.id} (joined room user_${userId})`);
        }
    }

    handleDisconnect(client: Socket) {
        const userId = client.handshake.query.userId as string;
        if (userId) {
            client.leave(`user_${userId}`);
            this.logger.log(`User ${userId} disconnected from socket ${client.id}`);
        }
    }

    // ==================== REPAIRS ====================
    /** Broadcast: danh sách phiếu sửa chữa đã thay đổi */
    notifyRepairUpdate() {
        this.server.emit('repair_updated', {timestamp: new Date()});
    }

    // ==================== DEVICES ====================
    /** Broadcast: danh sách thiết bị đã thay đổi (thêm/sửa/xoá) */
    notifyDeviceUpdate() {
        this.server.emit('device_updated', {timestamp: new Date()});
    }

    // ==================== USERS / PROFILE ====================
    /** Broadcast: thông tin user đã thay đổi (profile, department) */
    notifyUserUpdate(targetUserId?: number) {
        if (targetUserId) {
            // Gửi riêng cho user cụ thể
            this.sendToUser(targetUserId, 'Thông tin cá nhân đã được cập nhật');
        }
        this.server.emit('user_updated', {timestamp: new Date(), targetUserId});
    }

    // ==================== DASHBOARD ====================
    /** Broadcast: dữ liệu dashboard cần refresh */
    notifyDashboardRefresh() {
        this.server.emit('dashboard_refresh', {timestamp: new Date()});
    }

    // ==================== WORK TASKS (REALTIME) ====================
    /** Broadcast: dữ liệu công việc / bình luận / tiến độ thay đổi */
    notifyTaskUpdate(payload?: {taskId?: number; action?: string; actorId?: number}) {
        this.server.emit('task_updated', {
            timestamp: new Date(),
            ...(payload || {}),
        });
        this.server.emit('dashboard_refresh', {timestamp: new Date()});
    }

    // ==================== PROFILE REQUESTS ====================
    /** Broadcast: có yêu cầu cập nhật profile mới */
    notifyProfileRequestUpdate() {
        this.server.emit('profile_request_updated', {timestamp: new Date()});
    }

    // ==================== VEHICLE INCIDENT REPORTS (REALTIME) ====================
    /** Broadcast: có báo cáo tình trạng xe mới hoặc cập nhật trạng thái xử lý */
    notifyIncidentReportUpdate(payload?: {reportId?: number; action?: string; status?: string}) {
        this.server.emit('incident_report_updated', {
            timestamp: new Date(),
            ...(payload || {}),
        });
        this.server.emit('dashboard_refresh', {timestamp: new Date()});
    }

    // ==================== COMPANY POLICIES (REALTIME) ====================
    /** Broadcast: có quy chế / quy định mới hoặc cập nhật trạng thái đã đọc */
    notifyPolicyUpdate(payload?: {policyId?: number; action?: string}) {
        this.server.emit('policy_updated', {
            timestamp: new Date(),
            ...(payload || {}),
        });
        this.server.emit('dashboard_refresh', {timestamp: new Date()});
    }

    // ==================== NOTIFICATION ====================
    /** Gửi thông báo riêng cho 1 user (bắn tới toàn bộ sockets / tabs của user) */
    sendToUser(userId: number, payload: string | Record<string, any>) {
        const data = typeof payload === 'string' ? {message: payload} : payload;
        // Phát tới room user_${userId} để TẤT CẢ socket của user này đều nhận được
        this.server.to(`user_${userId}`).emit('notification', data);
        this.server.to(`user_${userId}`).emit('task_alert', data);
    }
}
