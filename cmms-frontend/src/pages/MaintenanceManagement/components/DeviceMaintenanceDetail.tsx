import React, { useEffect, useState } from "react";
import { Modal, Table, Tag, Button, message, Empty } from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  FormOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import { getMaintenancesByDevice } from "../../../apis/maintenance";
import MaintenanceForm from "./MaintenanceForm";
import { getToken } from "../../../utils/auth";

interface Props {
  open: boolean;
  device: any; // Thông tin thiết bị được chọn
  onCancel: () => void;
  onSuccess: () => void; // Callback để reload lại bảng bên ngoài sau khi làm xong
}

const DeviceMaintenanceDetail: React.FC<Props> = ({
  open,
  device,
  onCancel,
  onSuccess,
}) => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const token = getToken();

  // 1. Load dữ liệu khi mở Modal
  useEffect(() => {
    if (open && device) {
      fetchPlans();
    }
  }, [open, device]);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      // Gọi API lấy toàn bộ kế hoạch (Active, Inactive, Completed) của xe này
      const res = await getMaintenancesByDevice(device.device_id, token);

      // Sắp xếp: Ngày dự kiến tăng dần (Để nhìn thấy từ tháng 1 -> 24)
      const sorted = Array.isArray(res)
        ? res.sort(
            (a: any, b: any) =>
              dayjs(a.next_maintenance_date).unix() -
              dayjs(b.next_maintenance_date).unix()
          )
        : [];

      setPlans(sorted);
    } catch (error) {
      message.error("Lỗi tải lịch bảo dưỡng");
    } finally {
      setLoading(false);
    }
  };

  // 2. Xử lý khi bấm nút "Tạo phiếu"
  const handleCreateTicket = (plan: any) => {
    setSelectedPlan(plan);
    setIsFormOpen(true);
  };

  // 3. Xử lý khi tạo phiếu thành công
  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setSelectedPlan(null);
    message.success("Đã tạo phiếu thành công!");
    fetchPlans(); // Reload lại list trong modal này
    onSuccess(); // Reload lại list bên ngoài trang chủ
  };

  // 4. Cấu hình cột cho bảng Timeline
  const columns = [
    {
      title: "Hạng mục",
      dataIndex: "level",
      width: 120,
      align: "center" as const,
      render: (level: string) => {
        const map: any = {
          "1M": "01 Tháng",
          "3M": "03 Tháng",
          "6M": "06 Tháng",
          "9M": "09 Tháng",
          "1Y": "01 Năm",
          "2Y": "02 Năm",
        };
        let color = "blue";
        if (level === "6M") color = "orange";
        if (level === "1Y") color = "purple";

        // Cập nhật hiển thị tiếng Việt
        return <Tag color={color}>{map[level] || level}</Tag>;
      },
    },
    {
      title: "Ngày dự kiến",
      dataIndex: "scheduled_date",
      width: 150,
      render: (date: string) => <span>{dayjs(date).format("DD/MM/YYYY")}</span>,
    },
    {
      title: "Ngày hoàn thành",
      dataIndex: "last_maintenance_date",
      width: 150,
      render: (date: string, record: any) => {
        // 1. Nếu là phiếu Dự kiến (Tương lai) -> Trống
        if (record.status === "inactive" && !date)
          return <span style={{ color: "#ccc" }}>---</span>;

        // 2. Nếu là phiếu Đã xong (Lịch sử) -> Hiện ngày check xanh
        if (record.status === "inactive" && date) {
          return (
            <span style={{ color: "green", fontWeight: "bold" }}>
              ✅ {dayjs(date).format("DD/MM/YYYY")}
            </span>
          );
        }

        // 3. Nếu là phiếu Đang chạy (Active)
        // Ngày này thực chất là ngày của lần trước -> Hiển thị màu xám để tham khảo (hoặc ẩn đi tùy bạn)
        if (record.status === "active") {
          return date ? (
            <span style={{ color: "#888", fontStyle: "italic" }}>
              (Lần trước: {dayjs(date).format("DD/MM")})
            </span>
          ) : (
            <span style={{ color: "#ccc" }}>---</span>
          );
        }

        return "-";
      },
    },
    {
      title: "Trạng thái",
      key: "status_display",
      render: (_, record: any) => {
        // --- LOGIC FIX TRẠNG THÁI ---

        // 1. Chỉ tính là HOÀN THÀNH nếu status đã đóng (inactive) VÀ có ngày làm
        if (record.status === "inactive" && record.last_maintenance_date) {
          return (
            <Tag icon={<CheckCircleOutlined />} color="success">
              Hoàn thành
            </Tag>
          );
        }

        // 2. Nếu status đóng mà chưa có ngày -> DỰ KIẾN
        if (record.status === "inactive" && !record.last_maintenance_date) {
          return <Tag color="default">Dự kiến</Tag>;
        }

        // 3. Nếu status là ACTIVE -> BẮT BUỘC phải tính toán ngày (Không được hiện hoàn thành)
        if (record.status === "active") {
          if (!record.next_maintenance_date)
            return <Tag color="default">Lỗi ngày</Tag>;

          const today = dayjs().startOf("day");
          const nextDate = dayjs(record.next_maintenance_date).startOf("day");
          const diff = nextDate.diff(today, "day");

          if (diff < -3)
            return (
              <Tag icon={<WarningOutlined />} color="error">
                Quá hạn {Math.abs(diff)} ngày
              </Tag>
            );
          if (diff >= -3 && diff <= 3)
            return (
              <Tag icon={<ClockCircleOutlined />} color="volcano">
                Đang diễn ra
              </Tag>
            );
          if (diff > 3 && diff <= 7)
            return <Tag color="warning">Sắp đến ({diff} ngày)</Tag>;

          return <Tag color="processing">Đang theo dõi</Tag>;
        }

        return <Tag>Không xác định</Tag>;
      },
    },
    {
      title: "Thao tác",
      align: "center" as const,
      width: 120,
      render: (_, record: any) => {
        // Nút Tạo Phiếu chỉ hiện cho phiếu ACTIVE (Cần làm)
        if (record.status !== "active") return null;

        return (
          <Button
            type="primary"
            size="small"
            icon={<FormOutlined />}
            onClick={() => handleCreateTicket(record)}
          >
            Tạo phiếu
          </Button>
        );
      },
    },
  ];

  return (
    <>
      <Modal
        title={
          <div>
            <span style={{ fontSize: 18 }}>📅 Kế hoạch bảo dưỡng chi tiết</span>
            <div style={{ fontSize: 14, color: "#1890ff", marginTop: 4 }}>
              {device?.name} ({device?.serial_number})
            </div>
          </div>
        }
        open={open}
        onCancel={onCancel}
        width={900}
        footer={[
          <Button key="close" onClick={onCancel}>
            Đóng
          </Button>,
        ]}
      >
        <Table
          dataSource={plans}
          columns={columns}
          rowKey="maintenance_id"
          loading={loading}
          pagination={false}
          scroll={{ y: 500 }}
          locale={{
            emptyText: (
              <Empty description="Chưa có kế hoạch (Hãy Import Excel)" />
            ),
          }}
        />
      </Modal>

      {/* Form tạo phiếu sẽ hiện đè lên Modal chi tiết */}
      {isFormOpen && (
        <Modal
          title="Lập phiếu bảo dưỡng"
          open={isFormOpen}
          footer={null}
          onCancel={() => setIsFormOpen(false)}
          width={1000}
          destroyOnClose
          style={{ top: 20 }}
        >
          <MaintenanceForm
            initialData={{
              device_id: device?.device_id,
              maintenance_level: selectedPlan?.level,
              // Truyền thêm ID kế hoạch để backend biết mà update trạng thái
              scheduled_date: selectedPlan?.scheduled_date,
              maintenance_plan_id: selectedPlan?.maintenance_id,
            }}
            onSuccess={handleFormSuccess}
            onCancel={() => setIsFormOpen(false)}
          />
        </Modal>
      )}
    </>
  );
};

export default DeviceMaintenanceDetail;
