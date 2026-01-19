import React from "react";
import { List, Typography } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import ItemCard from "../ItemCard";
import Loader from "../Loader"; 

export default function ListItems({ result, loading, toggleDrawer, refreshAll }: any) {
  if (loading) return <Loader />; 

  if (!result || result.length === 0)
    return (
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <InboxOutlined style={{ fontSize: 60, color: '#d9d9d9' }} />
            <Typography.Title level={4} style={{ marginTop: 16, color: '#999' }}>Không có vật tư nào</Typography.Title>
            <Typography.Text type="secondary">Hãy thử thêm vật tư mới hoặc làm mới danh sách.</Typography.Text>
        </div>
    );

  return (
    <List
      rowKey={(item: any) => {
        if (item && item.item_id) return item.item_id;
        console.warn("Item missing item_id:", item);
        return Math.random(); // Fallback to prevent crash
      }}
      grid={{
        gutter: 16,
        xs: 1,
        sm: 1,
        md: 2,
        lg: 4,
        xl: 4,
        xxl: 4,
      }}
      dataSource={Array.isArray(result) ? result.filter((i: any) => i && typeof i === 'object') : []}
      renderItem={(item: any) => (
        <List.Item>
          <ItemCard item={item} toggleDrawer={toggleDrawer} refreshAll={refreshAll} />
        </List.Item>
      )}
    />
  );
}
