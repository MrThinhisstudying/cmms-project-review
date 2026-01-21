import React from "react";
import { Table, Tag, Tooltip, Space, Typography } from "antd";
import { IRepair } from "../../../../types/repairs.types";
import dayjs from "dayjs";

interface Props {
  loading: boolean;
  repairs: IRepair[];
  pagination: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
  };
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  WAITING_TECH: { label: "YC - Chờ kỹ thuật", color: "warning" },
  WAITING_TEAM_LEAD: { label: "YC - Chờ Đội duyệt", color: "processing" },
  WAITING_MANAGER: { label: "YC - Chờ QL duyệt", color: "orange" },
  WAITING_DIRECTOR: { label: "YC - Chờ GĐ duyệt", color: "purple" },
  COMPLETED: { label: "YC - Đã duyệt", color: "success" },
  REJECTED: { label: "YC - Bị từ chối", color: "error" },
  REJECTED_B03: { label: "YC - Bị từ chối", color: "error" },

  inspection_pending: { label: "KN - Đang thực hiện", color: "warning" },
  inspection_lead_approved: { label: "KN - Tổ trưởng duyệt", color: "processing" },
  inspection_manager_approved: { label: "KN - QL duyệt", color: "cyan" },
  inspection_admin_approved: { label: "KN - GĐ duyệt", color: "success" },
  inspection_rejected: { label: "KN - Bị từ chối", color: "error" },
  REJECTED_B04: { label: "KN - Bị từ chối", color: "error" },

  acceptance_pending: { label: "NT - Đang thực hiện", color: "warning" },
  acceptance_lead_approved: { label: "NT - Tổ trưởng duyệt", color: "processing" },
  acceptance_manager_approved: { label: "NT - QL duyệt", color: "cyan" },
  acceptance_admin_approved: { label: "NT - GĐ duyệt", color: "success" },
  acceptance_rejected: { label: "NT - Bị từ chối", color: "error" },
  REJECTED_B05: { label: "NT - Bị từ chối", color: "error" },
};

const RepairHistoryTab: React.FC<Props> = ({ loading, repairs, pagination }) => {

  const getStatusInfo = (status: string) => {
      return STATUS_MAP[status] || { label: status, color: 'default' };
  };

  const columns = [
    {
      title: "#",
      key: "index",
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1,
      width: 50,
      align: 'center' as const,
    },
    {
      title: "Ngày lập",
      key: "created_at",
      render: (_: any, r: IRepair) => (
        <div>
          <div style={{fontWeight: 500}}>{dayjs(r.created_at).format("DD/MM/YYYY")}</div>
          <div style={{ fontSize: 11, color: "#888" }}>{dayjs(r.created_at).format("HH:mm")}</div>
        </div>
      ),
      width: 110,
    },
    {
      title: "Người lập",
      key: "creator",
      render: (_: any, r: IRepair) => (
          <div>
              <div>{r.created_by?.name}</div>
              <div style={{fontSize: 11, color: '#888'}}>{r.created_department?.name}</div>
          </div>
      ),
      width: 150,
    },
    {
      title: "Yêu cầu",
      key: "status",
      render: (_: any, r: IRepair) => {
        const info = getStatusInfo(r.status_request);
        return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
      title: "Kiểm nghiệm",
      key: "inspection",
      render: (_: any, r: IRepair) => {
          if (!r.status_inspection) return '-';
          const info = getStatusInfo(r.status_inspection);
          return <Tag color={info.color}>{info.label}</Tag>;
      },
    },
    {
        title: "Nghiệm thu",
        key: "acceptance",
        render: (_: any, r: IRepair) => {
            if (!r.status_acceptance) return '-';
            const info = getStatusInfo(r.status_acceptance);
            return <Tag color={info.color}>{info.label}</Tag>;
        },
    }
  ];

  return (
    <Table
      columns={columns}
      dataSource={repairs}
      rowKey="repair_id"
      loading={loading}
      pagination={{
        current: pagination.current,
        pageSize: pagination.pageSize,
        total: pagination.total,
        onChange: pagination.onChange,
        showSizeChanger: true,
        showTotal: (total) => `Tổng ${total} phiếu`,
      }}
      size="small"
      scroll={{ x: 800 }}
    />
  );
};

export default RepairHistoryTab;
