import React, { useState } from "react";
import { Box, useMediaQuery } from "@mui/material";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./SideBar";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { UsersProvider } from "../../context/UsersContext/UsersContext";
import { DevicesProvider } from "../../context/DevicesContext/DevicesContext";
import { DepartmentsProvider } from "../../context/DepartmentsContext/DepartmentsContext";
import { MaintenanceProvider } from "../../context/MaintenanceContext/MaintenanceContext";
import { NotificationProvider } from "../../context/NotificationContext/NotificationContext";
import { AuditProvider } from "../../context/AuditContext/AuditContext";
import { MaintenanceTasksProvider } from "../../context/MaintenanceTasksContext/MaintenanceTasksContext";
import { InventoryProvider } from "../../context/InventoryContext/InventoryContext";
import { RepairsProvider } from "../../context/RepairsContext/RepairsContext";

const defaultTheme = createTheme();

const MainLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery("(max-width:900px)");

  const handleToggleSidebar = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      <UsersProvider>
        <DepartmentsProvider>
          <DevicesProvider>
            <RepairsProvider>
              <MaintenanceProvider>
                <MaintenanceTasksProvider>
                  <InventoryProvider>
                    <AuditProvider>
                      <NotificationProvider>
                        <Box height="100vh" width="100%" margin="auto">
                          <TopBar onMenuClick={handleToggleSidebar} />
                          <Box display="flex">
                            <Sidebar
                              mobileOpen={mobileOpen}
                              onClose={handleToggleSidebar}
                              isMobile={isMobile}
                            />
                            <Box
                              flexGrow={1}
                              padding={3}
                              marginTop="70px"
                              overflow="hidden"
                            >
                              <Outlet />
                            </Box>
                          </Box>
                        </Box>
                      </NotificationProvider>
                    </AuditProvider>
                  </InventoryProvider>
                </MaintenanceTasksProvider>
              </MaintenanceProvider>
            </RepairsProvider>
          </DevicesProvider>
        </DepartmentsProvider>
      </UsersProvider>
    </ThemeProvider>
  );
};

export default MainLayout;
