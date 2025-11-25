import React from 'react';
import { Tab, Tabs } from '@mui/material';
import CustomTab from '../CustomTab/CustomTab';
import { CustomTabProps } from '../../types/index.types';

function TabHeader(props: { tabs: CustomTabProps[]; handleChange: (newValue: number) => void; value: number }) {
  return (
    <Tabs
      value={props.value}
      onChange={(event, newValue) => props.handleChange(newValue)}
      aria-label="Tab panel"
      TabIndicatorProps={{
        style: { width: 'max-content' },
      }}
      variant="scrollable"
    >
      {props.tabs.map((tab) => (
        <Tab disableRipple key={tab.id} label={<CustomTab label={tab.label} total={tab.total} id={tab.id} value={props.value} />} />
      ))}
    </Tabs>
  );
}

export default TabHeader;
