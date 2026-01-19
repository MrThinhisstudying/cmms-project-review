import React, { useEffect } from "react";
import { 
  Row, 
  Col, 
  Card, 
  Typography, 
  Button, 
  Space, 
  Table, 
  Tag, 
  Tabs
} from "antd";
import { 
  CodeSandboxOutlined, 
  ArrowRightOutlined,
  PlusOutlined,
  CarOutlined,
  ToolOutlined,
  FileTextOutlined,
  CalendarOutlined
} from "@ant-design/icons";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import { useRepairsContext } from "../../context/RepairsContext/RepairsContext";
import { useMaintenanceContext } from "../../context/MaintenanceContext/MaintenanceContext";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const Dashboard = () => {
  const { user } = useAuthContext();
  const { items, stockOuts, refreshAll } = useInventoryContext();
  const { devices, fetchDevices } = useDevicesContext();
  const { repairs, reload: reloadRepairs } = useRepairsContext();
  const { maintenances } = useMaintenanceContext();
  const navigate = useNavigate();
  
  useEffect(() => {
    refreshAll();
    fetchDevices();
    reloadRepairs();
  }, [refreshAll, fetchDevices, reloadRepairs]);

  // --- Stats Calculation ---
  const pendingRepairs = repairs.filter((r: any) => r.status === 'PENDING' || r.status === 'IN_PROGRESS').length;
  const totalDevices = devices.length;
  const maintenancePlans = maintenances.length;

  const recentRepairs = repairs.slice(0, 5);
  const recentStockOuts = stockOuts.slice(0, 5);

  const stats = [
    {
      title: "Phiếu sửa chữa đang xử lý",
      value: pendingRepairs,
      icon: <ToolOutlined style={{ fontSize: 24, color: '#fa8c16' }} />,
      color: "#fff7e6",
      link: "/quan_ly_sua_chua"
    },
    {
      title: "Tổng số phương tiện/thiết bị",
      value: totalDevices,
      icon: <CarOutlined style={{ fontSize: 24, color: '#1890ff' }} />,
      color: "#e6f7ff",
      link: "/quan_ly_ttb_pt"
    },
    {
      title: "Kế hoạch bảo dưỡng",
      value: maintenancePlans,
      icon: <CalendarOutlined style={{ fontSize: 24, color: '#52c41a' }} />,
      color: "#f6ffed",
      link: "/quan_ly_bao_duong"
    },
  ];

  const repairColumns = [
    {
      title: 'Thiết bị',
      dataIndex: ['device', 'name'],
      key: 'device_name',
    },
    {
      title: 'Biển số',
      dataIndex: ['device', 'reg_number'],
      key: 'reg_number',
      render: (text: string) => text || '---'
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '---'
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status_request',
      key: 'status',
      render: (status: string) => {
          let label = status;
          let color = 'default';
          
          if (status === 'COMPLETED') {
            label = 'Hoàn thành';
            color = 'success';
          } else if (status.includes('WAITING') || status === 'PENDING') {
            label = 'Đang xử lý';
            color = 'processing';
          } else if (status.includes('REJECTED')) {
             label = 'Đã từ chối';
             color = 'error';
          }
          
          return <Tag color={color}>{label}</Tag>
      }
    }
  ];

  const stockOutColumns = [
    {
      title: 'Vật tư',
      dataIndex: ['item', 'name'],
      key: 'item',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (q: number, record: any) => `${q} ${record.item?.quantity_unit || ''}`
    },
    {
      title: 'Người yêu cầu',
      dataIndex: ['requested_by', 'name'],
      key: 'requester',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = status === 'APPROVED' ? 'success' : status === 'PENDING' ? 'warning' : 'default';
        const label = status === 'APPROVED' ? 'Đã duyệt' : status === 'PENDING' ? 'Chờ duyệt' : status;
        return <Tag color={color}>{label}</Tag>;
      }
    }
  ];

  const tabItems = [
    {
      key: '1',
      label: 'Phiếu sửa chữa gần đây',
      children: <Table dataSource={recentRepairs} columns={repairColumns} pagination={false} rowKey="repair_id" size="small" />
    },
    {
      key: '2',
      label: 'Xuất kho gần đây',
      children: <Table dataSource={recentStockOuts} columns={stockOutColumns} pagination={false} rowKey="id" size="small" />
    }
  ];

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ margin: 0 }}>Xin chào, {user?.name}</Title>
        <Text type="secondary">Tổng quan hoạt động bảo trì và quản lý thiết bị</Text>
      </div>

      <Row gutter={[24, 24]}>
        {/* Stats Cards */}
        {stats.map((stat, index) => (
          <Col xs={24} sm={12} lg={8} key={index}>
            <Card bordered={false} hoverable style={{ height: '100%' }}>
              <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary">{stat.title}</Text>
                  <Title level={2} style={{ margin: '8px 0' }}>{stat.value}</Title>
                  <Link to={stat.link} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    Xem chi tiết <ArrowRightOutlined />
                  </Link>
                </div>
                <div style={{ 
                  padding: 12, 
                  borderRadius: 12, 
                  background: stat.color, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  {stat.icon}
                </div>
              </Space>
            </Card>
          </Col>
        ))}

        {/* Recent Activity Tabs */}
        <Col xs={24} lg={16}>
          <Card bordered={false}>
            <Tabs defaultActiveKey="1" items={tabItems} tabBarExtraContent={<Link to="/quan_ly_sua_chua">Xem tất cả</Link>} />
          </Card>
        </Col>

        {/* Quick Actions & System Status */}
        <Col xs={24} lg={8}>
           <Row gutter={[0, 24]}>
              <Col span={24}>
                <Card title="Phím tắt" bordered={false}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Button type="primary" block icon={<PlusOutlined />} size="large" onClick={() => navigate('/quan_ly_sua_chua')}>
                      Tạo phiếu sửa chữa
                    </Button>
                    <Button block icon={<CodeSandboxOutlined />} size="large" onClick={() => navigate('/lay_vat_tu')}>
                      Xuất vật tư nhanh
                    </Button>
                     <Button block icon={<FileTextOutlined />} size="large" onClick={() => navigate('/maintenance-procedures')}>
                      Tra cứu quy trình
                    </Button>
                    <Button block icon={<ToolOutlined />} size="large" onClick={() => navigate('/quan_ly_bao_duong')}>
                      Quản lý bảo dưỡng
                    </Button>
                    <Button block icon={<CalendarOutlined />} size="large" onClick={() => navigate('/quan_ly_bao_duong')}>
                      Lịch bảo dưỡng
                    </Button>
                  </Space>
                </Card>
              </Col>
           </Row>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
