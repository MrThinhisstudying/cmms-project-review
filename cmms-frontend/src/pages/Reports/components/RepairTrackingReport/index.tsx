import React, { useState, useEffect, useMemo, useCallback } from "react";
import { message } from "antd";
import dayjs, { Dayjs } from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { RepairTrackingFilter } from "./RepairTrackingFilter";
import { RepairTrackingTable } from "./RepairTrackingTable";
import { RepairTrackingPreviewModal } from "./RepairTrackingPreviewModal";
import { VehiclePickerModal } from "./VehiclePickerModal";
import { generateRepairTrackingHtml } from "./generateReportHtml";
import { IRepairTrackingRow, TimeRangePreset, DeviceFilterMode } from "./types";
import { getAllRepairs } from "../../../../apis/repairs";
import { getDeviceGroups, IDeviceGroup } from "../../../../apis/device-groups";
import { getAllDevices } from "../../../../apis/devices";
import { exportReportPdf } from "../../../../apis/reports";
import { getToken } from "../../../../utils/auth";
import { IRepair } from "../../../../types/repairs.types";
import { IDevice } from "../../../../types/devicesManagement.types";

dayjs.extend(isBetween);

export const RepairTrackingReport: React.FC = () => {
  const token = getToken();

  // Filters state
  const [timePreset, setTimePreset] = useState<TimeRangePreset>("12_MONTHS");
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs]>([
    dayjs().subtract(12, "month").startOf("day"),
    dayjs().endOf("day"),
  ]);

  const [deviceFilterMode, setDeviceFilterMode] =
    useState<DeviceFilterMode>("GROUP");
  const [selectedGroupId, setSelectedGroupId] = useState<number | "ALL">("ALL");
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<number[]>([]);

  // Modals state
  const [vehiclePickerOpen, setVehiclePickerOpen] = useState<boolean>(false);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);

  // Raw data
  const [loading, setLoading] = useState<boolean>(false);
  const [exportingPdf, setExportingPdf] = useState<boolean>(false);
  const [repairs, setRepairs] = useState<IRepair[]>([]);
  const [deviceGroups, setDeviceGroups] = useState<IDeviceGroup[]>([]);
  const [allDevices, setAllDevices] = useState<IDevice[]>([]);

  // Time preset change handler
  const handleTimePresetChange = (preset: TimeRangePreset) => {
    setTimePreset(preset);
    const now = dayjs();
    switch (preset) {
      case "1_MONTH":
        setDateRange([now.subtract(1, "month").startOf("day"), now.endOf("day")]);
        break;
      case "3_MONTHS":
        setDateRange([now.subtract(3, "month").startOf("day"), now.endOf("day")]);
        break;
      case "6_MONTHS":
        setDateRange([now.subtract(6, "month").startOf("day"), now.endOf("day")]);
        break;
      case "12_MONTHS":
        setDateRange([now.subtract(12, "month").startOf("day"), now.endOf("day")]);
        break;
      case "CUSTOM":
        break;
    }
  };

  // Fetch initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [repairsData, groupsData, devicesData] = await Promise.all([
        getAllRepairs(token).catch((err) => {
          console.error("Fetch repairs error:", err);
          return [] as IRepair[];
        }),
        getDeviceGroups().catch((err) => {
          console.error("Fetch device groups error:", err);
          return [] as IDeviceGroup[];
        }),
        getAllDevices(token).catch((err) => {
          console.error("Fetch devices error:", err);
          return [] as IDevice[];
        }),
      ]);

      setRepairs(repairsData || []);
      setDeviceGroups(groupsData || []);
      setAllDevices(devicesData || []);
    } catch (error) {
      console.error(error);
      message.error("Lỗi khi tải dữ liệu sổ theo dõi sửa chữa");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set default selected group if available
  useEffect(() => {
    if (deviceGroups.length > 0 && selectedGroupId === "ALL") {
      const groundServiceGroup = deviceGroups.find((g) =>
        g.name.toLowerCase().includes("mặt đất")
      );
      if (groundServiceGroup) {
        setSelectedGroupId(groundServiceGroup.id);
      }
    }
  }, [deviceGroups, selectedGroupId]);

  // Group devices lookup map
  const groupDeviceIdsMap = useMemo(() => {
    const map = new Map<number, Set<number>>();
    deviceGroups.forEach((group) => {
      const idSet = new Set<number>();
      if (group.devices && Array.isArray(group.devices)) {
        group.devices.forEach((d: any) => {
          if (d.device_id) idSet.add(d.device_id);
        });
      }
      map.set(group.id, idSet);
    });
    return map;
  }, [deviceGroups]);

  // Filter repairs
  const filteredRepairs = useMemo(() => {
    return repairs.filter((repair) => {
      // 1. Time filter
      if (!repair.created_at) return false;
      const createdAt = dayjs(repair.created_at);
      const isWithinDate =
        createdAt.isAfter(dateRange[0].startOf("day")) &&
        createdAt.isBefore(dateRange[1].endOf("day"));

      if (!isWithinDate) return false;

      const deviceId = repair.device?.device_id;
      if (!deviceId) return true;

      // 2. Scope filter
      if (deviceFilterMode === "GROUP") {
        if (selectedGroupId === "ALL") return true;
        const validGroupIds = groupDeviceIdsMap.get(selectedGroupId);
        if (validGroupIds && validGroupIds.has(deviceId)) return true;
        if ((repair.device as any)?.group_id === selectedGroupId) return true;
        return false;
      } else {
        // CUSTOM_DEVICES
        if (selectedDeviceIds.length === 0) return true;
        return selectedDeviceIds.includes(deviceId);
      }
    });
  }, [
    repairs,
    dateRange,
    deviceFilterMode,
    selectedGroupId,
    selectedDeviceIds,
    groupDeviceIdsMap,
  ]);

  // Map to 9-column rows
  const rows: IRepairTrackingRow[] = useMemo(() => {
    return filteredRepairs.map((repair, idx) => {
      const deviceName = repair.device?.name || "Thiết bị kỹ thuật";
      const regNumber =
        repair.device?.reg_number || repair.device?.device_code || "-";

      const breakdownDate = repair.created_at
        ? dayjs(repair.created_at).format("DD/MM/YYYY")
        : "-";

      // Extract repair description / solution
      const inspectionSolutions = (repair.inspection_items || [])
        .map((i) => i.solution || i.description)
        .filter(Boolean);

      const replacedParts = (repair.stock_outs || [])
        .map((so: any) => so.item?.name)
        .filter(Boolean);

      let repairContent = "";
      if (inspectionSolutions.length > 0) {
        repairContent = inspectionSolutions.join("; ");
        if (replacedParts.length > 0) {
          repairContent += ` (Vật tư: ${replacedParts.join(", ")})`;
        }
      } else if (replacedParts.length > 0) {
        repairContent = `Thay thế: ${replacedParts.join(", ")}`;
      } else {
        repairContent =
          repair.failure_description ||
          repair.description_defect ||
          repair.location_issue ||
          repair.recommendation ||
          "Sửa chữa, khắc phục hư hỏng thiết bị";
      }

      // Completion Date
      const isCompleted =
        repair.status_request === "COMPLETED" ||
        repair.status_acceptance === "acceptance_admin_approved";

      let completionDate = "";
      if (isCompleted) {
        if (repair.acceptance_approved_at) {
          completionDate = dayjs(repair.acceptance_approved_at).format("DD/MM/YYYY");
        } else if (repair.inspection_approved_at) {
          completionDate = dayjs(repair.inspection_approved_at).format("DD/MM/YYYY");
        } else if (repair.created_at) {
          completionDate = dayjs(repair.created_at).add(2, "day").format("DD/MM/YYYY");
        }
      }

      // Repair unit
      const repairUnit = "Đội Kỹ thuật";

      // Operating unit
      const operatingUnit =
        repair.created_department?.name ||
        (repair.device as any)?.using_department ||
        "Đội PV Mặt Đất";

      // Result
      let result = "Đang sửa chữa";
      if (isCompleted) {
        result = "Đạt";
      } else if (repair.status_request === "WAITING_TECH") {
        result = "Tiếp nhận";
      } else if (
        repair.status_request === "REJECTED_B03" ||
        repair.status_acceptance === "REJECTED_B05"
      ) {
        result = "Từ chối";
      }

      return {
        stt: idx + 1,
        repairId: repair.repair_id,
        deviceId: repair.device?.device_id,
        deviceName,
        regNumber,
        breakdownDate,
        repairContent,
        completionDate,
        repairUnit,
        operatingUnit,
        result,
      };
    });
  }, [filteredRepairs]);

  // Title group label
  const groupLabel = useMemo(() => {
    if (deviceFilterMode === "GROUP") {
      if (selectedGroupId === "ALL") return "Tất cả các nhóm xe";
      const targetGroup = deviceGroups.find((g) => g.id === selectedGroupId);
      return targetGroup ? `Nhóm Xe: ${targetGroup.name}` : "Nhóm Xe";
    } else {
      if (selectedDeviceIds.length === 0) return "Tất cả các xe theo nhu cầu";
      if (selectedDeviceIds.length === 1) {
        const d = allDevices.find((dev) => dev.device_id === selectedDeviceIds[0]);
        return d ? `Xe: ${d.name || ""} (${d.reg_number || ""})` : "Xe chọn lọc";
      }
      return `Danh sách xe chọn lọc (${selectedDeviceIds.length} xe)`;
    }
  }, [
    deviceFilterMode,
    selectedGroupId,
    deviceGroups,
    selectedDeviceIds,
    allDevices,
  ]);

  const periodText = `Từ ${dateRange[0].format("DD/MM/YYYY")} đến ${dateRange[1].format("DD/MM/YYYY")}`;
  const reportYear = dateRange[1].year();

  // Export PDF handler
  const handleExportPdf = async () => {
    setExportingPdf(true);
    const hide = message.loading("Đang kết xuất sổ theo dõi sửa chữa sang PDF...", 0);

    try {
      const htmlContent = generateRepairTrackingHtml({
        rows,
        groupLabel,
        periodText,
        year: reportYear,
      });

      const blob = await exportReportPdf(token, htmlContent);
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");

      hide();
      message.success("Xuất PDF thành công! Đã mở trong tab mới.");
    } catch (error) {
      hide();
      console.error("Export PDF error:", error);
      message.error("Có lỗi xảy ra khi tạo PDF từ máy chủ.");
    } finally {
      setExportingPdf(false);
    }
  };

  // Direct Print handler
  const handlePrint = () => {
    const htmlContent = generateRepairTrackingHtml({
      rows,
      groupLabel,
      periodText,
      year: reportYear,
    });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      message.error("Trình duyệt đã chặn popup in. Vui lòng cho phép popup.");
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  const handleRemoveDeviceId = (id: number) => {
    setSelectedDeviceIds((prev) => prev.filter((dId) => dId !== id));
  };

  const handleClearAllDeviceIds = () => {
    setSelectedDeviceIds([]);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* 1. Filter and Action Toolbar */}
      <RepairTrackingFilter
        timePreset={timePreset}
        onTimePresetChange={handleTimePresetChange}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        deviceFilterMode={deviceFilterMode}
        onDeviceFilterModeChange={setDeviceFilterMode}
        selectedGroupId={selectedGroupId}
        onSelectedGroupIdChange={setSelectedGroupId}
        deviceGroups={deviceGroups}
        selectedDeviceIds={selectedDeviceIds}
        onRemoveDeviceId={handleRemoveDeviceId}
        onClearAllDeviceIds={handleClearAllDeviceIds}
        onOpenVehiclePicker={() => setVehiclePickerOpen(true)}
        allDevices={allDevices}
        onFetch={loadData}
        onOpenPreviewModal={() => setPreviewModalOpen(true)}
        onPrint={handlePrint}
        onExportPdf={handleExportPdf}
        loading={loading}
        exportingPdf={exportingPdf}
        totalRecords={rows.length}
      />

      {/* 2. Main Interactive Web Table (as requested by user) */}
      <RepairTrackingTable
        rows={rows}
        loading={loading}
        groupLabel={groupLabel}
        periodText={periodText}
      />

      {/* 3. Modal: Vehicle Picker (Redesigned "Chọn xe theo nhu cầu") */}
      <VehiclePickerModal
        open={vehiclePickerOpen}
        onClose={() => setVehiclePickerOpen(false)}
        onConfirm={(ids) => setSelectedDeviceIds(ids)}
        allDevices={allDevices}
        deviceGroups={deviceGroups}
        initialSelectedIds={selectedDeviceIds}
      />

      {/* 4. Modal: Print/A4 Preview */}
      <RepairTrackingPreviewModal
        open={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        rows={rows}
        groupLabel={groupLabel}
        periodText={periodText}
        year={reportYear}
        onPrint={handlePrint}
        onExportPdf={handleExportPdf}
        exportingPdf={exportingPdf}
      />
    </div>
  );
};
