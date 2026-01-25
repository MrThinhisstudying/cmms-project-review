import React, { useState, useEffect } from "react";
import { 
  Layout,
  Typography, 
  Button, 
  Upload, 
  Tabs, 
  Space, 
  message, 
  Pagination,
  Input
} from "antd";
import { 
  PlusOutlined, 
  UploadOutlined, 
  DownloadOutlined 
} from "@ant-design/icons";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import ListItems from "./components/ListItems";
import ManageCategoryModal from "./components/ManageCategoryModal";
import AddItemDrawer from "./components/AddItemDrawer";
import { getToken } from "../../utils/auth";
import { uploadInventory } from "../../apis/inventory";
import { exportInventoryToExcel } from "../../utils";
import { IInventoryTab, IItem } from "../../types/inventory.types";

const { Content } = Layout;
const { Title } = Typography;

export function InventoryManagementPage() {
  const { categories, items, loading, refreshAll, tabs } = useInventoryContext();
  const { user } = useAuthContext();
  
  // Tabs active key (string)
  const [activeKey, setActiveKey] = useState<string>("0"); // Default to first tab (id=0 normally 'All')

  // Pagination
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = 10;

  // Drawer / Modals
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [editData, setEditData] = useState<IItem | null>(null);

  // Search
  const [searchText, setSearchText] = useState("");

  const toggleDrawer = (open: boolean, data: IItem | null) => {
    setEditData(data);
    setOpenDrawer(open);
  };

  // Reset page when switching tabs/search
  useEffect(() => {
    setPage(1);
  }, [activeKey, searchText]);

  const handleDownload = () => {
    try {
      exportInventoryToExcel(items);
      message.success(
        items.length === 0
          ? "Đã tải file mẫu vật tư thành công"
          : "Xuất danh sách vật tư thành công"
      );
    } catch (error) {
      message.error("Xuất dữ liệu thất bại");
    }
  };

  const handleUpload = async (file: File) => {
    try {
      const token = getToken();
      const res = await uploadInventory(token, file);
      message.success(res.message || "Nhập vật tư thành công");
      await refreshAll();
    } catch (err: any) {
      message.error(err.message || "Nhập vật tư thất bại");
    }
  };

  const isAdminOrManager = user?.role === "ADMIN" || user?.role === "MANAGER" || user?.role === "admin";

  const tabItems = (Array.isArray(tabs) ? tabs : []).map((tab: IInventoryTab) => {
    let currentData = tab.data || [];
    
    // Filter by search text
    if (searchText && Array.isArray(currentData)) {
        const lower = searchText.trim().toLowerCase();
        currentData = currentData.filter(item => 
            (item?.name || "").toLowerCase().includes(lower) || 
            (item?.code || "").toLowerCase().includes(lower)
        );
    } else if (!Array.isArray(currentData)) {
        currentData = [];
    }

    const totalItems = currentData.length;
    const paginatedData = currentData.slice(
      (page - 1) * rowsPerPage,
      page * rowsPerPage
    );

    return {
      key: String(tab.id),
      label: tab.label || `Tab ${tab.id}`, 
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflow: 'auto' }}>
             <ListItems
                result={paginatedData}
                loading={loading}
                toggleDrawer={toggleDrawer}
                refreshAll={refreshAll}
             />
          </div>
          {totalItems > rowsPerPage && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px 24px', borderTop: '1px solid #f0f0f0' }}>
              <Pagination
                current={page}
                pageSize={rowsPerPage}
                total={totalItems}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>
      )
    };
  });

  return (
    <Layout style={{ height: '100%', background: '#f0f2f5', padding: 24 }}>
      <Content style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Toolbar Card */}
        <div style={{ 
            background: '#fff', 
            padding: '16px 24px', 
            borderRadius: 8, 
            marginBottom: 24,
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <Space size={16}>
             <div>
                <Title level={4} style={{ margin: 0 }}>Quản lý vật tư</Title>
             </div>
             <Input.Search 
                placeholder="Tìm kiếm theo tên / mã..." 
                allowClear 
                onSearch={val => setSearchText(val)}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 300 }}
             />
          </Space>
          
          <Space>
            {isAdminOrManager && (
              <>
                <Upload 
                  beforeUpload={(file) => {
                    handleUpload(file);
                    return false;
                  }}
                  showUploadList={false}
                  accept=".csv,.xlsx,.xls"
                >
                  <Button icon={<UploadOutlined />}>Nhập Excel</Button>
                </Upload>

                <Button icon={<DownloadOutlined />} onClick={handleDownload}>
                  Xuất Excel
                </Button>
                
                <Button onClick={() => setOpenCategoryModal(true)}>
                  Danh mục
                </Button>
                
                <Button type="primary" icon={<PlusOutlined />} onClick={() => toggleDrawer(true, null)}>
                  Thêm mới
                </Button>
              </>
            )}
          </Space>
        </div>

        {/* Content Table */}
        <div style={{ 
          background: '#fff', 
          borderRadius: 8, 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}>
          <Tabs 
            activeKey={activeKey} 
            onChange={setActiveKey} 
            items={tabItems}
            tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          />
        </div>

        {/* Modals */}
        <ManageCategoryModal
          open={openCategoryModal}
          handleClose={() => setOpenCategoryModal(false)}
          categories={categories}
        />

        <AddItemDrawer
          openDrawer={openDrawer}
          toggleDrawer={toggleDrawer}
          data={editData}
          categories={categories}
          onSaved={(payload: any) => {
            setOpenDrawer(false);
            refreshAll();
            message.success(payload?.message ?? "Lưu thành công");
          }}
          onError={(payload: any) => {
            message.error(payload?.message ?? "Có lỗi xảy ra");
          }}
        />

      </Content>
    </Layout>
  );
}
