import React, { useEffect, useState } from "react";
import {
  Table,
  Tag,
  Button,
  Card,
  Tooltip,
  message,
  DatePicker,
  Input,
  Space,
} from "antd";
import { EyeOutlined, SearchOutlined, ReloadOutlined } from "@ant-design/icons";
import { getMaintenanceHistory } from "../../apis/maintenance";
import { getToken } from "../../utils/auth";
import { FilePdfOutlined } from "@ant-design/icons";

const MaintenanceHistoryPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = getToken();
      const res = await getMaintenanceHistory(token);
      setData(res);
    } catch (error) {
      message.error("Lỗi tải dữ liệu lịch sử");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // 2. Hàm xử lý download
  const handleDownloadPdf = async (ticketId: number) => {
    try {
      message.loading("Đang tạo PDF...", 1);
      const token = getToken();
      // Gọi thẳng URL Backend để browser tự tải
      const url = `${process.env.REACT_APP_BASE_URL}/maintenance-tickets/${ticketId}/pdf?token=${token}`;

      // Cách tải file an toàn hơn qua Blob (nếu API yêu cầu Header Authorization)
      const response = await fetch(
        `${process.env.REACT_APP_BASE_URL}/maintenance-tickets/${ticketId}/pdf`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!response.ok) throw new Error("Lỗi tải file");

      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = window.URL.createObjectURL(blob);
      link.download = `Phieu_Bao_Duong_${ticketId}.pdf`;
      link.click();

      message.success("Tải xong!");
    } catch (e) {
      message.error("Không thể tải file PDF");
    }
  };

  // Cấu hình cột
  const columns = [
    {
      title: "Mã Phiếu",
      dataIndex: "ticket_id",
      width: 80,
      align: "center" as const,
      render: (id: number) => <b>#{id}</b>,
    },
    {
      title: "Thiết bị",
      dataIndex: ["device", "name"],
      render: (text: string, record: any) => (
        <div>
          <div style={{ fontWeight: 600, color: "#1890ff" }}>{text}</div>
          <div style={{ fontSize: 12, color: "#888" }}>
            {record.device?.brand}
          </div>
        </div>
      ),
    },
    {
      title: "Cấp độ",
      dataIndex: "maintenance_level",
      align: "center" as const,
      render: (text: string) => <Tag color="orange">{text}</Tag>,
    },
    {
      title: "Quy trình áp dụng",
      dataIndex: ["template", "name"],
      ellipsis: true,
    },
    {
      title: "Người thực hiện",
      dataIndex: ["user", "name"],
      render: (t: string) => t || "---",
    },
    {
      title: "Ngày hoàn thành",
      dataIndex: "created_at",
      render: (d: string) =>
        d ? new Date(d).toLocaleDateString("vi-VN") : "-",
    },
    {
      title: "Thao tác",
      key: "action",
      width: 100,
      align: "center" as const,
      render: (_, record: any) => (
        <Tooltip title="Xem chi tiết kết quả">
          <Button
            icon={<EyeOutlined />}
            onClick={() => message.info("Chức năng xem chi tiết sẽ làm sau")}
          />
        </Tooltip>
      ),
    },
    {
      title: "Thao tác",
      key: "action",
      render: (_, record) => (
        <Tooltip title="Tải PDF">
          <Button
            icon={<FilePdfOutlined />}
            size="small"
            type="dashed"
            onClick={() => handleDownloadPdf(record.ticket_id)} // <--- GỌI HÀM
          />
        </Tooltip>
      ),
    },
  ];

  // Lọc dữ liệu theo Search Text
  const filteredData = data.filter(
    (item) =>
      item.device?.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      item.user?.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div style={{ padding: 24 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0 }}>📜 Lịch Sử Bảo Dưỡng</h2>
        <Space>
          <Input
            placeholder="Tìm theo tên xe, tên thợ..."
            prefix={<SearchOutlined />}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 250 }}
          />
          <Button icon={<ReloadOutlined />} onClick={fetchData}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Card
        style={{ borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
      >
        <Table
          dataSource={filteredData}
          columns={columns}
          rowKey="ticket_id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
};

export default MaintenanceHistoryPage;
