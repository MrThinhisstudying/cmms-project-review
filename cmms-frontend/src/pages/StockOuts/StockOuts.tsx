import React, { useState, useMemo } from "react";
import {
  Layout,
  Typography,
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Space,
  message,
} from "antd";
import {
  DropboxOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  DownloadOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { useAuthContext } from "../../context/AuthContext/AuthContext";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import StockOutDetailDrawer from "./components/StockOutDetailDrawer";
import StockOutsTable from "./components/StockOutsTable";
import CreateStockOutDirectModal from "./components/CreateStockOutDirectModal";
import RepairDetailDrawer from "../RepairsManagement/components/RepairDetailDrawer";
import { getRepairById, exportRepair } from "../../apis/repairs";
import { IRepair } from "../../types/repairs.types";
import { IStockOut } from "../../types/inventory.types";

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

export default function StockOutsPage() {
  const { user } = useAuthContext();
  const { stockOuts, categories, loading, refreshAll } = useInventoryContext();

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Hồ sơ phiếu sửa chữa (Drawer xem toàn bộ)
  const [repairDrawerOpen, setRepairDrawerOpen] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<IRepair | null>(null);
  const [loadingRepair, setLoadingRepair] = useState(false);

  const handleOpenRepairDetail = async (repairId: number) => {
    try {
      setLoadingRepair(true);
      const token = localStorage.getItem("token");
      const data = await getRepairById(repairId, token);
      setSelectedRepair(data);
      setRepairDrawerOpen(true);
    } catch (err: any) {
      message.error(err?.message || "Không thể tải hồ sơ sửa chữa");
    } finally {
      setLoadingRepair(false);
    }
  };

  const handleExportRepair = async (type: "B03" | "B04" | "B05") => {
    if (!selectedRepair) return;
    const key = "export_repair_loading";
    try {
      message.loading({ content: "Đang tạo file PDF xem trước...", key });
      const token = localStorage.getItem("token");
      await exportRepair(selectedRepair.repair_id, token, type);
      message.success({ content: "Đã mở file xem trước", key, duration: 2 });
    } catch {
      message.error({ content: "Xuất file thất bại", key, duration: 2 });
    }
  };

  // Bộ lọc & Tìm kiếm
  const [searchText, setSearchText] = useState("");
  const [filterStatus, setFilterStatus] = useState<string | undefined>(undefined);
  const [filterSource, setFilterSource] = useState<string | undefined>(undefined); // "REPAIR" | "DIRECT" | undefined
  const [filterCategory, setFilterCategory] = useState<number | undefined>(undefined);

  // Thống kê nhanh theo trạng thái
  const stats = useMemo(() => {
    const total = stockOuts.length;
    const pending = stockOuts.filter((s: IStockOut) => s.status === "PENDING").length;
    const approved = stockOuts.filter((s: IStockOut) => s.status === "APPROVED").length;
    const canceled = stockOuts.filter(
      (s: IStockOut) => (s.status as string) === "CANCELED" || (s.status as string) === "CANCELLED"
    ).length;
    return { total, pending, approved, canceled };
  }, [stockOuts]);

  // Danh sách sau khi lọc
  const filteredStockOuts = useMemo(() => {
    return stockOuts.filter((so: IStockOut) => {
      // 1. Lọc theo trạng thái
      if (filterStatus) {
        const s = String(so.status ?? "").toUpperCase();
        if (filterStatus === "CANCELED") {
          if (s !== "CANCELED" && s !== "CANCELLED") return false;
        } else if (s !== filterStatus) {
          return false;
        }
      }

      // 2. Lọc theo nguồn gốc yêu cầu
      if (filterSource === "REPAIR" && !so.repair) return false;
      if (filterSource === "DIRECT" && Boolean(so.repair)) return false;

      // 3. Lọc theo danh mục
      if (filterCategory !== undefined && so.item?.category?.id !== filterCategory) {
        return false;
      }

      // 4. Lọc theo từ khóa tìm kiếm (Tên VT, Mã VT, Người yêu cầu, Mã phiếu, Phiếu SC)
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const idMatch = `#${so.id}`.toLowerCase().includes(q) || String(so.id).includes(q);
        const nameMatch = (so.item?.name || "").toLowerCase().includes(q);
        const codeMatch = (so.item?.code || "").toLowerCase().includes(q);
        const purposeMatch = (so.purpose || "").toLowerCase().includes(q);
        const noteMatch = (so.note || "").toLowerCase().includes(q);
        const repairMatch = so.repair ? String(so.repair.repair_id).includes(q) : false;

        let requesterName = "";
        if (so.requested_by && typeof so.requested_by === "object") {
          requesterName = (so.requested_by.name || so.requested_by.email || "").toLowerCase();
        } else if (so.requester_name) {
          requesterName = so.requester_name.toLowerCase();
        }
        const requesterMatch = requesterName.includes(q);

        if (
          !idMatch &&
          !nameMatch &&
          !codeMatch &&
          !purposeMatch &&
          !noteMatch &&
          !repairMatch &&
          !requesterMatch
        ) {
          return false;
        }
      }

      return true;
    });
  }, [stockOuts, filterStatus, filterSource, filterCategory, searchText]);

  const handleDetail = (so: IStockOut) => {
    setDetailId(so.id ?? null);
    setDetailOpen(true);
  };

  const handleRefresh = () => {
    refreshAll();
    message.success("Đã làm mới dữ liệu xuất kho");
  };

  // Xuất file Excel báo cáo xuất kho
  const handleExportExcel = () => {
    try {
      if (filteredStockOuts.length === 0) {
        message.warning("Không có dữ liệu để xuất Excel");
        return;
      }

      const rows = filteredStockOuts.map((so: IStockOut, index: number) => {
        let requesterName = "—";
        if (so.requested_by && typeof so.requested_by === "object") {
          requesterName = so.requested_by.name || so.requested_by.email || "—";
        } else if (so.requester_name) {
          requesterName = so.requester_name;
        }

        let approverName = "—";
        if (so.approved_by && typeof so.approved_by === "object") {
          approverName = so.approved_by.name || so.approved_by.email || "—";
        }

        const statusMap: Record<string, string> = {
          PENDING: "Chờ phê duyệt",
          APPROVED: "Đã xuất kho",
          CANCELED: "Đã từ chối / Hủy",
          CANCELLED: "Đã từ chối / Hủy",
        };

        return {
          STT: index + 1,
          "Mã phiếu": `#SO-${so.id}`,
          "Tên vật tư / Phụ tùng": so.item?.name || "—",
          "Mã vật tư": so.item?.code || "—",
          "Danh mục": so.item?.category?.name || "Chưa phân loại",
          "Số lượng xuất": so.quantity ?? 1,
          "Đơn vị tính": so.item?.quantity_unit || "Cái",
          "Tồn kho hiện tại": so.item?.quantity ?? 0,
          "Người yêu cầu": requesterName,
          "Người phê duyệt": approverName,
          "Mục đích": so.purpose || "—",
          "Ghi chú": so.note || "—",
          "Phiếu sửa chữa": so.repair ? `#${so.repair.repair_id}` : "Không (Xuất độc lập)",
          "Trạng thái": statusMap[String(so.status ?? "").toUpperCase()] || so.status,
          "Thời gian tạo": so.created_at ? dayjs(so.created_at).format("HH:mm DD/MM/YYYY") : "—",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [
        { wch: 6 },  // STT
        { wch: 12 }, // Mã phiếu
        { wch: 30 }, // Tên VT
        { wch: 14 }, // Mã VT
        { wch: 18 }, // Danh mục
        { wch: 14 }, // Số lượng xuất
        { wch: 10 }, // ĐVT
        { wch: 16 }, // Tồn kho
        { wch: 22 }, // Người yêu cầu
        { wch: 22 }, // Người duyệt
        { wch: 26 }, // Mục đích
        { wch: 20 }, // Ghi chú
        { wch: 18 }, // Phiếu SC
        { wch: 18 }, // Trạng thái
        { wch: 20 }, // Thời gian tạo
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Yeu_Cau_Xuat_Kho");
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
      const dataBlob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      saveAs(dataBlob, `Bao_Cao_Xuat_Vat_Tu_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`);
      message.success("Xuất file Excel thành công!");
    } catch (err) {
      console.error(err);
      message.error("Lỗi khi xuất file Excel");
    }
  };

  return (
    <Content style={{ padding: "20px 24px", minHeight: "100%", background: "#f8fafc" }}>
      {/* ── 1. Top Header ── */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Title level={3} style={{ margin: 0, fontWeight: 700, color: "#0f172a" }}>
            Quản lý Yêu cầu Xuất kho & Cấp phát Vật tư
          </Title>
          <Text type="secondary" style={{ fontSize: 13, color: "#64748b" }}>
            Kiểm soát vòng đời phê duyệt xuất kho, đối chiếu tồn kho và cấp phát phụ tùng phương tiện sân bay
          </Text>
        </div>

        <Space wrap>
          <Button
            icon={<ReloadOutlined />}
            onClick={handleRefresh}
            loading={loading}
            style={{ borderRadius: 8, borderColor: "#cbd5e1" }}
          >
            Làm mới
          </Button>

          <Button
            icon={<DownloadOutlined />}
            onClick={handleExportExcel}
            style={{ borderRadius: 8, borderColor: "#cbd5e1" }}
          >
            Xuất Excel
          </Button>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalOpen(true)}
            style={{
              borderRadius: 8,
              fontWeight: 600,
              background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
              border: "none",
              boxShadow: "0 4px 12px rgba(22, 119, 255, 0.3)",
            }}
          >
            + Tạo yêu cầu xuất
          </Button>
        </Space>
      </div>

      {/* ── 2. Cụm 4 Thẻ KPI Tương tác 3D ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 18 }}>
        {/* Tất cả */}
        <Col xl={6} md={6} sm={12} xs={24}>
          <div
            onClick={() => setFilterStatus(undefined)}
            style={{
              cursor: "pointer",
              borderRadius: 12,
              background:
                filterStatus === undefined
                  ? "linear-gradient(135deg, #eff6ff 0%, #ffffff 100%)"
                  : "#ffffff",
              border:
                filterStatus === undefined ? "2px solid #2563eb" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === undefined
                  ? "0 8px 20px rgba(37, 99, 235, 0.15)"
                  : "0 2px 6px rgba(0,0,0,0.02)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.25s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 22,
                boxShadow: "0 4px 10px rgba(30, 41, 59, 0.25)",
                flexShrink: 0,
              }}
            >
              <DropboxOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#64748b",
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Tất cả yêu cầu
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginTop: 2 }}>
                {stats.total}
              </div>
            </div>
            {filterStatus === undefined && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 0,
                  height: 0,
                  borderStyle: "solid",
                  borderWidth: "0 28px 28px 0",
                  borderColor: "transparent #2563eb transparent transparent",
                }}
              />
            )}
          </div>
        </Col>

        {/* Chờ duyệt */}
        <Col xl={6} md={6} sm={12} xs={24}>
          <div
            onClick={() => setFilterStatus("PENDING")}
            style={{
              cursor: "pointer",
              borderRadius: 12,
              background:
                filterStatus === "PENDING"
                  ? "linear-gradient(135deg, #fffbeb 0%, #ffffff 100%)"
                  : "#ffffff",
              border:
                filterStatus === "PENDING" ? "2px solid #d97706" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === "PENDING"
                  ? "0 8px 20px rgba(217, 119, 6, 0.15)"
                  : "0 2px 6px rgba(0,0,0,0.02)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.25s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 22,
                boxShadow: "0 4px 10px rgba(217, 119, 6, 0.25)",
                flexShrink: 0,
              }}
            >
              <ClockCircleOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#d97706",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Chờ phê duyệt
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#b45309", marginTop: 2 }}>
                {stats.pending}
              </div>
            </div>
            {filterStatus === "PENDING" && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 0,
                  height: 0,
                  borderStyle: "solid",
                  borderWidth: "0 28px 28px 0",
                  borderColor: "transparent #d97706 transparent transparent",
                }}
              />
            )}
          </div>
        </Col>

        {/* Đã xuất kho */}
        <Col xl={6} md={6} sm={12} xs={24}>
          <div
            onClick={() => setFilterStatus("APPROVED")}
            style={{
              cursor: "pointer",
              borderRadius: 12,
              background:
                filterStatus === "APPROVED"
                  ? "linear-gradient(135deg, #ecfdf5 0%, #ffffff 100%)"
                  : "#ffffff",
              border:
                filterStatus === "APPROVED" ? "2px solid #059669" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === "APPROVED"
                  ? "0 8px 20px rgba(5, 150, 105, 0.15)"
                  : "0 2px 6px rgba(0,0,0,0.02)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.25s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 22,
                boxShadow: "0 4px 10px rgba(5, 150, 105, 0.25)",
                flexShrink: 0,
              }}
            >
              <CheckCircleOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#059669",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Đã xuất kho
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#065f46", marginTop: 2 }}>
                {stats.approved}
              </div>
            </div>
            {filterStatus === "APPROVED" && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 0,
                  height: 0,
                  borderStyle: "solid",
                  borderWidth: "0 28px 28px 0",
                  borderColor: "transparent #059669 transparent transparent",
                }}
              />
            )}
          </div>
        </Col>

        {/* Đã từ chối / Hủy */}
        <Col xl={6} md={6} sm={12} xs={24}>
          <div
            onClick={() => setFilterStatus("CANCELED")}
            style={{
              cursor: "pointer",
              borderRadius: 12,
              background:
                filterStatus === "CANCELED"
                  ? "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)"
                  : "#ffffff",
              border:
                filterStatus === "CANCELED" ? "2px solid #dc2626" : "1px solid #e2e8f0",
              boxShadow:
                filterStatus === "CANCELED"
                  ? "0 8px 20px rgba(220, 38, 38, 0.15)"
                  : "0 2px 6px rgba(0,0,0,0.02)",
              padding: "16px 20px",
              display: "flex",
              alignItems: "center",
              gap: 16,
              transition: "all 0.25s ease",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 22,
                boxShadow: "0 4px 10px rgba(220, 38, 38, 0.25)",
                flexShrink: 0,
              }}
            >
              <CloseCircleOutlined />
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  color: "#dc2626",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Đã từ chối / Hủy
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#991b1b", marginTop: 2 }}>
                {stats.canceled}
              </div>
            </div>
            {filterStatus === "CANCELED" && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  width: 0,
                  height: 0,
                  borderStyle: "solid",
                  borderWidth: "0 28px 28px 0",
                  borderColor: "transparent #dc2626 transparent transparent",
                }}
              />
            )}
          </div>
        </Col>
      </Row>

      {/* ── 3. Toolbar Lọc & Tìm kiếm ── */}
      <Card
        variant="borderless"
        style={{
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
          marginBottom: 16,
        }}
        styles={{ body: { padding: "14px 18px" } }}
      >
        <Row gutter={[12, 12]} align="middle" justify="space-between">
          <Col xl={16} lg={18} md={24} xs={24}>
            <Space wrap size={10}>
              <Input
                placeholder="Tìm tên vật tư, mã VT, người yêu cầu, phiếu SC..."
                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                allowClear
                style={{ width: 280, borderRadius: 8 }}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

              <Select
                placeholder="Tất cả trạng thái"
                allowClear
                style={{ width: 160, borderRadius: 8 }}
                value={filterStatus}
                onChange={(val) => setFilterStatus(val)}
              >
                <Option value="PENDING">Chờ duyệt</Option>
                <Option value="APPROVED">Đã xuất kho</Option>
                <Option value="CANCELED">Đã từ chối / Hủy</Option>
              </Select>

              <Select
                placeholder="Nguồn gốc yêu cầu"
                allowClear
                style={{ width: 170, borderRadius: 8 }}
                value={filterSource}
                onChange={(val) => setFilterSource(val)}
              >
                <Option value="REPAIR">Từ Phiếu sửa chữa</Option>
                <Option value="DIRECT">Xuất độc lập</Option>
              </Select>

              <Select
                placeholder="Danh mục vật tư"
                allowClear
                showSearch
                optionFilterProp="children"
                style={{ width: 170, borderRadius: 8 }}
                value={filterCategory}
                onChange={(val) => setFilterCategory(val)}
              >
                {categories.map((cat: any) => (
                  <Option key={cat.id} value={cat.id}>
                    {cat.name}
                  </Option>
                ))}
              </Select>

              {(searchText || filterStatus || filterSource || filterCategory) && (
                <Button
                  onClick={() => {
                    setSearchText("");
                    setFilterStatus(undefined);
                    setFilterSource(undefined);
                    setFilterCategory(undefined);
                  }}
                  style={{ borderRadius: 8 }}
                >
                  Xóa lọc
                </Button>
              )}
            </Space>
          </Col>

          <Col xl={8} lg={6} md={24} xs={24} style={{ textAlign: "right" }}>
            <span style={{ fontSize: 13, color: "#64748b" }}>
              Hiển thị <b>{filteredStockOuts.length}</b> / {stockOuts.length} yêu cầu
            </span>
          </Col>
        </Row>
      </Card>

      {/* ── 4. Bảng Danh sách xuất kho ── */}
      <Card
        variant="borderless"
        style={{
          borderRadius: 12,
          border: "1px solid #e2e8f0",
          overflow: "hidden",
          boxShadow: "0 2px 6px rgba(0,0,0,0.02)",
        }}
        styles={{ body: { padding: 0 } }}
      >
        <StockOutsTable
          data={filteredStockOuts}
          loading={loading}
          onDetail={handleDetail}
          onOpenRepairDetail={handleOpenRepairDetail}
          onSuccess={refreshAll}
          onError={() => {}}
        />
      </Card>

      {/* ── 5. Drawer Chi tiết Xuất kho ── */}
      <StockOutDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        stockOutId={detailId ?? undefined}
        onOpenRepairDetail={handleOpenRepairDetail}
        onActionSuccess={refreshAll}
      />

      {/* ── 6. Modal Tạo yêu cầu xuất mới ── */}
      <CreateStockOutDirectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={refreshAll}
      />

      {/* ── 7. Drawer Chi tiết Phiếu Sửa Chữa (Toàn bộ hồ sơ B03, B04, B05) ── */}
      <RepairDetailDrawer
        open={repairDrawerOpen}
        data={selectedRepair}
        onClose={() => {
          setRepairDrawerOpen(false);
          setSelectedRepair(null);
        }}
        onExport={handleExportRepair}
        canExport={true}
        currentUser={user}
      />
    </Content>
  );
}
