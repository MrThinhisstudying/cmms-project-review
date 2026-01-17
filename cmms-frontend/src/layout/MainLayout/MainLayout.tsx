import React, { useState } from "react";
import { Layout } from "antd";
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
  const [collapsed, setCollapsed] = useState(false);

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
                        <Layout style={{ minHeight: '100vh' }}>
                          <Sidebar collapsed={collapsed} onCollapse={setCollapsed} />
                          <Layout>
                            <TopBar collapsed={collapsed} onToggle={toggleCollapsed} />
                            <Content style={{ margin: '24px 16px', padding: 24, minHeight: 280, background: '#fff', borderRadius: 8 }}>
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
