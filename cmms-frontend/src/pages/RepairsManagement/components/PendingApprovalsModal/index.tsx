import React, { useMemo, useState } from "react";
import { Modal, Table, Tag, Button, Typography, Empty, Badge, Grid, Pagination } from "antd";
import {
  ClockCircleOutlined,
  EyeOutlined,
  NotificationOutlined,
  CarOutlined,
  UserOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { IRepair } from "../../../../types/repairs.types";

const { Text } = Typography;
const { useBreakpoint } = Grid;

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [mobilePage, setMobilePage] = useState(1);
  const mobilePageSize = 5;

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
      width: "9%",
      render: (id: number) => <span style={{ fontWeight: "bold", color: "#1890ff" }}>#{id}</span>,
    },
    {
      title: "Thiết bị",
      key: "device",
      width: "23%",
      render: (_: any, r: IRepair) => (
        <div style={{ wordBreak: "break-word" }}>
          <div style={{ fontWeight: 600, lineHeight: 1.35 }}>
            <CarOutlined style={{ marginRight: 6, color: "#1890ff" }} />
            {r.device?.name || "Thiết bị"}
          </div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>
            {r.device?.reg_number ? `BS: ${r.device.reg_number}` : `SN: ${r.device?.serial_number || "-"}`}
          </div>
        </div>
      ),
    },
    {
      title: "Cấp cần duyệt",
      key: "approval_step",
      width: "20%",
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
      width: "21%",
      render: (text: string) => (
        <div
          style={{
            fontSize: 13,
            color: "#434343",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            wordBreak: "break-word",
          }}
          title={text}
        >
          {text || "Không có mô tả chi tiết"}
        </div>
      ),
    },
    {
      title: "Người lập / Đơn vị",
      key: "creator",
      width: "15%",
      render: (_: any, r: IRepair) => (
        <div>
          <div style={{ fontWeight: 500, fontSize: 12.5 }}>{r.created_by?.name || "Hệ thống"}</div>
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
      width: "12%",
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

  const paginatedMobileRepairs = useMemo(() => {
    const start = (mobilePage - 1) * mobilePageSize;
    return pendingRepairs.slice(start, start + mobilePageSize);
  }, [pendingRepairs, mobilePage]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width="min(920px, calc(100vw - 16px))"
      centered
      styles={{
        body: {
          padding: isMobile ? "10px 0 4px 0" : undefined,
        },
      }}
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingRight: 20 }}>
          <div
            style={{
              width: isMobile ? 34 : 38,
              height: isMobile ? 34 : 38,
              borderRadius: "50%",
              background: "#e6f7ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <NotificationOutlined style={{ fontSize: isMobile ? 17 : 20, color: "#1890ff" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: isMobile ? 14.5 : 16, fontWeight: 700, lineHeight: 1.3 }}>
              Thông Báo Phiếu Sửa Chữa Chờ Phê Duyệt
            </div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#8c8c8c", marginTop: 2 }}>
              Cấp thẩm quyền: <Tag color="blue" style={{ margin: 0 }}>{getRoleDisplayName(role)}</Tag>
            </div>
          </div>
        </div>
      }
      footer={
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <Button key="close" onClick={onClose} style={{ flex: isMobile ? 1 : undefined }}>
            Để sau
          </Button>
          <Button
            key="first"
            type="primary"
            disabled={pendingRepairs.length === 0}
            style={{ flex: isMobile ? 2 : undefined }}
            onClick={() => {
              if (pendingRepairs.length > 0) {
                onClose();
                onReviewRepair(pendingRepairs[0]);
              }
            }}
          >
            Xử lý phiếu đầu tiên ({pendingRepairs.length})
          </Button>
        </div>
      }
    >
      <div style={{ marginBottom: 12 }}>
        <div
          style={{
            background: "#fffbe6",
            border: "1px solid #ffe58f",
            borderRadius: 8,
            padding: isMobile ? "8px 12px" : "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Text style={{ fontSize: isMobile ? 12.5 : 13, color: "#873800", lineHeight: 1.45 }}>
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
      ) : isMobile ? (
        <div>
          <div
            style={{
              maxHeight: "56vh",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 10,
              paddingRight: 2,
            }}
          >
            {paginatedMobileRepairs.map((r) => {
              const info = getApprovalStepInfo(r);
              return (
                <div
                  key={r.repair_id}
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: 10,
                    padding: "10px 12px",
                    background: "#ffffff",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.03)",
                  }}
                >
                  {/* Row 1: Mã phiếu + Cấp duyệt */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 6,
                      flexWrap: "wrap",
                      marginBottom: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <Tag
                        color="blue"
                        style={{ margin: 0, fontWeight: 700, borderRadius: 6 }}
                      >
                        #{r.repair_id}
                      </Tag>
                      <Tag color={info.phaseColor} style={{ margin: 0, borderRadius: 6 }}>
                        {info.phase}
                      </Tag>
                    </div>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "#d46b08" }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {info.detail}
                    </span>
                  </div>

                  {/* Row 2: Tên xe & Biển số */}
                  <div style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", lineHeight: 1.35 }}>
                    <CarOutlined style={{ marginRight: 6, color: "#1677ff" }} />
                    {r.device?.name || "Thiết bị"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
                    {r.device?.reg_number
                      ? `Biển số: ${r.device.reg_number}`
                      : `Số khung/SN: ${r.device?.serial_number || "-"}`}
                  </div>

                  {/* Row 3: Nội dung hư hỏng */}
                  <div
                    style={{
                      marginTop: 6,
                      padding: "6px 10px",
                      background: "#f8fafc",
                      borderRadius: 6,
                      fontSize: 12.5,
                      color: "#334155",
                      borderLeft: "3px solid #91caff",
                      wordBreak: "break-word",
                    }}
                  >
                    <strong>Hư hỏng:</strong> {r.description_defect || "Không có mô tả chi tiết"}
                  </div>

                  {/* Row 4: Người lập & Nút Duyệt ngay */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 8,
                      paddingTop: 8,
                      borderTop: "1px dashed #e2e8f0",
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: "#64748b", minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "#334155" }}>
                        <UserOutlined style={{ marginRight: 4 }} />
                        {r.created_by?.name || "Hệ thống"}
                      </div>
                      <div>
                        {r.created_department?.name || r.created_by?.department?.name || ""}
                        {r.created_at ? ` • ${dayjs(r.created_at).format("DD/MM HH:mm")}` : ""}
                      </div>
                    </div>

                    <Button
                      type="primary"
                      size="small"
                      icon={<EyeOutlined />}
                      style={{
                        background: "#52c41a",
                        borderColor: "#52c41a",
                        borderRadius: 6,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                      onClick={() => {
                        onClose();
                        onReviewRepair(r);
                      }}
                    >
                      Duyệt ngay
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {pendingRepairs.length > mobilePageSize && (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <Pagination
                size="small"
                current={mobilePage}
                pageSize={mobilePageSize}
                total={pendingRepairs.length}
                onChange={(p) => setMobilePage(p)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      ) : (
        <Table
          dataSource={pendingRepairs}
          columns={columns}
          rowKey="repair_id"
          size="small"
          tableLayout="fixed"
          pagination={{ pageSize: 5, size: "small" }}
          bordered
        />
      )}
    </Modal>
  );
};

export default PendingApprovalsModal;
