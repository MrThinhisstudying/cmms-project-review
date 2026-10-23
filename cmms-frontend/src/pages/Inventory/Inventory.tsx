import React, { useState, useEffect, useMemo } from "react";
import {
  Layout,
  Typography,
  Button,
  Upload,
  Tabs,
  Space,
  message,
  Pagination,
  Input,
  Select,
  Row,
  Col,
  Card,
} from "antd";
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  InboxOutlined,
  DollarOutlined,
  AlertOutlined,
  CloseCircleOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import ListItems from "./components/ListItems";
import ManageCategoryModal from "./components/ManageCategoryModal";
import AddItemDrawer from "./components/AddItemDrawer";
import ItemDetailModal from "./components/ItemDetailModal";
import QuickRestockModal from "./components/QuickRestockModal";
import { getToken } from "../../utils/auth";
import { uploadInventory } from "../../apis/inventory";
import { exportInventoryToExcel } from "../../utils";
import { IInventoryTab, IItem } from "../../types/inventory.types";
import { useRefreshOnFocus } from "../../hooks/useRefreshOnFocus";

const { Content } = Layout;
const { Text } = Typography;

export function InventoryManagementPage() {
  const { categories, items, loading, refreshAll, tabs } = useInventoryContext();
  const { user } = useAuthContext();

  useRefreshOnFocus(refreshAll);

  // Tabs active key (Category tab ID, '0' = All)
  const [activeKey, setActiveKey] = useState<string>("0");

  // Filters State
  const [searchText, setSearchText] = useState("");
  const [filterStockStatus, setFilterStockStatus] = useState<"all" | "out_of_stock" | "low_stock" | "in_stock">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Pagination
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = 10;

  // Drawer & Modals State
  const [openDrawer, setOpenDrawer] = useState(false);
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [editData, setEditData] = useState<IItem | null>(null);

  // Quick Restock & Item Detail Modals
  const [restockItem, setRestockItem] = useState<IItem | null>(null);
  const [detailItem, setDetailItem] = useState<IItem | null>(null);

  const toggleDrawer = (open: boolean, data: IItem | null) => {
    setEditData(data);
    setOpenDrawer(open);
  };

  // Reset page when any filter changes
  useEffect(() => {
    setPage(1);
  }, [activeKey, searchText, filterStockStatus, filterCategory]);

  // Sync category tab with dropdown filter if needed
  const handleTabChange = (key: string) => {
    setActiveKey(key);
    setFilterCategory("all"); // Reset extra category dropdown to avoid conflicts
  };

  // --- STATS CALCULATION ---
  const inventoryStats = useMemo(() => {
    const totalItems = items.length;
    const totalValuation = items.reduce(
      (sum, it) => sum + (it.quantity > 0 ? it.quantity * (it.price || 0) : 0),
      0
    );
    const outOfStockCount = items.filter((it) => (it.quantity ?? 0) <= 0).length;
    const lowStockCount = items.filter(
      (it) => (it.quantity ?? 0) > 0 && (it.quantity ?? 0) <= 10
    ).length;
    const inStockCount = items.filter((it) => (it.quantity ?? 0) > 10).length;

    return {
      totalItems,
      totalValuation,
      outOfStockCount,
      lowStockCount,
      inStockCount,
    };
  }, [items]);

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

  const isAdminOrManager =
    user?.role === "ADMIN" ||
    user?.role === "MANAGER" ||
    user?.role === "admin" ||
    user?.role === "DIRECTOR" ||
    user?.role === "UNIT_HEAD";

  // --- FILTERED DATA PIPELINE ---
  const filteredData = useMemo(() => {
    let list = [...items];

    // 1. Tab category filter
    if (activeKey !== "0") {
      list = list.filter((it) => String(it.category?.id) === activeKey);
    }

    // 2. Extra Category dropdown filter (if not 'all')
    if (filterCategory !== "all") {
      if (filterCategory === "unclassified") {
        list = list.filter((it) => !it.category || !it.category.id);
      } else {
        list = list.filter((it) => String(it.category?.id) === filterCategory);
      }
    }

    // 3. Stock status filter
    if (filterStockStatus === "out_of_stock") {
      list = list.filter((it) => (it.quantity ?? 0) <= 0);
    } else if (filterStockStatus === "low_stock") {
      list = list.filter((it) => (it.quantity ?? 0) > 0 && (it.quantity ?? 0) <= 10);
    } else if (filterStockStatus === "in_stock") {
      list = list.filter((it) => (it.quantity ?? 0) > 10);
    }

    // 4. Search text (name, code, info)
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (it) =>
          (it?.name || "").toLowerCase().includes(q) ||
          (it?.code || "").toLowerCase().includes(q) ||
          (it?.info || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [items, activeKey, filterCategory, filterStockStatus, searchText]);

  const totalFilteredCount = filteredData.length;
  const paginatedData = useMemo(() => {
    return filteredData.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  }, [filteredData, page, rowsPerPage]);

  const hasActiveFilters =
    searchText || filterStockStatus !== "all" || filterCategory !== "all" || activeKey !== "0";

  const handleResetFilters = () => {
    setSearchText("");
    setFilterStockStatus("all");
    setFilterCategory("all");
    setActiveKey("0");
  };

  // Build Tab Items for Category Bar
  const tabItems = useMemo(() => {
    const list = Array.isArray(tabs) ? tabs : [];
    return list.map((tab: IInventoryTab) => ({
      key: String(tab.id),
      label: tab.label || `Danh mục ${tab.id}`,
    }));
  }, [tabs]);

  return (
    <Layout style={{ minHeight: "100%", background: "#f8fafc", padding: "20px 24px 36px" }}>
      <Content style={{ display: "flex", flexDirection: "column" }}>
        {/* ============================================================ */}
        {/* 1. INVENTORY METRICS KPI STRIP */}
        {/* ============================================================ */}
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          {/* Card 1: Tổng SKU */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              onClick={handleResetFilters}
              style={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                borderTop: "4px solid #4f46e5",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
              styles={{ body: { padding: "16px 18px" } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    TỔNG MẶT HÀNG (SKU)
                  </Text>
                  <div style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", margin: "4px 0 2px" }}>
                    {inventoryStats.totalItems}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    {categories.length} danh mục phân loại
                  </div>
                </div>
                <div
                  style={{
                    background: "#eef2ff",
                    color: "#4f46e5",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  <InboxOutlined />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 2: Tổng Giá trị Kho Tạm tính */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                borderTop: "4px solid #10b981",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              }}
              styles={{ body: { padding: "16px 18px" } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    GIÁ TRỊ TỒN KHO TẠM TÍNH
                  </Text>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981", margin: "4px 0 2px" }}>
                    {inventoryStats.totalValuation > 0
                      ? `${inventoryStats.totalValuation.toLocaleString("vi-VN")} đ`
                      : "0 đ"}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Tổng thành tiền phụ tùng tại kho
                  </div>
                </div>
                <div
                  style={{
                    background: "#ecfdf5",
                    color: "#10b981",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  <DollarOutlined />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 3: Cảnh báo Hết hàng */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              onClick={() => setFilterStockStatus("out_of_stock")}
              style={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                borderTop: inventoryStats.outOfStockCount > 0 ? "4px solid #ef4444" : "4px solid #94a3b8",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                background: filterStockStatus === "out_of_stock" ? "#fff1f2" : "#fff",
              }}
              styles={{ body: { padding: "16px 18px" } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    MẶT HÀNG HẾT HÀNG (0)
                  </Text>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: inventoryStats.outOfStockCount > 0 ? "#ef4444" : "#0f172a",
                      margin: "4px 0 2px",
                    }}
                  >
                    {inventoryStats.outOfStockCount}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Cần đề xuất mua sắm bổ sung gấp
                  </div>
                </div>
                <div
                  style={{
                    background: inventoryStats.outOfStockCount > 0 ? "#fee2e2" : "#f1f5f9",
                    color: inventoryStats.outOfStockCount > 0 ? "#ef4444" : "#64748b",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  <CloseCircleOutlined />
                </div>
              </div>
            </Card>
          </Col>

          {/* Card 4: Cảnh báo Sắp hết (<= 10) */}
          <Col xs={24} sm={12} lg={6}>
            <Card
              hoverable
              onClick={() => setFilterStockStatus("low_stock")}
              style={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                borderTop: inventoryStats.lowStockCount > 0 ? "4px solid #f59e0b" : "4px solid #94a3b8",
                boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                background: filterStockStatus === "low_stock" ? "#fffbeb" : "#fff",
              }}
              styles={{ body: { padding: "16px 18px" } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, color: "#64748b" }}>
                    DƯỚI ĐỊNH MỨC AN TOÀN
                  </Text>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: inventoryStats.lowStockCount > 0 ? "#d97706" : "#0f172a",
                      margin: "4px 0 2px",
                    }}
                  >
                    {inventoryStats.lowStockCount}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>
                    Tồn kho dưới ngưỡng an toàn (≤ 10)
                  </div>
                </div>
                <div
                  style={{
                    background: inventoryStats.lowStockCount > 0 ? "#fef3c7" : "#f1f5f9",
                    color: inventoryStats.lowStockCount > 0 ? "#d97706" : "#64748b",
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                  }}
                >
                  <AlertOutlined />
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* ============================================================ */}
        {/* 2. SMART TOOLBAR & ACTION HEADER */}
        {/* ============================================================ */}
        <div
          style={{
            background: "#fff",
            padding: "16px 20px",
            borderRadius: 12,
            marginBottom: 16,
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Left: Filters */}
          <Space wrap size={10}>
            <Input.Search
              placeholder="Tìm theo tên, mã phụ tùng, mô tả..."
              allowClear
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 260 }}
            />

            <Select
              value={filterStockStatus}
              onChange={setFilterStockStatus}
              style={{ width: 175 }}
              options={[
                { value: "all", label: "Tất cả trạng thái tồn" },
                { value: "out_of_stock", label: "🔴 Hết hàng (0)" },
                { value: "low_stock", label: "⚠️ Sắp hết (≤ 10)" },
                { value: "in_stock", label: "🟢 Đủ hàng (> 10)" },
              ]}
            />

            <Select
              value={filterCategory}
              onChange={setFilterCategory}
              style={{ width: 180 }}
              placeholder="Lọc danh mục"
              options={[
                { value: "all", label: "Tất cả danh mục" },
                { value: "unclassified", label: "Chưa phân loại" },
                ...categories.map((c) => ({ value: String(c.id), label: c.name })),
              ]}
            />

            {hasActiveFilters && (
              <Button type="link" onClick={handleResetFilters} style={{ padding: "0 4px", fontSize: 13 }}>
                Đặt lại bộ lọc
              </Button>
            )}
          </Space>

          {/* Right: Actions */}
          <Space wrap size={10}>
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

                <Button icon={<FolderOpenOutlined />} onClick={() => setOpenCategoryModal(true)}>
                  Quản lý danh mục
                </Button>

                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => toggleDrawer(true, null)}
                  style={{ background: "#2563eb", borderColor: "#2563eb", fontWeight: 600 }}
                >
                  Thêm vật tư
                </Button>
              </>
            )}
          </Space>
        </div>

        {/* ============================================================ */}
        {/* 3. CATEGORY TABS & INVENTORY TABLE */}
        {/* ============================================================ */}
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            border: "1px solid #e2e8f0",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          {/* Category Tabs Bar */}
          <Tabs
            activeKey={activeKey}
            onChange={handleTabChange}
            items={tabItems}
            tabBarStyle={{ padding: "0 20px", marginBottom: 0 }}
          />

          {/* Results Summary Info Bar */}
          <div
            style={{
              padding: "10px 20px",
              background: "#f8fafc",
              borderBottom: "1px solid #f1f5f9",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 13,
              color: "#64748b",
            }}
          >
            <div>
              Hiển thị <b>{paginatedData.length}</b> / <b>{totalFilteredCount}</b> mặt hàng
              {hasActiveFilters && <span> (đang áp dụng bộ lọc)</span>}
            </div>
            <div>
              Trang {page} / {Math.ceil(totalFilteredCount / rowsPerPage) || 1}
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflow: "auto" }}>
            <ListItems
              result={paginatedData}
              loading={loading}
              toggleDrawer={toggleDrawer}
              onQuickRestock={(item) => setRestockItem(item)}
              onViewDetail={(item) => setDetailItem(item)}
              refreshAll={refreshAll}
            />
          </div>

          {/* Pagination */}
          {totalFilteredCount > rowsPerPage && (
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 20px",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <div style={{ fontSize: 13, color: "#64748b" }}>
                Tổng cộng <b>{totalFilteredCount}</b> mặt hàng phụ tùng
              </div>
              <Pagination
                current={page}
                pageSize={rowsPerPage}
                total={totalFilteredCount}
                onChange={(p) => setPage(p)}
                showSizeChanger={false}
              />
            </div>
          )}
        </div>

        {/* ============================================================ */}
        {/* 4. MODALS & DRAWERS */}
        {/* ============================================================ */}
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

        {/* Quick Restock Modal */}
        <QuickRestockModal
          open={Boolean(restockItem)}
          item={restockItem}
          onClose={() => setRestockItem(null)}
          onSuccess={() => {
            refreshAll();
          }}
        />

        {/* Item Detail & Transaction History Modal (Thẻ kho) */}
        <ItemDetailModal
          open={Boolean(detailItem)}
          item={detailItem}
          onClose={() => setDetailItem(null)}
        />
      </Content>
    </Layout>
  );
}
export default InventoryManagementPage;
