import React, { useEffect, useState } from "react";
import { Card, Table, Radio, Input, Tag, Button, Modal, message } from "antd";
import { TemplateGroup } from "../../../../types/maintenance.types";
import { CheckSquareOutlined, ExclamationCircleOutlined } from "@ant-design/icons";

interface Props {
  templateData: TemplateGroup[];
  currentLevel: string;
  onChange: (results: any[]) => void;
}

const ChecklistExecutor: React.FC<Props> = ({
  templateData,
  currentLevel,
  onChange,
}) => {
  const [results, setResults] = useState<Record<string, any>>({});

  // --- THÊM ĐOẠN NÀY: Tự động nạp toàn bộ danh mục ngay khi mở Form ---
  useEffect(() => {
    const initialData: Record<string, any> = {};

    templateData.forEach((group) => {
      group.items.forEach((item) => {
        const currentReq = item.requirements?.[currentLevel] || "-";
        // Tạo dữ liệu mặc định cho TẤT CẢ các dòng
        initialData[item.code] = {
          code: item.code,
          task: item.task,
          req: currentReq,
          category: group.category,
          type: item.type,
          requirements: item.requirements, // Lưu snapshot yêu cầu các cấp
          status: null, // Chưa làm
          value: "",
          note: "",
        };
      });
    });

    setResults(initialData);
    onChange(Object.values(initialData)); // Gửi ngay danh sách đầy đủ (15 mục) ra ngoài
  }, [templateData, currentLevel, onChange]);

  // --- SỬA 1: Thêm tham số categoryName vào hàm này ---
  const handleUpdate = (
    item: any,
    categoryName: string,
    field: string,
    value: any
  ) => {
    const currentReq = item.requirements?.[currentLevel] || "-";

    const newResults = {
      ...results,
      [item.code]: {
        ...results[item.code],
        code: item.code,
        task: item.task,
        req: currentReq,
        category: categoryName, // <--- SỬA 2: Lưu tham số categoryName vào đây (thay vì item.categoryName)
        type: item.type,
        requirements: item.requirements,
        [field]: value,
        status:
          field === "value" ? "pass" : results[item.code]?.status || "fail",
      },
    };

    if (field === "status") {
      newResults[item.code].status = value ? "pass" : "fail";
    }

    setResults(newResults);
    onChange(Object.values(newResults));
  };


  // --- LOGIC CHỌN TẤT CẢ (SELECT ALL) ---
  const handleSelectAll = (group: TemplateGroup) => {
     Modal.confirm({
        title: <span style={{color: 'red', fontWeight: 'bold'}}><ExclamationCircleOutlined /> CẢNH BÁO QUAN TRỌNG</span>,
        icon: null,
        width: 600,
        content: (
            <div style={{fontSize: 16, marginTop: 10, textAlign: 'justify'}}>
                Bằng việc sử dụng chức năng này, bạn xác nhận đã kiểm tra đầy đủ các hạng mục trong checklist thiết bị. 
                <br /><br />
                <b>Bạn sẽ chịu hoàn toàn trách nhiệm về tính chính xác của kết quả kiểm tra cũng như các vấn đề phát sinh liên quan trong hiện tại và tương lai.</b>
            </div>
        ),
        okText: "Chấp nhận (Đồng ý tích Đạt)",
        cancelText: "Từ chối",
        okButtonProps: { danger: true, size: 'large' },
        cancelButtonProps: { size: 'large' },
        onOk: () => {
             // Logic tích tất cả là ĐẠT
             const newResults = { ...results };
             let count = 0;

             group.items.forEach(item => {
                 // Chỉ những mục có hiển thị (có requirements) và là checkbox (không phải điền số)
                 if (item.requirements?.[currentLevel] && item.type !== 'input_number') {
                     newResults[item.code] = {
                         ...newResults[item.code],
                         status: 'pass'
                     };
                     count++;
                 }
             });

             setResults(newResults);
             onChange(Object.values(newResults));
             message.success(`Đã tích ĐẠT cho ${count} mục của nhóm ${group.category}`);
        }
     });
  }

  return (
    <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "10px" }}>
      {templateData.map((group, idx) => {
        // FILTERING: Allow items if requirement is not empty/null
        const visibleItems = group.items.filter(
          (item) => item.requirements?.[currentLevel]
        );

        // If no items in this group match the level, hide the whole card
        if (visibleItems.length === 0) return null;

        return (
          <Card
            title={group.category}
            key={idx}
            size="small"
            style={{ marginBottom: 15 }}
            extra={
                <Button 
                    size="small" 
                    type="dashed" 
                    danger
                    icon={<CheckSquareOutlined />} 
                    onClick={() => handleSelectAll(group)}
                >
                    Chọn tất cả (Đạt)
                </Button>
            }
          >
            <Table
              dataSource={visibleItems}
              rowKey="code"
              pagination={false}
              size="small"
              columns={[
                { title: "Hạng mục", dataIndex: "task", width: "40%" },
                {
                  title: "Yêu cầu",
                  key: "req",
                  width: "15%",
                  render: (_, r) => {
                    const req = r.requirements?.[currentLevel];
                    return <Tag color="blue">{req}</Tag>;
                  },
                },
                {
                  title: "Thực hiện",
                  key: "action",
                  width: "25%",
                  render: (_, r) => {
                    const req = r.requirements?.[currentLevel];
                    
                    if (r.type === "input_number" || req === "M") {
                      return (
                        <Input
                          placeholder="Thông số..."
                          onChange={(e) =>
                            handleUpdate(
                              r,
                              group.category,
                              "value",
                              e.target.value
                            )
                          }
                        />
                      );
                    }
                    return (
                      <Radio.Group
                        onChange={(e) =>
                          handleUpdate(
                            r,
                            group.category,
                            "status",
                            e.target.value === "pass"
                          )
                        }
                        value={results[r.code]?.status === 'pass' ? 'pass' : (results[r.code]?.status === 'fail' ? 'fail' : null)}
                      >
                        <Radio value="pass" style={{ color: "green" }}>
                          Đạt
                        </Radio>
                        <Radio value="fail" style={{ color: "red" }}>
                          Không
                        </Radio>
                      </Radio.Group>
                    );
                  },
                },
                {
                  title: "Ghi chú",
                  key: "note",
                  render: (_, r) => (
                      <Input
                        onChange={(e) =>
                          handleUpdate(r, group.category, "note", e.target.value)
                        }
                      />
                  ),
                },
              ]}
            />
          </Card>
        );
      })}
    </div>
  );
};

export default ChecklistExecutor;
