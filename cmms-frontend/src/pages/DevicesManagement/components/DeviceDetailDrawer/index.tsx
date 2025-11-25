import React, { useEffect, useState } from "react";
import { Box, Drawer, IconButton, Tab, Tabs, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { getToken } from "../../../../utils/auth";
import { getMaintenancesByDevice } from "../../../../apis/maintenance";
import { getRepairsByDevice } from "../../../../apis/repairs";
import { IMaintenance } from "../../../../types/maintenance.types";
import { IRepair } from "../../../../types/repairs.types";
import MaintenanceHistoryTab from "./MaintenanceHistoryTab";
import RepairHistoryTab from "./RepairHistoryTab";

type Props = {
  open: boolean;
  onClose: () => void;
  deviceId?: number;
  deviceName?: string;
};

export default function DeviceDetailDrawer({
  open,
  onClose,
  deviceId,
  deviceName,
}: Props) {
  const [tab, setTab] = useState(0);
  const [loadingMaint, setLoadingMaint] = useState(false);
  const [loadingRepair, setLoadingRepair] = useState(false);
  const [maintenances, setMaintenances] = useState<IMaintenance[]>([]);
  const [repairs, setRepairs] = useState<IRepair[]>([]);

  useEffect(() => {
    if (!open || !deviceId) return;
    const token = getToken();

    (async () => {
      setLoadingMaint(true);
      try {
        const res = await getMaintenancesByDevice(deviceId, token ?? "");
        setMaintenances(res || []);
      } finally {
        setLoadingMaint(false);
      }
    })();

    (async () => {
      setLoadingRepair(true);
      try {
        const res = await getRepairsByDevice(deviceId, token ?? "");
        setRepairs(res || []);
      } finally {
        setLoadingRepair(false);
      }
    })();
  }, [open, deviceId]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: "100%", md: 1000 } } }}
    >
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        p={2}
        borderBottom="1px solid #eee"
      >
        <Typography variant="h6">
          {deviceName || `Thiết bị #${deviceId}`}
        </Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="fullWidth"
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="Lịch sử bảo trì" />
        <Tab label="Lịch sử sửa chữa" />
      </Tabs>

      {tab === 0 && (
        <MaintenanceHistoryTab
          loading={loadingMaint}
          maintenances={maintenances}
        />
      )}

      {tab === 1 && (
        <RepairHistoryTab loading={loadingRepair} repairs={repairs} />
      )}
    </Drawer>
  );
}
