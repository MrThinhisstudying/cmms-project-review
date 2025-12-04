import React, { useState, useEffect } from "react";
import {
  Form,
  Select,
  Button,
  message,
  Input,
  Spin,
  InputNumber,
  Row,
  Col,
  Card,
  DatePicker,
  Radio,
  Divider,
} from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import ChecklistExecutor from "../ChecklistExecutor/index";
import {
  getAllTemplates,
  getTemplateById,
  createMaintenanceTicket,
} from "../../../../apis/maintenance";
import { getAllDevices } from "../../../../apis/devices"; // Kiểm tra lại đường dẫn này
import { getAllUsers } from "../../../../apis/users";
import { getToken } from "../../../../utils/auth";
import dayjs from "dayjs";
import "dayjs/locale/vi";

const { Option } = Select;
const { TextArea } = Input;

// Danh sách hạng mục nghiệm thu
const ACCEPTANCE_DATA = [
  {
    id: "1",
    label: "1. Các hạng mục vật tư thay thế theo cấp BD / Parts replaced",
    isSub: false,
  },
  { id: "2", label: "2. Dầu mỡ / Oil and grease", isSub: false },
  {
    id: "3",
    label: "3. Tình trạng kỹ thuật các hệ thống / Operation of systems",
    isSub: false,
  },
  { id: "3.1", label: "- Động cơ / Engine", isSub: true },
  { id: "3.2", label: "- Hệ thống điện / Electric system", isSub: true },
  { id: "3.3", label: "- Hệ thống thắng / Brake system", isSub: true },
  {
    id: "3.4",
    label: "- Hệ thống truyền động / Power transmitting system",
    isSub: true,
  },
  { id: "3.5", label: "- Khung sườn / Chassis", isSub: true },
];

// --- 1. CẬP NHẬT INTERFACE PROPS ---
interface Props {
  onSuccess: () => void;
  onCancel: () => void;
  initialData?: any; // <--- Thêm cái này để nhận dữ liệu từ bảng
}

const MaintenanceForm: React.FC<Props> = ({
  onSuccess,
  onCancel,
  initialData,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const token = getToken();

  // Data State
  const [devices, setDevices] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentTemplateJson, setCurrentTemplateJson] = useState<any>(null);
  const [currentLevel, setCurrentLevel] = useState<string | null>(null);

  // Result State
  const [checklistResults, setChecklistResults] = useState<any[]>([]);
  const [acceptanceResults, setAcceptanceResults] = useState<
    Record<string, { status: string | null; note: string }>
  >({});

  // Load Data (Devices, Users, Templates)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devs, temps, userList] = await Promise.all([
          getAllDevices(token),
          getAllTemplates(token),
          getAllUsers(token),
        ]);
        setDevices(devs);
        setTemplates(temps);
        setUsers(userList);
      } catch (e) {
        message.error("Lỗi tải dữ liệu danh mục");
      }
    };
    fetchData();
  }, [token]);

  // --- 2. LOGIC AUTO-FILL (QUAN TRỌNG NHẤT) ---
  useEffect(() => {
    if (initialData) {
      // Nếu có dữ liệu truyền vào (từ nút Cờ lê hoặc Timeline)
      form.setFieldsValue({
        device_id: initialData.device_id,
        // Chấp nhận cả key 'maintenance_level' hoặc 'level' tùy nguồn gọi
        maintenance_level: initialData.maintenance_level || initialData.level,
        // Nếu có ngày dự kiến thì điền, không thì lấy hôm nay
        execution_date: initialData.scheduled_date
          ? dayjs(initialData.scheduled_date)
          : dayjs(),
      });

      // Cập nhật state Level để hiển thị đúng cột trong Checklist
      setCurrentLevel(initialData.maintenance_level || initialData.level);
    } else {
      // Nếu tạo mới hoàn toàn -> Reset
      form.resetFields();
      form.setFieldsValue({ execution_date: dayjs() });
      setCurrentLevel(null);
      setCurrentTemplateJson(null);
    }
  }, [initialData, form]);
  // ----------------------------------------------

  // Filter Users
  const technicianList = users.filter((u) => {
    const pos = u.position?.toLowerCase() || "";
    const excluded = ["giám đốc", "phó giám đốc", "kế toán"];
    return !excluded.some((ex) => pos.includes(ex));
  });

  const leaderList = users.filter((u) => {
    const pos = u.position?.toLowerCase() || "";
    return pos.includes("đội trưởng") || pos.includes("đội phó");
  });

  const operatorList = users.filter((u) => {
    const pos = u.position?.toLowerCase() || "";
    const excluded = [
      "giám đốc",
      "phó giám đốc",
      "kế toán",
      "đội trưởng",
      "đội phó",
    ];
    return !excluded.some((ex) => pos.includes(ex));
  });

  const handleTemplateChange = async (id: number) => {
    setLoading(true);
    try {
      const res = await getTemplateById(id, token);
      if (res?.checklist_structure)
        setCurrentTemplateJson(res.checklist_structure);
    } catch (e) {
      message.error("Lỗi tải quy trình");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptanceUpdate = (
    label: string,
    field: "status" | "note",
    value: any
  ) => {
    setAcceptanceResults((prev) => ({
      ...prev,
      [label]: {
        ...(prev[label] || { status: null, note: "" }),
        [field]: value,
      },
    }));
  };

  const onFinish = async (values: any) => {
    if (!currentTemplateJson) return message.warning("Chưa chọn quy trình!");

    // Validate Nghiệm thu
    const missingItems = ACCEPTANCE_DATA.filter((row) => {
      const result = acceptanceResults[row.label];
      return !result || !result.status;
    });
    if (missingItems.length > 0) {
      return message.error(
        `Vui lòng đánh giá Đạt/Không cho mục: "${missingItems[0].label}"`
      );
    }

    const acceptanceFinal = ACCEPTANCE_DATA.map((row) => {
      const result = acceptanceResults[row.label] || {
        status: "pass",
        note: "",
      };
      return {
        id: row.id,
        item: row.label,
        status: result.status,
        note: result.note || "",
      };
    });

    const payload = {
      device_id: values.device_id,
      template_id: values.template_id,
      maintenance_level: values.maintenance_level,
      working_hours: values.working_hours,
      manual_ticket_number: values.manual_ticket_number,
      execution_team: values.execution_team,
      // Lấy ngày thực hiện từ Form (nếu người dùng sửa)
      execution_date: values.execution_date
        ? values.execution_date.toISOString()
        : new Date().toISOString(),
      arising_issues: values.arising_issues,
      checklist_result: checklistResults,
      acceptance_result: acceptanceFinal,
      final_conclusion: values.final_conclusion,
      leader_user_id: values.leader_user_id,
      operator_user_id: values.operator_user_id,
    };

    try {
      setLoading(true);
      await createMaintenanceTicket(token, payload);
      message.success("Lưu phiếu thành công!");
      onSuccess();
    } catch (err: any) {
      message.error("Lỗi: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Spin spinning={loading}>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ final_conclusion: true }}
      >
        {/* --- 1. THÔNG TIN CHUNG --- */}
        <Card
          title="1. TRANG THIẾT BỊ BẢO DƯỠNG / EQUIPMENT"
          size="small"
          style={{ marginBottom: 16, borderTop: "3px solid #1890ff" }}
        >
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="device_id"
                label="1.1 & 1.2. Chủng loại & Số đăng ký"
                rules={[{ required: true, message: "Chọn thiết bị" }]}
              >
                <Select
                  placeholder="Chọn xe..."
                  showSearch
                  optionFilterProp="children"
                  size="large"
                >
                  {devices.map((d) => (
                    <Option key={d.device_id} value={d.device_id}>
                      {d.name} ({d.serial_number})
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="working_hours" label="Số GHĐ (Km/Giờ)">
                <InputNumber
                  style={{ width: "100%" }}
                  formatter={(v) =>
                    `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                  }
                  placeholder="Không bắt buộc"
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="manual_ticket_number"
                label="1.3. Phiếu công tác số"
              >
                <Input placeholder="Tự động hoặc nhập tay" size="large" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="execution_date"
                label="Ngày / Date"
                initialValue={dayjs()}
                rules={[{ required: true }]}
              >
                <DatePicker
                  format="DD/MM/YYYY"
                  style={{ width: "100%" }}
                  size="large"
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="maintenance_level"
                label="1.4. Cấp bảo dưỡng"
                rules={[{ required: true, message: "Chọn cấp độ" }]}
              >
                <Select
                  placeholder="Chọn cấp..."
                  onChange={setCurrentLevel}
                  size="large"
                >
                  <Option value="1M">01 Tháng</Option>
                  <Option value="3M">03 Tháng</Option>
                  <Option value="6M">06 Tháng</Option>
                  <Option value="9M">09 Tháng</Option>
                  <Option value="1Y">01 Năm</Option>
                  <Option value="2Y">02 Năm</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={24}>
              <Form.Item
                name="template_id"
                label="Quy trình áp dụng"
                rules={[{ required: true, message: "Chọn quy trình" }]}
                style={{ marginBottom: 0 }}
              >
                <Select
                  placeholder="Chọn mẫu phiếu..."
                  onChange={handleTemplateChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {templates.map((t) => (
                    <Option key={t.id} value={t.id}>
                      {t.code ? <b>[{t.code}] </b> : ""} {t.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* --- 2. NGƯỜI THỰC HIỆN --- */}
        <Card
          title="2. NGƯỜI THỰC HIỆN / CHECKED BY"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Form.List name="execution_team">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <Row key={key} gutter={16} style={{ marginBottom: 8 }}>
                    <Col span={14}>
                      <Form.Item
                        {...restField}
                        name={[name, "name"]}
                        noStyle
                        rules={[{ required: true, message: "Chọn nhân viên" }]}
                      >
                        <Select
                          placeholder="Chọn kỹ thuật viên..."
                          showSearch
                          optionFilterProp="children"
                          style={{ width: "100%" }}
                          filterOption={(input, option) =>
                            (option?.children as unknown as string)
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                        >
                          {technicianList.map((u) => (
                            <Option key={u.user_id} value={u.name}>
                              {u.name} {u.position ? `- ${u.position}` : ""}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={6}>
                      <Form.Item
                        {...restField}
                        name={[name, "date"]}
                        noStyle
                        initialValue={dayjs()}
                      >
                        <DatePicker
                          style={{ width: "100%" }}
                          format="DD/MM/YYYY"
                        />
                      </Form.Item>
                    </Col>
                    <Col span={4}>
                      <Button
                        danger
                        icon={<DeleteOutlined />}
                        onClick={() => remove(name)}
                      />
                    </Col>
                  </Row>
                ))}
                <Button
                  type="dashed"
                  onClick={() => add()}
                  block
                  icon={<PlusOutlined />}
                >
                  Thêm người thực hiện
                </Button>
              </>
            )}
          </Form.List>
        </Card>

        {/* --- 3. CHECKLIST --- */}
        <Card
          title="3. NỘI DUNG BẢO DƯỠNG (ĐÍNH KÈM)"
          size="small"
          style={{ marginBottom: 16 }}
        >
          {currentTemplateJson && currentLevel ? (
            <ChecklistExecutor
              templateData={currentTemplateJson}
              currentLevel={currentLevel}
              onChange={setChecklistResults}
            />
          ) : (
            <div style={{ textAlign: "center", color: "#999" }}>
              Vui lòng chọn Thiết bị & Cấp độ & Quy Trình
            </div>
          )}
        </Card>

        {/* --- 4. PHÁT SINH --- */}
        <Card
          title="4. PHÁT SINH KHÁC"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <Form.Item name="arising_issues" noStyle>
            <TextArea rows={3} placeholder="Nhập nội dung phát sinh..." />
          </Form.Item>
        </Card>

        {/* --- 5. NGHIỆM THU --- */}
        <Card
          title="5. NGHIỆM THU & KẾT LUẬN / CHECK AND TAKE OVER"
          size="small"
          style={{ marginBottom: 16 }}
        >
          <div
            style={{
              marginBottom: 20,
              padding: "10px",
              background: "#fafafa",
              borderRadius: 4,
            }}
          >
            <div style={{ fontWeight: "bold", marginBottom: 5 }}>
              5.1. Người thực hiện / Checked by (Ký/ Signature):
            </div>
            <Form.Item
              shouldUpdate={(prev, curr) =>
                prev.execution_team !== curr.execution_team
              }
              noStyle
            >
              {({ getFieldValue }) => {
                const team = getFieldValue("execution_team") || [];
                const names = team
                  .map((t: any) => t?.name)
                  .filter(Boolean)
                  .join(", ");
                return (
                  <div
                    style={{
                      marginLeft: 20,
                      fontStyle: "italic",
                      color: names ? "#000" : "#999",
                    }}
                  >
                    {names || "(Chưa chọn người thực hiện ở Mục 2)"}
                  </div>
                );
              }}
            </Form.Item>
          </div>

          <div style={{ fontWeight: "bold", marginBottom: 10 }}>
            5.2. Xác nhận của đơn vị sử dụng / Approved by using unit:
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              border: "1px solid #d9d9d9",
            }}
          >
            <thead style={{ background: "#fafafa" }}>
              <tr>
                <th
                  style={{
                    padding: 8,
                    borderBottom: "1px solid #d9d9d9",
                    textAlign: "left",
                  }}
                >
                  Nội dung
                </th>
                <th
                  style={{
                    width: 80,
                    borderBottom: "1px solid #d9d9d9",
                    textAlign: "center",
                  }}
                >
                  Đạt
                </th>
                <th
                  style={{
                    width: 80,
                    borderBottom: "1px solid #d9d9d9",
                    textAlign: "center",
                  }}
                >
                  Không Đạt
                </th>
                <th style={{ width: 150, borderBottom: "1px solid #d9d9d9" }}>
                  Ghi chú
                </th>
              </tr>
            </thead>
            <tbody>
              {ACCEPTANCE_DATA.map((row) => {
                const currentResult = acceptanceResults[row.label] || {
                  status: null,
                  note: "",
                };
                return (
                  <tr
                    key={row.id}
                    style={{ borderBottom: "1px solid #f0f0f0" }}
                  >
                    <td
                      style={{
                        padding: 8,
                        paddingLeft: row.isSub ? 32 : 8,
                        fontWeight: row.isSub ? 400 : 500,
                      }}
                    >
                      {row.label}
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="radio"
                        name={`acc_${row.id}`}
                        checked={currentResult.status === "pass"}
                        onChange={() =>
                          handleAcceptanceUpdate(row.label, "status", "pass")
                        }
                        style={{ transform: "scale(1.2)", cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="radio"
                        name={`acc_${row.id}`}
                        checked={currentResult.status === "fail"}
                        onChange={() =>
                          handleAcceptanceUpdate(row.label, "status", "fail")
                        }
                        style={{ transform: "scale(1.2)", cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: 4 }}>
                      <Input
                        bordered={false}
                        size="small"
                        placeholder="..."
                        value={currentResult.note}
                        onChange={(e) =>
                          handleAcceptanceUpdate(
                            row.label,
                            "note",
                            e.target.value
                          )
                        }
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Divider />
          <Form.Item
            name="final_conclusion"
            label={
              <span style={{ fontWeight: "bold" }}>KẾT LUẬN / CONCLUSION:</span>
            }
            valuePropName="checked"
          >
            <Radio.Group>
              <Radio
                value={true}
                style={{ color: "green", fontWeight: "bold" }}
              >
                ĐẠT YCKT - Đưa vào khai thác
              </Radio>
              <Radio
                value={false}
                style={{ color: "red", fontWeight: "bold", marginLeft: 20 }}
              >
                KHÔNG ĐẠT
              </Radio>
            </Radio.Group>
          </Form.Item>
        </Card>

        {/* --- 6. KÝ TÊN --- */}
        <div style={{ marginTop: 30, marginBottom: 20 }}>
          <div
            style={{
              textAlign: "right",
              fontStyle: "italic",
              marginBottom: 20,
              fontSize: 15,
            }}
          >
            Côn Đảo, ngày {dayjs().format("DD")} tháng {dayjs().format("MM")}{" "}
            năm {dayjs().format("YYYY")}
          </div>
          <Row gutter={48}>
            <Col span={12} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: "bold", marginBottom: 5 }}>
                ĐỘI-KT / DIVISION/TEAM
              </div>
              <div
                style={{ fontStyle: "italic", fontSize: 13, marginBottom: 15 }}
              >
                (Ký tên / Signature)
              </div>
              <Form.Item
                name="leader_user_id"
                rules={[{ required: true, message: "Chọn người ký!" }]}
              >
                <Select
                  placeholder="-- Chọn Đội trưởng/Phó --"
                  style={{ width: "100%", textAlign: "center" }}
                  optionLabelProp="label"
                  popupMatchSelectWidth={300}
                >
                  {leaderList.map((u) => (
                    <Option
                      key={u.user_id}
                      value={u.user_id}
                      label={
                        <div style={{ textAlign: "center" }}>{u.name}</div>
                      }
                    >
                      <div style={{ textAlign: "center" }}>{u.name}</div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12} style={{ textAlign: "center" }}>
              <div style={{ fontWeight: "bold", marginBottom: 5 }}>
                TỔ VHTTBMĐ / GSE OP. TEAM
              </div>
              <div
                style={{ fontStyle: "italic", fontSize: 13, marginBottom: 15 }}
              >
                (Ký tên / Signature)
              </div>
              <Form.Item
                name="operator_user_id"
                rules={[{ required: true, message: "Chọn người ký!" }]}
              >
                <Select
                  placeholder="-- Chọn Nhân viên --"
                  style={{ width: "100%", textAlign: "center" }}
                  optionLabelProp="label"
                  popupMatchSelectWidth={300}
                >
                  {operatorList.map((u) => (
                    <Option
                      key={u.user_id}
                      value={u.user_id}
                      label={
                        <div style={{ textAlign: "center" }}>{u.name}</div>
                      }
                    >
                      <div style={{ textAlign: "center" }}>{u.name}</div>
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div style={{ textAlign: "right" }}>
          <Button onClick={onCancel} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" size="large">
            LƯU PHIẾU & KÝ
          </Button>
        </div>
      </Form>
    </Spin>
  );
};

export default MaintenanceForm;
