import React, { useMemo, useRef, useState } from "react";
import { Box, Grid, Typography } from "@mui/material";
import { IDevice } from "../../types/devicesManagement.types";
import DevicesTable from "./components/DevicesTable";
import StatusFilter from "./components/StatusFilter";
import Pagination from "../../components/Pagination/Pagination";
import DevicesManagementSearchBar from "./components/DevicesManagementSearchBar";
import AddIcon from "@mui/icons-material/Add";
import { useDevicesContext } from "../../context/DevicesContext/DevicesContext";
import UsagePurposeFilter from "./components/UsagePurposeFilter";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import Toast from "../../components/Toast";
import {
  uploadDevices,
  deleteDevice,
  updateDevice,
  createDevice,
} from "../../apis/devices";
import { exportDevicesToExcel } from "../../utils";
import DevicesManagementSkeleton from "./components/DevicesManagementSkeleton";
import { CustomButton } from "../../components/Button";
import DeviceForm from "./components/DeviceForm";
import { STATUS_LIST } from "../../constants/statusOptions";
import { getToken } from "../../utils/auth";
import DeviceDetailDrawer from "./components/DeviceDetailDrawer";
import { useAuthContext } from "../../context/AuthContext/AuthContext";

const DevicesManagement: React.FC = () => {
  const { devices = [], loading, fetchDevices } = useDevicesContext();
  const [selectedUsagePurpose, setSelectedUsagePurpose] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const rowsPerPage = 10;
  const [search, setSearch] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [selectedTTB, setSelectedTTB] = useState<IDevice | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDevice, setDetailDevice] = useState<IDevice | null>(null);
  const { user } = useAuthContext();
  const userRole = user?.role;
  const userPermissions = user?.permissions || [];

  const toast = useRef<{ type: "error" | "success"; content: string }>({
    type: "success",
    content: "",
  });
  const [openToast, setOpenToast] = useState(false);

  const handleAddTTB = () => {
    setSelectedTTB(null);
    setOpenForm(true);
  };

  const handleEditDevice = (device: IDevice) => {
    setSelectedTTB(device);
    setOpenForm(true);
  };

  const handleDetail = (device: IDevice) => {
    setDetailDevice(device);
    setDetailOpen(true);
  };

  const handleDeleteDevice = async (device_id?: number) => {
    try {
      const token = getToken();
      const result = await deleteDevice(device_id, token);
      fetchDevices();
      toast.current = {
        content: result.message || "Xóa trang thiết bị thành công",
        type: "success",
      };
      setOpenToast(true);
    } catch (error) {
      toast.current = {
        content:
          error instanceof Error
            ? error.message
            : "Xóa trang thiết bị thất bại",
        type: "error",
      };
      setOpenToast(true);
    }
  };

  const canEdit =
    userRole === "admin" ||
    (userRole === "manager" &&
      (userPermissions.includes("ADD_DEVICE") ||
        userPermissions.includes("UPDATE_DEVICE")));

  const canDelete =
    userRole === "admin" ||
    (userRole === "manager" && userPermissions.includes("DELETE_DEVICE"));

  const handleDownloadTTB = () => {
    try {
      exportDevicesToExcel(devices || []);
      toast.current = {
        content:
          devices && devices.length > 0
            ? "Tải xuống danh sách thiết bị thành công"
            : "Tải xuống mẫu nhập thiết bị thành công",
        type: "success",
      };
      setOpenToast(true);
    } catch (error) {
      toast.current = {
        content:
          error instanceof Error
            ? `Tải xuống thất bại: ${error.message}`
            : "Tải xuống thất bại",
        type: "error",
      };
      setOpenToast(true);
    }
  };

  const onPageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleUploadTTB = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const token = getToken();
      const result = await uploadDevices(token, file);
      toast.current = { content: result.message, type: "success" };
      setOpenToast(true);
      fetchDevices();
    } catch (error) {
      toast.current = {
        content:
          error instanceof Error ? error.message : "Tải thiết bị thất bại",
        type: "error",
      };
      setOpenToast(true);
    } finally {
      event.target.value = "";
    }
  };

  const usagePurposes = useMemo(() => {
    return devices
      .map((item: IDevice) => item.usage_purpose)
      .filter((s): s is string => typeof s === "string" && s.trim() !== "")
      .reduce((unique: string[], cur: string) => {
        if (!unique.includes(cur)) unique.push(cur);
        return unique;
      }, [] as string[]);
  }, [devices]);

  const handleClearFilterData = () => {
    setSelectedUsagePurpose("");
    setSelectedStatus("");
    setSearch("");
    setPage(1);
  };

  const handleSelectUsagePurpose = (sagePurpose: string) => {
    setSelectedUsagePurpose(sagePurpose);
  };

  const handleChangeStatus = (status: string) => {
    setSelectedStatus(status);
  };

  const filteredData = useMemo(() => {
    return devices.filter((item: IDevice) => {
      const matchesUsagePurpose =
        selectedUsagePurpose === "" ||
        (item.usage_purpose ?? "").includes(selectedUsagePurpose);
      const matchesStatus =
        selectedStatus === "" || (item.status ?? "").includes(selectedStatus);
      return matchesUsagePurpose && matchesStatus;
    });
  }, [devices, selectedUsagePurpose, selectedStatus]);

  const searchedData = useMemo(() => {
    if (!search.trim()) return filteredData;
    return filteredData.filter((device) =>
      device.name?.toLowerCase().includes(search.toLowerCase())
    );
  }, [search, filteredData]);

  const handleSubmitUpsert = async (data: Partial<IDevice>) => {
    try {
      setSaving(true);
      const token = getToken();
      if (selectedTTB?.device_id) {
        const res = await updateDevice(selectedTTB.device_id, token, data);
        toast.current = {
          type: "success",
          content: res?.message || "Cập nhật thành công",
        };
      } else {
        const res = await createDevice(token, data);
        toast.current = {
          type: "success",
          content: res?.message || "Tạo thiết bị thành công",
        };
      }
      setOpenToast(true);
      setOpenForm(false);
      setSelectedTTB(null);
      fetchDevices();
    } catch (err) {
      toast.current = {
        type: "error",
        content: err instanceof Error ? err.message : "Lưu thiết bị thất bại",
      };
      setOpenToast(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {loading ? (
        <DevicesManagementSkeleton />
      ) : (
        <Grid container spacing={2}>
          <Grid
            item
            xs={3}
            display={{ xs: "none", md: "flex" }}
            flexDirection="column"
            gap="16px"
            padding="16px"
            height="calc(100vh - 130px)"
            overflow="auto"
          >
            <UsagePurposeFilter
              usagePurposes={usagePurposes}
              selectedUsagePurpose={selectedUsagePurpose}
              onSelectUsagePurpose={handleSelectUsagePurpose}
            />
            <StatusFilter
              status={STATUS_LIST}
              selectedStatus={selectedStatus}
              onChangeStatus={handleChangeStatus}
            />
          </Grid>
          <Grid
            item
            xs={12}
            md={9}
            sx={{
              height: "calc(100vh - 130px)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Box
              display="flex"
              justifyContent={{ lg: "space-between", xs: "flex-start" }}
              alignItems={{ lg: "center", xs: "flex-start" }}
              flexDirection={{ lg: "row", xs: "column" }}
              gap={2}
              paddingBottom="16px"
            >
              <Typography variant="h6">Quản lý TTB_PT</Typography>
              {canEdit && (
                <Box
                  display="flex"
                  gap={1}
                  flexWrap="wrap"
                  width={{ lg: "auto", xs: "100%" }}
                  ml={{ xs: "auto", lg: "auto" }}
                  justifyContent="space-between"
                >
                  <Box position="relative">
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls,.json"
                      onChange={handleUploadTTB}
                      style={{
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        opacity: 0,
                        cursor: "pointer",
                        zIndex: 2,
                      }}
                    />
                    <CustomButton
                      variant="contained"
                      startIcon={<UploadIcon />}
                      sx={{ height: "40px" }}
                      component="span"
                    >
                      Tải tệp
                    </CustomButton>
                  </Box>
                  <CustomButton
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    sx={{ height: "40px" }}
                    onClick={handleDownloadTTB}
                  >
                    Xuất dữ liệu
                  </CustomButton>
                  <CustomButton
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleAddTTB}
                    sx={{ height: "40px" }}
                  >
                    Thêm mới TTB_PT
                  </CustomButton>
                </Box>
              )}
            </Box>

            <DevicesManagementSearchBar
              search={search}
              setSearch={setSearch}
              handleClearFilterData={handleClearFilterData}
            />

            <Box sx={{ flex: 1, overflow: "auto", minHeight: 0 }}>
              <DevicesTable
                filteredData={searchedData}
                rowsPerPage={rowsPerPage}
                page={page}
                onEdit={handleEditDevice}
                onDelete={handleDeleteDevice}
                onDetail={handleDetail}
                canEdit={canEdit}
                canDelete={canDelete}
              />
            </Box>

            <Pagination
              data={searchedData}
              rowsPerPage={rowsPerPage}
              onPageChange={onPageChange}
              page={page}
            />
          </Grid>

          <Toast
            content={toast.current?.content}
            variant={toast.current?.type}
            open={openToast}
            onClose={() => setOpenToast(false)}
          />
        </Grid>
      )}
      <DeviceForm
        open={openForm}
        initialData={selectedTTB}
        onClose={() => {
          setOpenForm(false);
          setSelectedTTB(null);
        }}
        onSubmit={handleSubmitUpsert}
        loading={saving}
      />
      <DeviceDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        deviceId={detailDevice?.device_id}
        deviceName={detailDevice?.name}
      />
    </>
  );
};

export default DevicesManagement;
