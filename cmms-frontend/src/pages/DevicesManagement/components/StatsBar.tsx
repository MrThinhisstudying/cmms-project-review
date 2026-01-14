import React from 'react';
import { Card, Col, Row, Statistic } from 'antd';
import { CarOutlined, CheckCircleOutlined, WarningOutlined, StopOutlined, RiseOutlined } from '@ant-design/icons';
import { ReportData } from '../../../types/index.types';

interface StatsBarProps {
  data: ReportData | null;
}

const StatsBar: React.FC<StatsBarProps> = ({ data }) => {
  if (!data) return null;

  return (
    <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
      <Col xs={24} sm={12} md={4}>
        <Card bordered={false}>
          <Statistic
            title="Tổng số xe"
            value={data.total}
            prefix={<CarOutlined />}
            valueStyle={{ color: '#1890ff' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={5}>
        <Card bordered={false}>
          <Statistic
            title="Đang sử dụng"
            value={Number(data.DANG_SU_DUNG || 0) + Number(data.MOI || 0)}
            prefix={<CheckCircleOutlined />}
            valueStyle={{ color: '#3f8600' }}
          />
        </Card>
      </Col>
       <Col xs={24} sm={12} md={5}>
        <Card bordered={false}>
          <Statistic
            title="Sử dụng hạn chế"
            value={data.SU_DUNG_HAN_CHE || 0}
            prefix={<WarningOutlined />}
            valueStyle={{ color: '#faad14' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={5}>
        <Card bordered={false}>
          <Statistic
            title="Đang sửa chữa"
            value={data.DANG_SUA_CHUA || 0}
            prefix={<WarningOutlined />}
            valueStyle={{ color: '#cf1322' }}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} md={5}>
        <Card bordered={false}>
          <Statistic
            title="Thanh lý"
            value={data.THANH_LY || 0}
            prefix={<StopOutlined />}
            valueStyle={{ color: '#8c8c8c' }}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default StatsBar;
