export interface MaintenanceImportResult {
  message: string;
  details: {
    name: string;
    status: string;
  }[];
}

export interface ImportConfig {
    hasWeekly: boolean;
    has1M: boolean;
    has3M: boolean;
    has6M: boolean;
    has1Y: boolean;
    has2Y: boolean;
}
