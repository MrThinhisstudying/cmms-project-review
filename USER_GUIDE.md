# HƯỚNG DẪN SỬ DỤNG CHI TIẾT HỆ THỐNG QUẢN LÝ BẢO TRÌ (CMMS)

Tài liệu này cung cấp hướng dẫn chuyên sâu về từng màn hình, từng trường dữ liệu và logic vận hành của hệ thống CMMS.

---

## MỤC LỤC

1.  [Cơ chế Vận hành & Trạng thái](#1-cơ-chế-vận-hành--trạng-thái)
2.  [Hướng dẫn Chi tiết: Lập Phiếu Yêu Cầu (B03)](#2-hướng-dẫn-chi-tiết-lập-phiếu-yêu-cầu-b03)
3.  [Hướng dẫn Chi tiết: Kiểm Nghiệm Kỹ Thuật (B04)](#3-hướng-dẫn-chi-tiết-kiểm-nghiệm-kỹ-thuật-b04)
4.  [Hướng dẫn Chi tiết: Nghiệm Thu Sửa Chữa (B05)](#4-hướng-dẫn-chi-tiết-nghiệm-thu-sửa-chữa-b05)
5.  [Cơ chế Phân quyền & Phê duyệt](#5-cơ-chế-phân-quyền--phê-duyệt)

---

## 1. CƠ CHẾ VẬN HÀNH & TRẠNG THÁI

Hệ thống hoạt động dựa trên luồng quy trình khép kín 3 giai đoạn. Một phiếu sửa chữa sẽ đi qua các trạng thái sau:

### Giai đoạn 1: Yêu cầu (Request Phase)
*   `WAITING_TECH`: Mới tạo, chờ bộ phận kỹ thuật tiếp nhận.
*   `WAITING_TEAM_LEAD`: Kỹ thuật đã xử lý sơ bộ (hoặc chuyển tiếp), chờ Tổ trưởng duyệt.
*   `WAITING_MANAGER`: Chờ Cán bộ Đội duyệt.
*   `WAITING_DIRECTOR`: Chờ Ban Giám Đốc duyệt (đối với yêu cầu lớn).
*   `COMPLETED`: Yêu cầu đã được phê duyệt, sẵn sàng để thực hiện kiểm tra.
*   `REJECTED`: Bị từ chối (Hủy phiếu).

### Giai đoạn 2: Kiểm nghiệm (Inspection Phase)
*   `inspection_pending`: Đang thực hiện kiểm tra kỹ thuật (Lập danh sách lỗi, vật tư).
*   `inspection_lead_approved`: Tổ trưởng đã duyệt kết quả kiểm tra.
*   `inspection_manager_approved`: Cán bộ Đội đã duyệt.
*   `inspection_admin_approved`: Hoàn tất kiểm nghiệm, chốt phương án sửa chữa.

### Giai đoạn 3: Nghiệm thu (Acceptance Phase)
*   `acceptance_pending`: Đang thực hiện nghiệm thu (Xác nhận kết quả, vật tư thực tế).
*   `acceptance_lead_approved`: Tổ trưởng đã duyệt nghiệm thu.
*   `acceptance_manager_approved`: Cán bộ Đội đã duyệt.
*   `acceptance_admin_approved`: **HOÀN THÀNH TOÀN BỘ QUY TRÌNH.**

---

## 2. HƯỚNG DẪN CHI TIẾT: LẬP PHIẾU YÊU CẦU (B03)

Đây là bước khởi tạo quy trình. Bất kỳ sự cố nào cũng cần bắt đầu bằng Phiếu Yêu Cầu.

### Cách thực hiện
1.  Tại màn hình **"Danh sách phiếu sửa chữa"**, nhấn nút **"Tạo phiếu (+)"**.
2.  Màn hình **"PHIẾU YÊU CẦU KIỂM TRA BẢO DƯỠNG - SỬA CHỮA"** xuất hiện.

### Chi tiết các trường dữ liệu (Form Fields)

| Tên trường | Bắt buộc | Mô tả & Cách điền |
| :--- | :---: | :--- |
| **I. THÔNG TIN THIẾT BỊ** | | |
| Chọn thiết bị | ✅ | Nhập tên hoặc biển số xe để tìm kiếm. Hệ thống sẽ tự động lọc bỏ các thiết bị đang trong quá trình sửa chữa khác. |
| Chi tiết thiết bị | - | Sau khi chọn, hệ thống tự hiển thị: Tên, Số đăng ký, Đơn vị quản lý. Bạn cần kiểm tra lại xem có đúng thiết bị không. |
| **II. MÔ TẢ TÌNH TRẠNG** | | |
| Mô tả sự cố | ✅ | Ghi rõ hiện tượng hư hỏng. **Ví dụ:** "Xe đề không nổ", "Lốp sau bên trái bị mòn", "Hệ thống nâng hạ không hoạt động". |
| **III. KIẾN NGHỊ** | | |
| Biện pháp khắc phục | - | Ghi đề xuất sơ bộ (nếu có). **Ví dụ:** "Đề nghị kiểm tra bình ắc quy", "Xin thay lốp mới". |

### Thao tác
*   Nhấn **"Tạo phiếu"**: Hệ thống lưu phiếu và chuyển trạng thái sang `WAITING_TECH`.
*   Nhấn **"Hủy bỏ"**: Đóng cửa sổ, không lưu dữ liệu.

---

## 3. HƯỚNG DẪN CHI TIẾT: KIỂM NGHIỆM KỸ THUẬT (B04)

Sau khi Phiếu Yêu Cầu (B03) đã được duyệt (`COMPLETED`), nhân viên kỹ thuật sẽ tiến hành kiểm tra thực tế trên xe/máy và lập biên bản B04.

### Cách thực hiện
1.  Tìm phiếu có trạng thái **"Hoàn thành"** (Màu xanh) tại cột Trạng thái Yêu cầu.
2.  Nhấn nút **"Tạo kiểm nghiệm"** (Biểu tượng kính lúp màu tím).
3.  Cửa sổ **"KẾT QUẢ KIỂM TRA KỸ THUẬT (B04)"** xuất hiện.

### Các thành phần chính của Form B04

#### 1. Thành phần kiểm nghiệm (Committee)
*   **Mục đích:** Xác định ai là người chịu trách nhiệm kiểm tra.
*   **Thao tác:**
    *   Nhấn **"Thêm thành viên"**.
    *   **Họ tên:** Chọn nhân viên từ danh sách gợi ý. Hệ thống tự động loại trừ các cấp lãnh đạo (chỉ chọn kỹ thuật viên).
    *   **Chức vụ:** Hệ thống tự điền, có thể sửa lại nếu cần.
    *   *Lưu ý:* Cần ít nhất 1 người kiểm tra.

#### 2. Nội dung kiểm nghiệm (Inspection Items)
*   Ghi lại danh sách các lỗi được tìm thấy.
*   **Mô tả hư hỏng:** Chi tiết lỗi (Ví dụ: "Bình điện yếu, không giữ tải").
*   **Nguyên nhân:** (Ví dụ: "Do sử dụng lâu ngày, hết tuổi thọ").
*   **Biện pháp sửa chữa:** (Ví dụ: "Thay mới").
*   **Ghi chú:** Các lưu ý khác.
*   *Thao tác:* Nhấn "Thêm nội dung" để thêm nhiều dòng lỗi khác nhau.

#### 3. Đề nghị vật tư (Materials)
*   Liệt kê các vật tư cần lĩnh từ kho để sửa chữa.
*   **Chọn từ kho:** Nhập tên vật tư -> Chọn từ danh sách gợi ý (Có hiển thị số lượng tồn kho).
*   **Vật tư ngoài:** Nếu vật tư không có trong kho, nhập trực tiếp tên vào ô trống bên dưới.
*   **Quy cách/Mã số:** Thông số kỹ thuật của vật tư.
*   **Số lượng:** Số lượng cần dùng.

### Cơ chế Lưu và Duyệt
*   **Lưu phiếu:** Chỉ lưu nháp dữ liệu, trạng thái vẫn là `inspection_pending`.
*   **Gửi duyệt / Phê duyệt:**
    *   Nếu bạn là Kỹ thuật viên: Nút này sẽ gửi phiếu lên cấp trên -> Trạng thái chuyển thành `Pending Approval`.
    *   Nếu bạn là Lãnh đạo (Tổ trưởng/Đội trưởng): Nút này sẽ **Xác nhận Duyệt** -> Trạng thái chuyển sang cấp cao hơn hoặc Hoàn tất.
*   **Từ chối:** Trả lại phiếu về trạng thái trước đó, bắt buộc nhập lý do.

---

## 4. HƯỚNG DẪN CHI TIẾT: NGHIỆM THU SỬA CHỮA (B05)

Sau khi sửa chữa xong theo phương án B04, tiến hành nghiệm thu để xác nhận kết quả và chốt vật tư thực tế.

### Cách thực hiện
1.  Tìm phiếu có trạng thái Kiểm nghiệm là **"Hoàn tất kiểm nghiệm"**.
2.  Nhấn nút **"Tạo nghiệm thu"** (Biểu tượng hoàn thành màu xanh ngọc).
3.  Cửa sổ **"KẾT QUẢ NGHIỆM THU (B05)"** xuất hiện.

### Logic tính toán Vật tư (Quan trọng)
Bảng vật tư trong B05 phức tạp hơn B04 vì nó tổng hợp **Thực tế sử dụng**.

| Cột hiển thị | Ý nghĩa | Logic hoạt động |
| :--- | :--- | :--- |
| **Vật tư thay thế** | Những gì đã lắp vào xe | Tự động lấy từ B04 sang. Bạn có thể điều chỉnh lại số lượng nếu thực tế dùng ít hơn hoặc nhiều hơn dự kiến. |
| **Vật tư thu hồi** | Những gì tháo từ xe ra và còn dùng được (nhập kho lại) | Nhập **Số lượng** và **% hư hỏng**. Ví dụ: Tháo 4 lốp cũ, giữ lại làm sơ cua -> SL: 4, Hư hỏng: 50%. |
| **Vật tư xin hủy** | Những gì tháo ra và vứt bỏ (phế liệu) | Nhập **Số lượng** và **% hư hỏng** (Thường là 100%). |

*Lưu ý: Tổng số lượng (Thu hồi + Hủy) thường phải khớp với số lượng thay thế (nếu là thay thế 1-1).*

### Kết luận & Ý kiến khác
*   **Kết luận:** Đánh giá cuối cùng. Mặc định là: *"Sau khi tiến hành sửa chữa, xe hoạt động ổn định và an toàn."*
*   Nhấn **"Lưu phiếu"** hoặc **"Phê duyệt"** để hoàn tất quy trình.

---

## 5. CƠ CHẾ PHÂN QUYỀN & PHÊ DUYỆT

Hệ thống tự động hiển thị nút bấm dựa trên vai trò (Role) của bạn:

1.  **Technician (Kỹ thuật viên):**
    *   Chỉ được **Tạo** và **Sửa** phiếu của chính mình (hoặc phiếu chưa ai duyệt).
    *   Không nhìn thấy nút "Phê duyệt" hay "Từ chối".

2.  **Team Lead (Tổ trưởng):**
    *   Nhìn thấy các phiếu cần duyệt của tổ mình.
    *   Nút "Phê duyệt" sẽ chuyển phiếu lên cấp Manager.

3.  **Manager (Cán bộ Đội):**
    *   Phê duyệt cấp cao hơn.
    *   Có quyền "In ấn" và "Xuất PDF" đầy đủ.
    *   **Lưu ý:** Cán bộ đội có thể xem và duyệt phiếu của:
        *   Đơn vị mình trực thuộc.
        *   Các đơn vị khác mà mình được phân công làm Quản lý (Trưởng bộ phận).

4.  **Admin:**
    *   Có toàn quyền (Tạo, Sửa, Xóa, Duyệt tất cả các cấp).
    *   Dùng để xử lý các tình huống kẹt quy trình hoặc sửa sai dữ liệu hệ thống.

---
*Tài liệu được cập nhật ngày 31/01/2026 bởi Đội ngũ Phát triển Phần mềm.*
