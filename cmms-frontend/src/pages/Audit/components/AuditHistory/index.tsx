import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Popconfirm,
  Card,
  Typography,
  Space,
  message
} from "antd";
import { 
  ReloadOutlined, 
  RollbackOutlined,
  HistoryOutlined
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuditContext } from "../../../../context/AuditContext/AuditContext";
import { AuditLog } from "../../../../types/audit.types";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";

const { Title, Text } = Typography;

const ACTION_COLOR: Record<string, string> = {
  INSERT: "success",
  UPDATE: "processing",
  DELETE: "error",
  ROLLBACK: "default",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "người dùng",
  Department: "phòng ban",
  Device: "thiết bị",
  Maintenance: "bảo dưỡng",
  Notification: "thông báo",
};

function getEntityDisplay(log: AuditLog): string {
  const entityLabel = ENTITY_LABELS[log.entity_name] || log.entity_name;
  const target =
    (log.after && (log.after.name || log.after.title)) ||
    (log.before && (log.before.name || log.before.title)) ||
    `#${log.entity_id}`;
  return `${entityLabel} ${target}`;
}

const AuditHistory: React.FC = () => {
  const { logs, fetchAll, rollbackTx, loading } = useAuditContext();
  const { users } = useUsersContext();
  const [rollingTxId, setRollingTxId] = useState<number | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleConfirmRollback = async (txId: number) => {
    setRollingTxId(txId);
    try {
      const ok = await rollbackTx(txId, "admin rollback dữ liệu");
      if (ok) {
        message.success("Rollback thành công");
        fetchAll();
      } else {
        message.error("Rollback thất bại");
      }
    } catch (error) {
       message.error("Có lỗi xảy ra khi rollback");
    } finally {
      setRollingTxId(null);
    }
  };

  const renderDescription = (log: AuditLog) => {
    const entityDisplay = getEntityDisplay(log);
    switch (log.action) {
      case "INSERT":
        return `Đã thêm mới ${entityDisplay}`;
      case "UPDATE":
        return `Đã cập nhật ${entityDisplay}`;
      case "DELETE":
        return `Đã xóa ${entityDisplay}`;
      case "ROLLBACK":
        return `Đã rollback thay đổi cho ${entityDisplay}`;
      default:
        return "";
    }
  };

  const columns = [
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 120,
      render: (action: string) => (
        <Tag color={ACTION_COLOR[action]}>{action}</Tag>
      ),
    },
    {
      title: "Mô tả chi tiết",
      key: "description",
      render: (_: any, log: AuditLog) => (
        <Space direction="vertical" size={0}>
          <Text strong>{renderDescription(log)}</Text>
          {log.reason && <Text type="secondary">Lý do: {log.reason}</Text>}
        </Space>
      ),
    },
    {
      title: "Người thực hiện",
      key: "actor",
      width: 150,
      render: (_: any, log: AuditLog) => {
        const name = log.actor?.name;
        // Fallback to finding in context if not in relation (legacy/mixed)
        const foundUser = !name && log.actor_user_id ? users.find(u => u.user_id === log.actor_user_id) : null;
        
        return (
          <Space>
             <Text>{name || foundUser?.name || `ID: ${log.actor_user_id || "N/A"}`}</Text>
          </Space>
        )
      }
    },
    {
      title: "Thời gian",
      dataIndex: "created_at",
      key: "created_at",
      width: 180,
      render: (date: string) => dayjs(date).format("DD/MM/YYYY HH:mm:ss"),
    },
    {
      title: "Thao tác",
      key: "action_btn",
      width: 150,
      render: (_: any, log: AuditLog) => {
        if (log.action === "ROLLBACK" || log.rolled_back || !log.transaction?.id) {
            if (log.rolled_back) return <Tag>ĐÃ ROLLBACK</Tag>;
            return null;
        }

        return (
          <Popconfirm
            title="Xác nhận rollback?"
            description="Bạn có chắc chắn muốn hoàn tác thay đổi này?"
            onConfirm={() => handleConfirmRollback(log.transaction!.id)}
            okText="Đồng ý"
            cancelText="Hủy"
          >
            <Button 
                danger 
                size="small" 
                icon={<RollbackOutlined />} 
                loading={rollingTxId === log.transaction.id}
            >
              Rollback
            </Button>
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
            <Space>
                <HistoryOutlined />
                <span>Lịch sử thay đổi hệ thống</span>
            </Space>
        }
        extra={
            <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>
                Làm mới
            </Button>
        }
        bordered={false}
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          bordered
        />
      </Card>
    </div>
  );
};

export default AuditHistory;
