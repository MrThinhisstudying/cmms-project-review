# 🛡️ CMMS PROJECT AUDIT REPORT
**Ngày rà soát:** 2026-01-09
**Phạm vi:** Toàn bộ Repository (`cmms-backend`, `cmms-frontend`)
**Người thực hiện:** Lead Engineer (AI Agent)

---

## 1. 🏗️ KIẾN TRÚC TỔNG THỂ (Overall Architecture)

### 🔙 Backend (`cmms-backend`)
Xây dựng trên **NestJS** với kiến trúc **Modular**, tuân thủ chặt chẽ pattern **Controller-Service-Repository**.
- **Cấu trúc thư mục chính:**
  - `src/main.ts`: Entry point, cấu hình global (ValidationPipe, BodyParser, CORS).
  - `src/app.module.ts`: Root module, aggregate các module con.
  - `src/database`: Cấu hình kết nối DB.
  - **Modules (Feature-based):**
    - `auth`, `user`, `departments`: Quản lý người dùng & phân quyền.
    - `devices`: Quản lý thiết bị/tài sản.
    - `repairs`: Quản lý quy trình sửa chữa (Workflow phức tạp).
    - `maintenance`, `maintenance-ticket`: Quản lý bảo trì định kỳ.
    - `inventory_*`, `stock-out`: Quản lý kho, vật tư.
    - `audit-log`, `notification`: Logging và thông báo.

### 🎨 Frontend (`cmms-frontend`)
Xây dựng trên **React (Create React App)**. Kiến trúc dựa trên **Page-Component** và **Context API** để quản lý state.
- **Cấu trúc thư mục chính:**
  - `src/pages`: Chứa các màn hình chính (Smart Components).
  - `src/components`: Chứa các UI components dùng chung (Dumb Components).
  - `src/context`: State Management (mỗi module có 1 Context riêng: `AuthContext`, `DevicesContext`, `RepairsContext`...).
  - `src/apis`: Layer giao tiếp với Backend (Axios).
  - `src/routes`: Cấu hình định tuyến (AppRoutes).

---

## 2. 🗄️ THỐNG KÊ DATABASE (Backend - TypeORM)

### 📋 Entities (Các thực thể chính)
Hệ thống sử dụng PostgreSQL thông qua TypeORM. Các bảng chính bao gồm:
1.  `User`, `Department`
2.  `Device` (Thiết bị)
3.  `Repair` (Phiếu sửa chữa)
4.  `StockOut` (Xuất kho)
5.  `Category`, `Item` (Kho vật tư)
6.  `Maintenance`, `MaintenanceChecklistTemplate`, `MaintenanceTicket` (Bảo trì)
7.  `AuditLog`, `AuditTransaction`

### 🔗 Mối quan hệ quan trọng (Key Relationships)
-   **Device ↔ Repair:**
    -   `OneToMany`: Một Device có nhiều Repair history.
    -   `ManyToOne`: Một Repair thuộc về một Device cụ thể.
-   **Device ↔ User:** `ManyToMany` (Nhiều user có thể phụ trách/sở hữu nhiều device).
-   **Repair Workflow (Phức tạp):**
    -   `created_by`, `approved_by_*`: Quan hệ `ManyToOne` với `User`.
    -   `inspection_committee`, `acceptance_committee`: Quan hệ `ManyToMany` với `User` (Hội đồng nghiệm thu/kiểm tra).
    -   `stock_outs`: `OneToMany` với Repair (Một phiếu sửa chữa có thể có nhiều phiếu xuất kho vật tư).

### 🔢 Enums Quan trọng
-   **`DeviceStatus`**: `MOI` (Mới), `DANG_SU_DUNG`, `THANH_LY`, `HUY_BO`.
-   **Repair Statuses (State Machine):**
    -   `status_request`: `pending`, `manager_approved`, `admin_approved`, `rejected`.
    -   `status_inspection`: `inspection_pending`...
    -   `status_acceptance`: `acceptance_pending`...

---

## 3. 🎨 TRẠNG THÁI UI REFACTOR (Frontend)

Dự án đang trong quá trình chuyển đổi từ **Material UI (MUI)** sang **Ant Design (AntD)**.

### 📊 Thống kê Library Usage
| Module / Page | UI Library Chính | Trạng thái Migrate |
| :--- | :--- | :--- |
| **Login** | MUI | 🔴 Chưa (Còn dùng Box, Typography) |
| **Users** | MUI | 🔴 Chưa |
| **DevicesManagement** | MUI (Chủ yếu) | 🟡 Đang Refactor (Logic phức tạp, Table custom) |
| **Inventory** | MUI | 🔴 Chưa |
| **RepairsManagement** | MUI | 🔴 Chưa |
| **StockOuts** | MUI | 🔴 Chưa |
| **MaintenanceManagement** | **Ant Design** | 🟢 **Đã hoàn thiện** (Dùng Table, Select, DatePicker, Modal của AntD) |
| **MaintenanceHistory** | **Ant Design** | 🟢 **Đã hoàn thiện** |

### 🧩 Shared Components (Tái sử dụng)
Hiện tại phần lớn Shared Components vẫn đang wrap MUI, gây khó khăn cho việc migrate hoàn toàn:
-   `CustomButton` (wrap MUI Button).
-   `Input` (wrap MUI TextField + React Hook Form Controller).
-   `Toast` (Custom notification).
-   `Pagination` (Custom component).

---

## 4. ✅ TÍNH NĂNG & API

### API Endpoints (Backend)
Các endpoints hoạt động ổn định xoay quanh mô hình CRUD và Workflow:
-   `/api/auth`: Login, Register, Profile.
-   `/api/users`, `/api/departments`: CRUD User structure.
-   `/api/devices`: CRUD Device, Filter, Pagination.
-   `/api/repairs`: Tạo phiếu, Duyệt (Approve), Nghiệm thu (Inspection/Acceptance).
-   `/api/inventory`, `/api/stock-out`: Quản lý kho.

### Dữ liệu Frontend
-   Các trang `Maintenance` đã load được dữ liệu thực tế và hiển thị tốt trên Ant Design Table.
-   Các trang `Devices`, `Repairs` vẫn hiển thị dữ liệu nhưng giao diện còn mang phong cách Material Design cũ.

---

## 5. 📱 KỸ THUẬT RESPONSIVE & UI/UX

-   **Table UI:**
    -   **Ant Design (Maintenance):** Tốt, có sẵn phân trang, column filters, sticky header mặc định của AntD.
    -   **MUI (Devices/Repairs):** Đang dùng custom Table component. Cần kiểm tra kỹ khả năng `sticky header` và `responsive` trên mobile (hiện tại có vẻ chưa tối ưu cho mobile view).
-   **Modals/Drawers:**
    -   Hệ thống dùng hỗn hợp Dialog (MUI) và Modal (AntD).
    -   Các form nhập liệu (`DeviceForm`, `RepairForm`) khá dài, cần đảm bảo scroll tốt bên trong Modal.

---

## 6. 📝 QUY ƯỚC CODING (Conventions)

### Naming
-   **Frontend:**
    -   Component: `PascalCase` (e.g., `DevicesManagement`, `UserTable`).
    -   Folder Page: `PascalCase`.
    -   Variables: `camelCase`.
-   **Backend:**
    -   Class: `PascalCase` (`Device`, `RepairsService`).
    -   File: `kebab-case` (`device.entity.ts`, `repair.controller.ts`).
    -   Database Columns: `snake_case` (e.g., `device_id`, `created_at`).

### Error Handling
-   **Backend:** Sử dụng `ValidationPipe` toàn cục để validate DTO. Exception Filters chưa thấy custom sâu, chủ yếu dùng HttpException chuẩn của NestJS.
-   **Frontend:** Sử dụng `try/catch` trong các hàm gọi API tại Context. Hiển thị lỗi qua component `Toast`.

### State Management
-   Sử dụng **Context API** chia nhỏ cho từng feature module (`DevicesContext`, `RepairsContext`...).
-   **Điểm yếu:** Logic business frontend đang nằm lẫn lộn trong Context và Component, chưa tách biệt rõ ràng ra custom hooks hoặc services thuần. Form handling dùng `react-hook-form` kết hợp `yup` validation.
