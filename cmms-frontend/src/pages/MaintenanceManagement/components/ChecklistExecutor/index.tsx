import React, { useEffect, useState } from "react";
import { Card, Table, Radio, Input, Tag } from "antd";
import { TemplateGroup } from "../../../../types/maintenance.types";

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
  }, [templateData, currentLevel]);

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

  return (
    <div style={{ maxHeight: "60vh", overflowY: "auto", padding: "10px" }}>
      {templateData.map((group, idx) => (
        <Card
          title={group.category}
          key={idx}
          size="small"
          style={{ marginBottom: 15 }}
        >
          <Table
            dataSource={group.items}
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
                  return req ? (
                    <Tag color="blue">{req}</Tag>
                  ) : (
                    <span style={{ color: "#ccc" }}>-</span>
                  );
                },
              },
              {
                title: "Thực hiện",
                key: "action",
                width: "25%",
                render: (_, r) => {
                  const req = r.requirements?.[currentLevel];
                  if (!req) return null;

                  if (r.type === "input_number" || req === "M") {
                    return (
                      <Input
                        placeholder="Thông số..."
                        // --- SỬA 3: Truyền group.category vào hàm ---
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
                      // --- SỬA 4: Truyền group.category vào hàm ---
                      onChange={(e) =>
                        handleUpdate(
                          r,
                          group.category,
                          "status",
                          e.target.value === "pass"
                        )
                      }
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
                render: (_, r) =>
                  r.requirements?.[currentLevel] && (
                    <Input
                      // --- SỬA 5: Truyền group.category vào hàm ---
                      onChange={(e) =>
                        handleUpdate(r, group.category, "note", e.target.value)
                      }
                    />
                  ),
              },
            ]}
          />
        </Card>
      ))}
    </div>
  );
};

export default ChecklistExecutor;
