import React, { useEffect, useState } from "react";
import { Layout, Card, Row, Col, Statistic, Input, Select, Button, Space, notification } from "antd";
import { IDevice, DeviceGroup } from "../../types/devicesManagement.types";
import DevicesTable from "./components/DevicesTable";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  CarOutlined,
  ToolOutlined,
  WarningOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import {
  uploadDevices,
  deleteDevice,
  updateDevice,
  createDevice,
} from "../../apis/devices";
import { exportDevicesToExcel } from "../../utils";
import DeviceForm from "./components/DeviceForm";
import { getToken } from "../../utils/auth";
import DeviceDetailDrawer from "./components/DeviceDetailDrawer";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { getAllDeviceGroups } from "../../apis/deviceGroups";

const { Option } = Select;

const DevicesManagement: React.FC = () => {
  const { devices, loading, fetchDevices, report, fetchReport } = useDevicesContext();
  const { user } = useAuthContext();
  
  // Local Filter State
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterGroup, setFilterGroup] = useState<number | undefined>(undefined);
  
  // UI State
  const [openForm, setOpenForm] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IDevice | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<IDevice | null>(null);
  const [deviceGroups, setDeviceGroups] = useState<DeviceGroup[]>([]);

  const userRole = user?.role;
  const userPermissions = user?.permissions || [];

  const canEdit =
    userRole === "admin" ||
    (userRole === "manager" &&
      (userPermissions.includes("ADD_DEVICE") ||
        userPermissions.includes("UPDATE_DEVICE")));

  const canDelete =
    userRole === "admin" ||
    (userRole === "manager" && userPermissions.includes("DELETE_DEVICE"));

  // Fetch initial data
  useEffect(() => {
    fetchDevices({ name: searchText, status: filterStatus, groupId: filterGroup });
    fetchReport(); // Fetch report stats
    
    // Fetch groups
    const fetchGroups = async () => {
        try {
            const token = getToken();
            const res = await getAllDeviceGroups(token);
             // Ensure it returns array
            setDeviceGroups(Array.isArray(res) ? res : []);
        } catch (e) {
            console.error("Failed to fetch groups", e);
        }
    };
    fetchGroups();
  }, [filterStatus, filterGroup, fetchDevices, fetchReport, searchText]); // Trigger when Selects change. Search text handled separately on wrapper or debounce.

  const handleSearch = () => {
      fetchDevices({ name: searchText, status: filterStatus, groupId: filterGroup });
  };

  const handleAdd = () => {
    setSelectedDevice(null);
    setOpenForm(true);
  };

  const handleEdit = (device: IDevice) => {
    setSelectedDevice(device);
    setOpenForm(true);
  };

  const handleView = (device: IDevice) => {
    setDetailDevice(device);
    setDetailOpen(true);
  };

  const handleDelete = async (id?: number) => {
    if (!id) return;
    try {
      const token = getToken();
      await deleteDevice(id, token);
      notification.success({ message: "Xoá thành công", title: "Thành công" });
      fetchDevices({ name: searchText, status: filterStatus, groupId: filterGroup });
    } catch (error: any) {
       console.error(error);
       notification.error({ message: "Xoá thất bại", title: "Lỗi", description: error?.message });
    }
  };

  const handleFormSubmit = async (data: Partial<IDevice>) => {
      const token = getToken();
      try {
        if (selectedDevice?.device_id) {
            await updateDevice(selectedDevice.device_id, token, data);
            notification.success({ message: "Cập nhật thành công", title: "Thành công" });
        } else {
            await createDevice(token, data);
            notification.success({ message: "Thêm mới thành công", title: "Thành công" });
        }
        setOpenForm(false);
        fetchDevices({ name: searchText, status: filterStatus, groupId: filterGroup });
      } catch (error: any) {
          throw error;
      }
  };

  const handleExportExcel = () => {
      exportDevicesToExcel(devices);
  };

  const handleUpload = async (file: File) => {
       const token = getToken();
       await uploadDevices(token, file);
       fetchDevices({ name: searchText, status: filterStatus, groupId: filterGroup });
  };

  return (
    <Layout style={{ padding: "16px", background: "#f0f2f5", minHeight: "100vh" }}>
      {/* 1. Stats Bar */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6} md={4}>
          <Card bordered={false} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Tổng thiết bị"
              value={report?.total || 0}
              prefix={<CarOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card bordered={false} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Sẵn sàng (Mới)"
              value={report?.MOI || 0}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card bordered={false} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Đang sử dụng"
              value={report?.DANG_SU_DUNG || 0}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
         <Col xs={12} sm={6} md={4}>
          <Card bordered={false} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Đang sửa chữa"
              value={report?.DANG_SUA_CHUA || 0}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ToolOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
          <Card bordered={false} bodyStyle={{ padding: 16 }}>
            <Statistic
              title="Sử dụng hạn chế"
              value={report?.SU_DUNG_HAN_CHE || 0}
              valueStyle={{ color: '#faad14' }}
              prefix={<WarningOutlined />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6} md={4}>
             <Card bordered={false} bodyStyle={{ padding: 16 }}>
                <Statistic
                    title="Thanh lý/Hủy"
                    value={(report?.THANH_LY || 0) + (report?.HUY_BO || 0)}
                    valueStyle={{ color: '#8c8c8c' }}
                />
             </Card>
        </Col>
      </Row>

      {/* 2. Filters & Actions */}
      <Card bodyStyle={{ padding: "16px 24px" }} style={{ marginBottom: 16 }}>
         <Row justify="space-between" align="middle" gutter={[16, 16]}>
             <Col flex="auto">
                 <Space wrap>
                     <Input 
                        placeholder="Tìm theo tên, mã..." 
                        prefix={<SearchOutlined />} 
                        style={{ width: 250 }}
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                        onPressEnter={handleSearch}
                     />
                     <Select
                        placeholder="Trạng thái"
                        allowClear
                        style={{ width: 180 }}
                        onChange={setFilterStatus}
                     >
                         <Option value="MOI">Mới</Option>
                         <Option value="DANG_SU_DUNG">Đang sử dụng</Option>
                         <Option value="SU_DUNG_HAN_CHE">Sử dụng hạn chế</Option>
                         <Option value="DANG_SUA_CHUA">Đang sửa chữa</Option>
                         <Option value="THANH_LY">Thanh lý</Option>
                     </Select>
                     <Select
                        placeholder="Đội/Nhóm"
                        allowClear
                        style={{ width: 200 }}
                        onChange={setFilterGroup}
                     >
                         {deviceGroups.map((g) => (
                             <Option key={g.id} value={g.id}>{g.name}</Option>
                         ))}
                     </Select>
                     <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
                         Lọc
                     </Button>
                 </Space>
             </Col>
             <Col>
                 <Space>
                    {canEdit && (
                        <>
                             <Button icon={<UploadOutlined />} onClick={() => document.getElementById('upload-excel')?.click()}>
                                 Nhập Excel
                             </Button>
                             <input 
                                 id="upload-excel" 
                                 type="file" 
                                 accept=".xlsx,.xls" 
                                 hidden 
                                 onChange={(e) => e.target.files && handleUpload(e.target.files[0])} 
                             />
                        </>
                    )}
                     <Button icon={<DownloadOutlined />} onClick={handleExportExcel}>
                         Xuất Excel
                     </Button>
                    {canEdit && (
                     <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
                         Thêm mới
                     </Button>
                    )}
                 </Space>
             </Col>
         </Row>
      </Card>

      {/* 3. Table */}
      <Card bodyStyle={{ padding: 0 }} style={{ flex: 1, overflow: 'hidden' }}>
          <DevicesTable
             dataSource={devices}
             loading={loading}
             onEdit={handleEdit}
             onDelete={handleDelete}
             onView={handleView}
             canEdit={canEdit}
             canDelete={canDelete}
          />
      </Card>

      {/* Modals */}
      <DeviceForm
         open={openForm}
         initialData={selectedDevice}
         onClose={() => setOpenForm(false)}
         onSubmit={handleFormSubmit}
         loading={loading}
      />

      <DeviceDetailDrawer
         open={detailOpen}
         onClose={() => setDetailOpen(false)}
         device={detailDevice}
      />
    </Layout>
  );
};

export default DevicesManagement;
