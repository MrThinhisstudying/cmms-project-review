import React, { useState } from "react";
import { Modal, Layout } from "antd";
import MaintenanceHeader from "./components/MaintenanceHeader";
import MaintenanceTable from "./components/MaintenanceTable";
import MaintenanceForm from "./components/MaintenanceForm";

const { Content } = Layout;

const MaintenanceManagement: React.FC = () => {
  // State quản lý đóng mở Modal tạo phiếu
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State dùng để ép Table load lại dữ liệu (mỗi khi số này thay đổi)
  const [refreshKey, setRefreshKey] = useState(0);

  // Hàm được gọi khi Import Excel thành công hoặc Tạo phiếu thành công
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1); // Tăng biến đếm -> Table thấy đổi -> Tự gọi lại API
    setIsModalOpen(false); // Đóng modal
  };

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Content style={{ padding: "24px" }}>
        {/* 1. HEADER: Chứa nút Import và nút Tạo mới */}
        {/* Truyền handleRefresh xuống để nút Import gọi khi upload xong */}
        <MaintenanceHeader
          onCreate={() => setIsModalOpen(true)}
          onRefresh={handleRefresh}
        />

        {/* 2. TABLE: Hiển thị danh sách */}
        {/* Table tự fetch dữ liệu, chỉ cần nhận refreshKey để biết khi nào cần reload */}
        <MaintenanceTable refreshKey={refreshKey} />

        {/* 3. MODAL: Chứa Form tạo phiếu bảo dưỡng */}
        <Modal
          title="Lập Phiếu Bảo Dưỡng"
          open={isModalOpen} // Antd v5 dùng 'open' (thay vì 'visible')
          onCancel={() => setIsModalOpen(false)}
          footer={null} // Ẩn footer mặc định vì Form đã có nút Lưu riêng
          width={1000} // Để rộng ra cho dễ nhìn Checklist
          destroyOnClose // Reset form khi đóng
          maskClosable={false} // Bắt buộc bấm dấu X hoặc Hủy mới đóng
          style={{ top: 20 }}
        >
          <MaintenanceForm
            onSuccess={handleRefresh}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      </Content>
    </Layout>
  );
};

export default MaintenanceManagement;
