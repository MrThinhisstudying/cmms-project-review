export interface IRepairTrackingRow {
  stt: number;
  repairId: number;
  deviceId?: number;
  deviceName: string;
  regNumber: string;
  breakdownDate: string;
  repairContent: string;
  completionDate: string;
  repairUnit: string;
  operatingUnit: string;
  result: string;
}

export type TimeRangePreset = "1_MONTH" | "3_MONTHS" | "6_MONTHS" | "12_MONTHS" | "CUSTOM";
export type DeviceFilterMode = "GROUP" | "CUSTOM_DEVICES";
