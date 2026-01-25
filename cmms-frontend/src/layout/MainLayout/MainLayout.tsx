import React, { useState, useEffect } from "react";
import { Layout, Grid } from "antd";
import { Outlet } from "react-router-dom";
import TopBar from "./TopBar";
import Sidebar from "./SideBar";
import { UsersProvider } from "../../context/UsersContext/UsersContext";
import { DevicesProvider } from "../../context/DevicesContext/DevicesContext";
import { DepartmentsProvider } from "../../context/DepartmentsContext/DepartmentsContext";
import { MaintenanceProvider } from "../../context/MaintenanceContext/MaintenanceContext";
import { NotificationProvider } from "../../context/NotificationContext/NotificationContext";
import { AuditProvider } from "../../context/AuditContext/AuditContext";
import { MaintenanceTasksProvider } from "../../context/MaintenanceTasksContext/MaintenanceTasksContext";
import { InventoryProvider } from "../../context/InventoryContext/InventoryContext";
import { RepairsProvider } from "../../context/RepairsContext/RepairsContext";

const { Content } = Layout;

const MainLayout = () => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md; // Consider mobile/tablet if < 768px (md)

  const [collapsed, setCollapsed] = useState(isMobile); // Initialize based on device

  // Sync collapsed state when screen size changes
  useEffect(() => {
      setCollapsed(isMobile);
  }, [isMobile]);

  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };

  return (
      <UsersProvider>
        <DepartmentsProvider>
          <DevicesProvider>
            <RepairsProvider>
              <MaintenanceProvider>
                <MaintenanceTasksProvider>
                  <InventoryProvider>
                    <AuditProvider>
                      <NotificationProvider>
                        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
                          <Sidebar collapsed={collapsed} onCollapse={setCollapsed} isMobile={isMobile} />
                          <Layout style={{ background: '#f0f2f5' }}>
                            <TopBar collapsed={collapsed} onToggle={toggleCollapsed} />
                            <Content style={{ 
                                margin: isMobile ? '16px 8px' : '24px', 
                                padding: 0, // Let pages handle their own internal padding if needed, or MainLayout provides only margins
                                minHeight: 280, 
                                background: 'transparent', // Transparent to show gray bg
                                borderRadius: 8 
                            }}>
                                <Outlet />
                            </Content>
                          </Layout>
                        </Layout>
                      </NotificationProvider>
                    </AuditProvider>
                  </InventoryProvider>
                </MaintenanceTasksProvider>
              </MaintenanceProvider>
            </RepairsProvider>
          </DevicesProvider>
        </DepartmentsProvider>
      </UsersProvider>
  );
};

export default MainLayout;
