import React from 'react';
import { Card, Skeleton, List } from 'antd';

const Loader: React.FC<{ rows?: number }> = ({ rows = 8 }) => {
  return (
    <List
      grid={{
        gutter: 16,
        xs: 1,
        sm: 1,
        md: 2,
        lg: 4,
        xl: 4,
        xxl: 4,
      }}
      rowKey="id"
      dataSource={Array.from({ length: rows }).map((_, i) => ({ id: i }))}
      renderItem={() => (
        <List.Item>
          <Card cover={<Skeleton.Image active style={{ width: '100%', height: 160 }} />}>
            <Skeleton active paragraph={{ rows: 2 }} />
          </Card>
        </List.Item>
      )}
    />
  );
};

export default Loader;
