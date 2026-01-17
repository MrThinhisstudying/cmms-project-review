import {DeviceStatus} from '../enums/device-status.enum';

export type DeviceReportSummary = {
    total: number;
} & Record<DeviceStatus, number>;
