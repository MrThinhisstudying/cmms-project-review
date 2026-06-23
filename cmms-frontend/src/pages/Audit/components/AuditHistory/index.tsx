import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Tag,
  Button,
  Popconfirm,
  Card,
  Typography,
  Space,
  Select,
  DatePicker,
  message,
  Row,
  Col,
} from "antd";
import { 
  ReloadOutlined, 
  RollbackOutlined,
  HistoryOutlined,
  FilterOutlined,
  ClearOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { useAuditContext, AuditFilters } from "../../../../context/AuditContext/AuditContext";
import { AuditLog } from "../../../../types/audit.types";
import { useUsersContext } from "../../../../context/UsersContext/UsersContext";

const { Text } = Typography;
const { RangePicker } = DatePicker;

const ACTION_COLOR: Record<string, string> = {
  INSERT: "success",
  UPDATE: "processing",
  DELETE: "error",
  ROLLBACK: "default",
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: "Thêm mới",
  UPDATE: "Cập nhật",
  DELETE: "Xoá",
  ROLLBACK: "Rollback",
};

const ENTITY_LABELS: Record<string, string> = {
  User: "Người dùng",
  Department: "Phòng ban",
  Device: "Thiết bị",
  Maintenance: "Bảo dưỡng",
  Notification: "Thông báo",
  Repair: "Sửa chữa",
  Item: "Vật tư",
  StockOut: "Xuất kho",
  UserCertificate: "Chứng chỉ",
  LaborContract: "Hợp đồng LĐ",
  TrainingProgram: "Chương trình ĐT",
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
  const { logs, fetchAll, fetchWithFilters, rollbackTx, loading, total, currentPage, pageSize } = useAuditContext();
  const { users } = useUsersContext();
  const [rollingTxId, setRollingTxId] = useState<number | null>(null);

  // Filter states
  const [filterAction, setFilterAction] = useState<string | undefined>(undefined);
  const [filterEntity, setFilterEntity] = useState<string | undefined>(undefined);
  const [filterDateRange, setFilterDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  const buildFilters = useCallback((page?: number, limit?: number): AuditFilters => ({
    action: filterAction,
    entity: filterEntity,
    date_from: filterDateRange?.[0]?.format('YYYY-MM-DD'),
    date_to: filterDateRange?.[1]?.format('YYYY-MM-DD'),
    page: page || 1,
    limit: limit || pageSize,
  }), [filterAction, filterEntity, filterDateRange, pageSize]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleSearch = () => {
    fetchWithFilters(buildFilters(1));
  };

  const handleClearFilters = () => {
    setFilterAction(undefined);
    setFilterEntity(undefined);
    setFilterDateRange(null);
    fetchWithFilters({ page: 1, limit: pageSize });
  };

  const handlePageChange = (page: number, size: number) => {
    fetchWithFilters(buildFilters(page, size));
  };

  const handleConfirmRollback = async (txId: number) => {
    setRollingTxId(txId);
    try {
      const ok = await rollbackTx(txId, "admin rollback dữ liệu");
      if (ok) {
        message.success("Rollback thành công");
        fetchWithFilters(buildFilters(currentPage));
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
    const actionLabel = ACTION_LABELS[log.action] || log.action;
    return `${actionLabel}: ${entityDisplay}`;
  };

  const columns = [
    {
      title: "Hành động",
      dataIndex: "action",
      key: "action",
      width: 120,
      render: (action: string) => (
        <Tag color={ACTION_COLOR[action]}>{ACTION_LABELS[action] || action}</Tag>
      ),
    },
    {
      title: "Đối tượng",
      dataIndex: "entity_name",
      key: "entity_name",
      width: 130,
      render: (name: string) => (
        <Tag color="default">{ENTITY_LABELS[name] || name}</Tag>
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

  // Lấy danh sách entity unique từ logs hiện tại
  const entityOptions = Object.entries(ENTITY_LABELS).map(([value, label]) => ({ value, label }));

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
            <Space>
                <HistoryOutlined />
                <span>Lịch sử thay đổi hệ thống</span>
                <Tag color="blue">{total} bản ghi</Tag>
            </Space>
        }
        extra={
            <Button icon={<ReloadOutlined />} onClick={() => fetchWithFilters(buildFilters(currentPage))} loading={loading}>
                Làm mới
            </Button>
        }
        variant="borderless"
        style={{ borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
      >
        {/* Filter Bar */}
        <Row gutter={12} style={{ marginBottom: 16 }} align="middle">
          <Col>
            <Select
              placeholder="Hành động"
              value={filterAction}
              onChange={setFilterAction}
              allowClear
              style={{ width: 140 }}
              options={[
                { value: 'INSERT', label: '➕ Thêm mới' },
                { value: 'UPDATE', label: '✏️ Cập nhật' },
                { value: 'DELETE', label: '🗑️ Xoá' },
                { value: 'ROLLBACK', label: '↩️ Rollback' },
              ]}
            />
          </Col>
          <Col>
            <Select
              placeholder="Đối tượng"
              value={filterEntity}
              onChange={setFilterEntity}
              allowClear
              style={{ width: 160 }}
              options={entityOptions}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Col>
          <Col>
            <RangePicker
              value={filterDateRange as any}
              onChange={(dates) => setFilterDateRange(dates as any)}
              format="DD/MM/YYYY"
              placeholder={['Từ ngày', 'Đến ngày']}
              style={{ width: 260 }}
            />
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<FilterOutlined />} onClick={handleSearch}>
                Lọc
              </Button>
              <Button icon={<ClearOutlined />} onClick={handleClearFilters}>
                Xoá lọc
              </Button>
            </Space>
          </Col>
        </Row>

        <Table
          dataSource={logs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['20', '50', '100', '200'],
            showTotal: (t, range) => `${range[0]}-${range[1]} / ${t} bản ghi`,
            onChange: handlePageChange,
            onShowSizeChange: handlePageChange,
          }}
          bordered
          size="middle"
        />
      </Card>
    </div>
  );
};

export default AuditHistory;
