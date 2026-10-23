import React, { useMemo } from "react";
import { Modal, Table, Tag, Button, Typography, Empty, Badge } from "antd";
import {
  ClockCircleOutlined,
  EyeOutlined,
  NotificationOutlined,
  CarOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { IRepair } from "../../../../types/repairs.types";

const { Text } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  user: any;
  repairs: IRepair[];
  onReviewRepair: (repair: IRepair) => void;
}

const PendingApprovalsModal: React.FC<Props> = ({
  open,
  onClose,
  user,
  repairs,
  onReviewRepair,
}) => {
  const role = user?.role || "";

  // Lọc các phiếu đang chờ chính tài khoản này duyệt theo cấp
  const pendingRepairs = useMemo(() => {
    if (!user) return [];

    return repairs.filter((r) => {
      if (r.canceled) return false;

      if (role === "ADMIN") {
        // Admin: Thấy toàn bộ phiếu đang chờ duyệt ở bất kỳ bước nào
        const isRequestPending =
          r.status_request !== "COMPLETED" &&
          r.status_request !== "REJECTED" &&
          r.status_request !== "REJECTED_B03";
        const isInspectionPending =
          r.status_request === "COMPLETED" &&
          r.status_inspection !== "inspection_admin_approved" &&
          r.status_inspection !== "inspection_rejected" &&
          r.status_inspection !== "REJECTED_B04";
        const isAcceptancePending =
          r.status_inspection === "inspection_admin_approved" &&
          r.status_acceptance !== "acceptance_admin_approved" &&
          r.status_acceptance !== "acceptance_rejected" &&
          r.status_acceptance !== "REJECTED_B05";
        return isRequestPending || isInspectionPending || isAcceptancePending;
      }

      if (role === "TEAM_LEAD") {
        if (r.status_request === "WAITING_TEAM_LEAD") return true;
        if (r.status_inspection === "inspection_pending" && r.inspection_created_at) return true;
        if (r.status_acceptance === "acceptance_pending" && r.acceptance_created_at) return true;
        return false;
      }

      if (role === "UNIT_HEAD") {
        if (r.status_request === "WAITING_MANAGER") return true;
        if (r.status_inspection === "inspection_lead_approved") return true;
        if (r.status_acceptance === "acceptance_lead_approved") return true;
        return false;
      }

      if (role === "DIRECTOR") {
        if (r.status_request === "WAITING_DIRECTOR") return true;
        if (r.status_inspection === "inspection_manager_approved") return true;
        if (r.status_acceptance === "acceptance_manager_approved") return true;
        return false;
      }

      if (role === "TECHNICIAN") {
        if (r.status_request === "WAITING_TECH") return true;
        if (r.status_request === "REJECTED_B03" && r.created_by?.user_id === user.user_id) return true;
        if (r.status_inspection === "REJECTED_B04") return true;
        if (r.status_acceptance === "REJECTED_B05") return true;
        return false;
      }

      return false;
    });
  }, [repairs, user, role]);

  const getRoleDisplayName = (r: string) => {
    switch (r) {
      case "TEAM_LEAD":
        return "Tổ trưởng";
      case "UNIT_HEAD":
        return "Cán bộ Đội / Đội trưởng";
      case "DIRECTOR":
        return "Ban Giám đốc";
      case "TECHNICIAN":
        return "Kỹ thuật viên";
      case "ADMIN":
        return "Quản trị viên";
      default:
        return "Người dùng";
    }
  };

  // Xác định giai đoạn và nội dung phê duyệt
  const getApprovalStepInfo = (r: IRepair) => {
    if (r.status_request !== "COMPLETED") {
      return {
        phase: "Yêu cầu (B03)",
        phaseColor: "blue",
        detail:
          r.status_request === "WAITING_TECH"
            ? "Chờ KT tiếp nhận"
            : r.status_request === "WAITING_TEAM_LEAD"
            ? "Chờ Tổ trưởng duyệt"
            : r.status_request === "WAITING_MANAGER"
            ? "Chờ CB Đội duyệt"
            : r.status_request === "WAITING_DIRECTOR"
            ? "Chờ Ban GĐ duyệt"
            : r.status_request,
      };
    }
    if (r.status_inspection !== "inspection_admin_approved") {
      return {
        phase: "Kiểm nghiệm (B04)",
        phaseColor: "purple",
        detail:
          r.status_inspection === "inspection_lead_approved"
            ? "Chờ CB Đội duyệt"
            : r.status_inspection === "inspection_manager_approved"
            ? "Chờ Ban GĐ duyệt"
            : "Chờ CB Tổ lập/duyệt",
      };
    }
    return {
      phase: "Nghiệm thu (B05)",
      phaseColor: "cyan",
      detail:
        r.status_acceptance === "acceptance_lead_approved"
          ? "Chờ CB Đội duyệt"
          : r.status_acceptance === "acceptance_manager_approved"
          ? "Chờ Ban GĐ duyệt"
          : "Chờ CB Tổ lập/duyệt",
    };
  };

  const columns = [
    {
      title: "Mã phiếu",
      dataIndex: "repair_id",
      key: "repair_id",
      width: 90,
      render: (id: number) => <span style={{ fontWeight: "bold", color: "#1890ff" }}>#{id}</span>,
    },
    {
      title: "Thiết bị",
      key: "device",
      render: (_: any, r: IRepair) => (
        <div>
          <div style={{ fontWeight: 600 }}>
            <CarOutlined style={{ marginRight: 6, color: "#1890ff" }} />
            {r.device?.name || "Thiết bị"}
          </div>
          <div style={{ fontSize: 12, color: "#666" }}>
            {r.device?.reg_number ? `BS: ${r.device.reg_number}` : `SN: ${r.device?.serial_number || "-"}`}
          </div>
        </div>
      ),
    },
    {
      title: "Cấp cần duyệt",
      key: "approval_step",
      width: 200,
      render: (_: any, r: IRepair) => {
        const info = getApprovalStepInfo(r);
        return (
          <div>
            <Tag color={info.phaseColor} style={{ marginBottom: 4 }}>
              {info.phase}
            </Tag>
            <div style={{ fontSize: 12, fontWeight: 500, color: "#d46b08" }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {info.detail}
            </div>
          </div>
        );
      },
    },
    {
      title: "Nội dung hư hỏng",
      dataIndex: "description_defect",
      key: "defect",
      ellipsis: true,
      render: (text: string) => (
        <span style={{ fontSize: 13, color: "#434343" }}>{text || "Không có mô tả chi tiết"}</span>
      ),
    },
    {
      title: "Người lập / Đơn vị",
      key: "creator",
      width: 170,
      render: (_: any, r: IRepair) => (
        <div>
          <div style={{ fontWeight: 500 }}>{r.created_by?.name || "Hệ thống"}</div>
          <div style={{ fontSize: 11, color: "#888" }}>
            {r.created_department?.name || r.created_by?.department?.name || ""}
          </div>
          <div style={{ fontSize: 11, color: "#aaa" }}>
            {r.created_at ? dayjs(r.created_at).format("DD/MM/YYYY HH:mm") : ""}
          </div>
        </div>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      width: 130,
      align: "center" as const,
      render: (_: any, r: IRepair) => (
        <Button
          type="primary"
          size="small"
          icon={<EyeOutlined />}
          style={{ background: "#52c41a", borderColor: "#52c41a" }}
          onClick={() => {
            onClose();
            onReviewRepair(r);
          }}
        >
          Duyệt ngay
        </Button>
      ),
    },
  ];

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={920}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#e6f7ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <NotificationOutlined style={{ fontSize: 20, color: "#1890ff" }} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>
              Thông Báo Phiếu Sửa Chữa Chờ Phê Duyệt
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#8c8c8c" }}>
              Cấp thẩm quyền: <Tag color="blue">{getRoleDisplayName(role)}</Tag>
            </div>
          </div>
        </div>
      }
      footer={[
        <Button key="close" onClick={onClose}>
          Để sau
        </Button>,
        <Button
          key="first"
          type="primary"
          disabled={pendingRepairs.length === 0}
          onClick={() => {
            if (pendingRepairs.length > 0) {
              onClose();
              onReviewRepair(pendingRepairs[0]);
            }
          }}
        >
          Xử lý phiếu đầu tiên
        </Button>,
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            borderRadius: 8,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: 13, color: "#873800" }}>
            Xin chào <b>{user?.name || "Bạn"}</b>, hệ thống ghi nhận có{" "}
            <Badge
              count={pendingRepairs.length}
              overflowCount={999}
              style={{ backgroundColor: "#ff4d4f", fontWeight: "bold" }}
            />{" "}
            phiếu sửa chữa đang chờ bạn xem xét và phê duyệt theo đúng cấp bậc.
          </Text>
        </div>
      </div>

      {pendingRepairs.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Hiện tại không có phiếu nào cần bạn phê duyệt."
        />
      ) : (
        <Table
          dataSource={pendingRepairs}
          columns={columns}
          rowKey="repair_id"
          size="small"
          pagination={{ pageSize: 5, size: "small" }}
          bordered
        />
      )}
    </Modal>
  );
};

export default PendingApprovalsModal;
