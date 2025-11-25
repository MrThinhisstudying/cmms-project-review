import {DeviceStatus} from '../enums/device-status.enum';

export type DeviceReportSummary = {
    total: number;
    [DeviceStatus.MOI]: number;
    [DeviceStatus.DANG_SU_DUNG]: number;
    [DeviceStatus.THANH_LY]: number;
    [DeviceStatus.HUY_BO]: number;
};
