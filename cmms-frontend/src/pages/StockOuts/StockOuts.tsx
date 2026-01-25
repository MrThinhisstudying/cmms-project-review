import React, { useState } from "react";
import { Layout, Typography, Card } from "antd";
import { useInventoryContext } from "../../context/InventoryContext/InventoryContext";
import StockOutDetailDrawer from "./components/StockOutDetailDrawer";
import StockOutsTable from "./components/StockOutsTable";
import { IStockOut } from "../../types/inventory.types";

const { Content } = Layout;
const { Title } = Typography;

export default function StockOutsPage() {
  const { stockOuts, loading, refreshAll } = useInventoryContext();
  
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const handleDetail = (so: IStockOut) => {
    setDetailId(so.id ?? null);
    setDetailOpen(true);
  };

  const handleRefresh = () => {
      refreshAll();
  };

  return (
    <Content style={{ padding: 24, minHeight: '100%' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ marginBottom: 0 }}>Quản lý yêu cầu xuất kho</Title>
      </div>

      <Card bordered={false} bodyStyle={{ padding: 0 }} style={{ borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
        <StockOutsTable
          data={stockOuts}
          loading={loading}
          onDetail={handleDetail}
          onSuccess={handleRefresh}
          onError={() => {}} 
        />
      </Card>

      <StockOutDetailDrawer
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        stockOutId={detailId ?? undefined}
        onActionSuccess={handleRefresh}
      />
    </Content>
  );
}
