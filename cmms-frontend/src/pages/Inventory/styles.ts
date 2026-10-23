import styled from "styled-components";

export const InventoryHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0 24px;
`;

export const InventoryDashboard = styled.div`
  flex-grow: 1;
  overflow: auto;
  height: 100%;
`;

export const InventoryAction = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 8px;
`;

const useStyles = () => ({
  TabPanel: { width: "100%" },
  Header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 24px 0 24px",
  },
  Dashboard: { flexGrow: 1, overflow: "auto", height: "100%" },
  Action: { display: "flex", alignItems: "flex-start", gap: "8px" },
});

export { useStyles };
