import React, { useEffect, useState, useCallback } from "react";
import {
    Card,
    Row,
    Col,
    Button,
    Select,
    DatePicker,
    Table,
    Tag,
    Avatar,
    Progress,
    Space,
    Segmented,
    Spin,
    Tooltip,
    message,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    TrophyOutlined,
    FileExcelOutlined,
    PrinterOutlined,
    ReloadOutlined,
    UserOutlined,
    TeamOutlined,
    CheckCircleOutlined,
    CrownOutlined,
    EyeOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import {
    IKpiDepartmentRow,
    IKpiEmployeeRow,
    IKpiEmployeeTaskItem,
    IKpiEvaluationReportData,
    KpiGradeType,
} from "../../../types/tasks.types";
import { IDepartment } from "../../../types/user.types";
import { getKpiEvaluationReport } from "../../../apis/tasks";
import { getBackendImageUrl } from "../../../utils/imageUrl";
import { TASK_STATUS_CONFIG } from "../taskConstants";

interface KpiEvaluationViewProps {
    departments: IDepartment[];
    onOpenDetail: (taskId: number) => void;
}

export const GRADE_STYLE_CONFIG: Record<
    KpiGradeType,
    { label: string; color: string; bg: string; border: string; tagColor: string }
> = {
    "A+": {
        label: "Loại A+ (Hoàn thành xuất sắc)",
        color: "#15803d",
        bg: "#dcfce7",
        border: "#86efac",
        tagColor: "success",
    },
    A: {
        label: "Loại A (Hoàn thành tốt)",
        color: "#1d4ed8",
        bg: "#dbeafe",
        border: "#93c5fd",
        tagColor: "processing",
    },
    B: {
        label: "Loại B (Hoàn thành nhiệm vụ)",
        color: "#b45309",
        bg: "#fef3c7",
        border: "#fde68a",
        tagColor: "warning",
    },
    C: {
        label: "Loại C (Cần chấn chỉnh)",
        color: "#b91c1c",
        bg: "#fee2e2",
        border: "#fca5a5",
        tagColor: "error",
    },
};

const KpiEvaluationView: React.FC<KpiEvaluationViewProps> = ({
    departments,
    onOpenDetail,
}) => {
    const [report, setReport] = useState<IKpiEvaluationReportData | null>(null);
    const [loading, setLoading] = useState(false);

    // Filter state
    const [periodType, setPeriodType] = useState<
        "ALL" | "MONTH" | "QUARTER" | "YEAR"
    >("ALL");
    const [monthVal, setMonthVal] = useState<dayjs.Dayjs>(dayjs());
    const [quarterVal, setQuarterVal] = useState<string>(
        `${dayjs().year()}-Q${Math.ceil((dayjs().month() + 1) / 3)}`
    );
    const [yearVal, setYearVal] = useState<dayjs.Dayjs>(dayjs());
    const [deptId, setDeptId] = useState<number | undefined>(undefined);
    const [rankingMode, setRankingMode] = useState<"EMPLOYEE" | "DEPARTMENT">(
        "EMPLOYEE"
    );

    const computePeriodValue = useCallback((): string | undefined => {
        if (periodType === "MONTH") return monthVal.format("YYYY-MM");
        if (periodType === "QUARTER") return quarterVal;
        if (periodType === "YEAR") return yearVal.format("YYYY");
        return undefined;
    }, [periodType, monthVal, quarterVal, yearVal]);

    const fetchKpiReport = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getKpiEvaluationReport({
                period_type: periodType,
                period_value: computePeriodValue(),
                dept_id: deptId,
            });
            setReport(data);
        } catch (err) {
            message.error(
                err instanceof Error
                    ? err.message
                    : "Không thể tải báo cáo đánh giá KPI"
            );
        } finally {
            setLoading(false);
        }
    }, [periodType, computePeriodValue, deptId]);

    useEffect(() => {
        fetchKpiReport();
    }, [fetchKpiReport]);

    // ─────────────────────────── EXPORT EXCEL (.XLSX) ───────────────────────────
    const handleExportExcel = () => {
        if (!report) return;

        const empSheetData = report.employeeRanking.map((r) => ({
            "Hạng": r.rank,
            "Họ và tên": r.name,
            "Chức danh": r.position || "",
            "Đơn vị / Phòng ban": r.dept_name,
            "Tổng việc được giao": r.totalAssigned,
            "Hoàn thành đúng hạn": r.completedOnTime,
            "Hoàn thành trễ hạn": r.completedLate,
            "Đang thực hiện": r.inProgress,
            "Quá hạn chưa xong": r.overdueUnfinished,
            "Tỷ lệ hoàn thành (%)": r.completionRate,
            "Tỷ lệ đúng hạn (%)": r.onTimeRate,
            "Tổng hệ số KPI": r.totalWeight,
            "Điểm KPI cộng": r.earnedKpiScore,
            "Điểm trừ quá hạn": r.penaltyScore,
            "Điểm KPI ròng": r.netKpiScore,
            "Xếp loại thi đua": r.grade,
            "Đánh giá": r.gradeLabel,
        }));

        const deptSheetData = report.departmentRanking.map((d) => ({
            "Hạng": d.rank,
            "Đơn vị / Phòng ban": d.dept_name,
            "Số nhân sự": d.memberCount,
            "Tổng việc": d.totalAssigned,
            "Đã hoàn thành": d.completedTotal,
            "Hoàn thành đúng hạn": d.completedOnTime,
            "Đang quá hạn": d.overdueUnfinished,
            "Tỷ lệ hoàn thành (%)": d.completionRate,
            "Tỷ lệ đúng hạn (%)": d.onTimeRate,
            "Tổng điểm KPI đơn vị": d.netKpiScore,
            "Điểm KPI TB / người": d.avgScorePerMember,
            "Xếp loại đơn vị": `${d.grade} - ${d.gradeLabel}`,
        }));

        const detailTasksData: Array<Record<string, string | number>> = [];
        report.employeeRanking.forEach((emp) => {
            emp.tasks.forEach((t) => {
                detailTasksData.push({
                    "Nhân sự thực hiện": emp.name,
                    "Đơn vị": emp.dept_name,
                    "Mã CV": t.code,
                    "Tên công việc": t.title,
                    "Trạng thái":
                        TASK_STATUS_CONFIG[t.status]?.label || t.status,
                    "Hạn hoàn thành": dayjs(t.deadline).format(
                        "DD/MM/YYYY HH:mm"
                    ),
                    "Ngày hoàn thành": t.completed_at
                        ? dayjs(t.completed_at).format("DD/MM/YYYY HH:mm")
                        : "Chưa xong",
                    "Tiến độ hạn": t.onTime ? "Đúng hạn" : "Trễ / Quá hạn",
                    "Trọng số KPI": t.kpi_weight,
                    "Điểm KPI đạt": t.kpi_score ?? 0,
                });
            });
        });

        const wb = XLSX.utils.book_new();
        const wsEmp = XLSX.utils.json_to_sheet(empSheetData);
        const wsDept = XLSX.utils.json_to_sheet(deptSheetData);
        const wsDetail = XLSX.utils.json_to_sheet(detailTasksData);

        XLSX.utils.book_append_sheet(wb, wsEmp, "XepHang_KPI_CaNhan");
        XLSX.utils.book_append_sheet(wb, wsDept, "XepHang_TapThe");
        XLSX.utils.book_append_sheet(wb, wsDetail, "ChiTiet_DauViec");

        const fileName = `Bao_Cao_KPI_Thi_Dua_${dayjs().format("YYYYMMDD_HHmm")}.xlsx`;
        XLSX.writeFile(wb, fileName);
        message.success(`Đã xuất báo cáo Excel: ${fileName}`);
    };

    // ─────────────────────────── PRINT / EXPORT PDF (A4 STANDARD) ───────────────────────────
    const handlePrintPdfReport = () => {
        if (!report) return;
        const printWindow = window.open("", "_blank", "width=1050,height=800");
        if (!printWindow) {
            message.warning("Vui lòng cho phép mở cửa sổ bật lên (Pop-up) để in báo cáo");
            return;
        }

        const rowsHtml = report.employeeRanking
            .map(
                (r) => `
                <tr>
                    <td style="text-align:center;font-weight:bold;">${r.rank}</td>
                    <td><strong>${r.name}</strong><br/><span style="font-size:11px;color:#555;">${
                    r.position || ""
                }</span></td>
                    <td>${r.dept_name}</td>
                    <td style="text-align:center;">${r.totalAssigned}</td>
                    <td style="text-align:center;">${r.completedOnTime}</td>
                    <td style="text-align:center;">${r.completedLate}</td>
                    <td style="text-align:center;color:${
                        r.overdueUnfinished > 0 ? "#dc2626" : "#333"
                    };font-weight:bold;">${r.overdueUnfinished}</td>
                    <td style="text-align:center;">${r.completionRate}%</td>
                    <td style="text-align:center;">${r.onTimeRate}%</td>
                    <td style="text-align:center;font-weight:bold;color:#1d4ed8;">${
                        r.netKpiScore
                    }</td>
                    <td style="text-align:center;font-weight:bold;">Loại ${
                        r.grade
                    }<br/><span style="font-size:11px;font-weight:normal;">${
                    r.gradeLabel
                }</span></td>
                </tr>`
            )
            .join("");

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="vi">
            <head>
                <meta charset="UTF-8" />
                <title>Báo cáo Đánh giá KPI & Bình xét Thi đua - ${report.periodLabel}</title>
                <style>
                    body { font-family: "Times New Roman", Times, serif; padding: 24px 32px; color: #111; }
                    .header-table { width: 100%; margin-bottom: 20px; border: none; }
                    .header-table td { border: none; text-align: center; vertical-align: top; }
                    h1 { font-size: 18px; text-transform: uppercase; margin: 12px 0 4px; text-align: center; }
                    .sub { text-align: center; font-size: 14px; font-style: italic; margin-bottom: 18px; }
                    table.data { width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px; }
                    table.data th, table.data td { border: 1px solid #333; padding: 6px 8px; }
                    table.data th { background: #f1f5f9; text-align: center; font-weight: bold; }
                    .sign-table { width: 100%; margin-top: 32px; border: none; }
                    .sign-table td { border: none; text-align: center; width: 33%; vertical-align: top; }
                    @media print {
                        @page { size: A4 landscape; margin: 12mm; }
                    }
                </style>
            </head>
            <body>
                <table class="header-table">
                    <tr>
                        <td style="width:45%;">
                            <strong>CẢNG HÀNG KHÔNG CÔN ĐẢO</strong><br/>
                            <span>HỆ THỐNG QUẢN LÝ CÔNG VIỆC & KPI</span>
                            <hr style="width:120px;border:0.5px solid #333;" />
                        </td>
                        <td style="width:55%;">
                            <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br/>
                            <strong>Độc lập - Tự do - Hạnh phúc</strong>
                            <hr style="width:160px;border:0.5px solid #333;" />
                        </td>
                    </tr>
                </table>

                <h1>BẢNG TỔNG HỢP ĐÁNH GIÁ KPI & BÌNH XÉT THI ĐUA CÔNG VIỆC</h1>
                <div class="sub">Kỳ đánh giá: ${report.periodLabel} — Ngày xuất báo cáo: ${dayjs().format(
            "DD/MM/YYYY HH:mm"
        )}</div>

                <table class="data">
                    <thead>
                        <tr>
                            <th>Hạng</th>
                            <th>Họ và tên / Chức danh</th>
                            <th>Đơn vị / Đội / Tổ</th>
                            <th>Tổng việc</th>
                            <th>Xong đúng hạn</th>
                            <th>Xong trễ hạn</th>
                            <th>Đang quá hạn</th>
                            <th>Tỷ lệ hoàn thành</th>
                            <th>Tỷ lệ đúng hạn</th>
                            <th>Điểm KPI ròng</th>
                            <th>Xếp loại thi đua</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rowsHtml || '<tr><td colspan="11" style="text-align:center;">Chưa có dữ liệu công việc trong kỳ</td></tr>'}
                    </tbody>
                </table>

                <table class="sign-table">
                    <tr>
                        <td>
                            <strong>NGƯỜI LẬP BIỂU</strong><br/>
                            <em>(Ký, ghi rõ họ tên)</em>
                        </td>
                        <td>
                            <strong>PHÒNG NHÂN SỰ / HÀNH CHÍNH</strong><br/>
                            <em>(Thẩm định kết quả)</em>
                        </td>
                        <td>
                            <strong>BAN GIÁM ĐỐC PHÊ DUYỆT</strong><br/>
                            <em>(Ký tên, đóng dấu)</em>
                        </td>
                    </tr>
                </table>
                <script>
                    window.onload = function() { window.print(); };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    if (loading && !report) {
        return (
            <div
                style={{
                    height: 400,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <Spin size="large" tip="Đang tính toán điểm KPI & xếp hạng thi đua..." />
            </div>
        );
    }

    if (!report) return null;

    // ─────────────────────────── EMPLOYEE RANKING COLUMNS ───────────────────────────
    const employeeColumns: ColumnsType<IKpiEmployeeRow> = [
        {
            title: "Hạng",
            dataIndex: "rank",
            key: "rank",
            width: 70,
            align: "center",
            render: (rank: number) => {
                if (rank === 1) {
                    return (
                        <Tag
                            color="gold"
                            style={{ fontWeight: 800, fontSize: 13, margin: 0 }}
                        >
                            🥇 #1
                        </Tag>
                    );
                }
                if (rank === 2) {
                    return (
                        <Tag
                            color="silver"
                            style={{ fontWeight: 800, fontSize: 13, margin: 0 }}
                        >
                            🥈 #2
                        </Tag>
                    );
                }
                if (rank === 3) {
                    return (
                        <Tag
                            color="orange"
                            style={{ fontWeight: 800, fontSize: 13, margin: 0 }}
                        >
                            🥉 #3
                        </Tag>
                    );
                }
                return (
                    <span style={{ fontWeight: 700, color: "#64748b" }}>
                        #{rank}
                    </span>
                );
            },
        },
        {
            title: "Nhân sự được đánh giá",
            key: "employee",
            width: 220,
            render: (_: unknown, r: IKpiEmployeeRow) => (
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Avatar
                        size={30}
                        src={getBackendImageUrl(r.avatar)}
                        icon={<UserOutlined />}
                        style={{ backgroundColor: "#1d4ed8" }}
                    />
                    <div>
                        <div style={{ fontWeight: 700, color: "#0f172a" }}>
                            {r.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748b" }}>
                            {r.position ? `${r.position} • ` : ""}
                            {r.dept_name}
                        </div>
                    </div>
                </div>
            ),
        },
        {
            title: "Tổng việc",
            dataIndex: "totalAssigned",
            key: "totalAssigned",
            width: 90,
            align: "center",
            sorter: (a, b) => a.totalAssigned - b.totalAssigned,
            render: (v: number) => <strong>{v}</strong>,
        },
        {
            title: "Đúng hạn / Trễ / Quá hạn",
            key: "breakdown",
            width: 190,
            align: "center",
            render: (_: unknown, r: IKpiEmployeeRow) => (
                <Space size={4}>
                    <Tooltip title="Hoàn thành đúng hạn">
                        <Tag color="green" style={{ margin: 0, fontWeight: 600 }}>
                            ✓ {r.completedOnTime}
                        </Tag>
                    </Tooltip>
                    <Tooltip title="Hoàn thành trễ hạn">
                        <Tag color="orange" style={{ margin: 0, fontWeight: 600 }}>
                            Trễ {r.completedLate}
                        </Tag>
                    </Tooltip>
                    {r.overdueUnfinished > 0 && (
                        <Tooltip title="Đang quá hạn chưa hoàn thành (bị trừ điểm)">
                            <Tag color="red" style={{ margin: 0, fontWeight: 700 }}>
                                Quá hạn {r.overdueUnfinished}
                            </Tag>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
        {
            title: "Tỷ lệ đúng hạn",
            dataIndex: "onTimeRate",
            key: "onTimeRate",
            width: 150,
            sorter: (a, b) => a.onTimeRate - b.onTimeRate,
            render: (rate: number) => (
                <Progress
                    percent={rate}
                    size="small"
                    strokeColor={
                        rate >= 85 ? "#16a34a" : rate >= 65 ? "#d97706" : "#dc2626"
                    }
                />
            ),
        },
        {
            title: "Điểm cộng / Điểm trừ",
            key: "scoreDetail",
            width: 155,
            align: "center",
            render: (_: unknown, r: IKpiEmployeeRow) => (
                <div style={{ fontSize: 12 }}>
                    <span style={{ color: "#15803d", fontWeight: 700 }}>
                        +{r.earnedKpiScore}
                    </span>
                    {" / "}
                    <span
                        style={{
                            color: r.penaltyScore > 0 ? "#dc2626" : "#94a3b8",
                            fontWeight: 600,
                        }}
                    >
                        -{r.penaltyScore}
                    </span>
                </div>
            ),
        },
        {
            title: "Điểm KPI ròng",
            dataIndex: "netKpiScore",
            key: "netKpiScore",
            width: 130,
            align: "center",
            sorter: (a, b) => a.netKpiScore - b.netKpiScore,
            render: (score: number) => (
                <Tag
                    color="geekblue"
                    icon={<TrophyOutlined />}
                    style={{ fontSize: 13, fontWeight: 800, padding: "2px 10px" }}
                >
                    {score} điểm
                </Tag>
            ),
        },
        {
            title: "Xếp loại Thi đua",
            key: "grade",
            width: 210,
            align: "center",
            render: (_: unknown, r: IKpiEmployeeRow) => {
                const gCfg =
                    GRADE_STYLE_CONFIG[r.grade] || GRADE_STYLE_CONFIG.B;
                return (
                    <span
                        style={{
                            display: "inline-block",
                            padding: "3px 12px",
                            borderRadius: 999,
                            background: gCfg.bg,
                            color: gCfg.color,
                            border: `1px solid ${gCfg.border}`,
                            fontWeight: 700,
                            fontSize: 12,
                        }}
                    >
                        {gCfg.label}
                    </span>
                );
            },
        },
    ];

    // ─────────────────────────── DEPARTMENT RANKING COLUMNS ───────────────────────────
    const deptColumns: ColumnsType<IKpiDepartmentRow> = [
        {
            title: "Hạng",
            dataIndex: "rank",
            key: "rank",
            width: 80,
            align: "center",
            render: (rank: number) => (
                <Tag
                    color={rank === 1 ? "gold" : rank === 2 ? "cyan" : "default"}
                    style={{ fontWeight: 700 }}
                >
                    #{rank}
                </Tag>
            ),
        },
        {
            title: "Đơn vị / Phòng ban / Đội",
            dataIndex: "dept_name",
            key: "dept_name",
            render: (name: string) => (
                <span style={{ fontWeight: 700, color: "#0f172a" }}>{name}</span>
            ),
        },
        {
            title: "Nhân sự tham gia",
            dataIndex: "memberCount",
            key: "memberCount",
            align: "center",
            render: (v: number) => `${v} người`,
        },
        {
            title: "Tổng việc",
            dataIndex: "totalAssigned",
            key: "totalAssigned",
            align: "center",
            render: (v: number) => <strong>{v}</strong>,
        },
        {
            title: "Đã hoàn thành",
            dataIndex: "completedTotal",
            key: "completedTotal",
            align: "center",
            render: (v: number, r: IKpiDepartmentRow) => (
                <span>
                    <strong>{v}</strong> ({r.completionRate}%)
                </span>
            ),
        },
        {
            title: "Tỷ lệ đúng hạn",
            dataIndex: "onTimeRate",
            key: "onTimeRate",
            width: 170,
            render: (rate: number) => (
                <Progress
                    percent={rate}
                    size="small"
                    strokeColor={rate >= 85 ? "#16a34a" : "#d97706"}
                />
            ),
        },
        {
            title: "Tổng điểm KPI Đơn vị",
            dataIndex: "netKpiScore",
            key: "netKpiScore",
            align: "center",
            render: (v: number, r: IKpiDepartmentRow) => (
                <div>
                    <Tag color="geekblue" style={{ fontWeight: 700 }}>
                        {v} điểm
                    </Tag>
                    <div style={{ fontSize: 11, color: "#64748b" }}>
                        TB: {r.avgScorePerMember} đ/người
                    </div>
                </div>
            ),
        },
        {
            title: "Xếp loại Tập thể",
            key: "grade",
            align: "center",
            render: (_: unknown, r: IKpiDepartmentRow) => {
                const gCfg =
                    GRADE_STYLE_CONFIG[r.grade] || GRADE_STYLE_CONFIG.B;
                return (
                    <span
                        style={{
                            display: "inline-block",
                            padding: "3px 12px",
                            borderRadius: 999,
                            background: gCfg.bg,
                            color: gCfg.color,
                            border: `1px solid ${gCfg.border}`,
                            fontWeight: 700,
                            fontSize: 12,
                        }}
                    >
                        {gCfg.label}
                    </span>
                );
            },
        },
    ];

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* ─────────────── TOP FILTER & EXPORT BAR ─────────────── */}
            <Card
                size="small"
                style={{
                    borderRadius: 12,
                    background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
                    color: "#fff",
                    border: "1px solid #334155",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: 12,
                    }}
                >
                    <div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 16,
                                fontWeight: 700,
                                color: "#f8fafc",
                            }}
                        >
                            <CrownOutlined style={{ color: "#fbbf24" }} />
                            <span>
                                Đánh giá KPI, Bình xét Thi đua & Xuất Báo cáo (
                                {report.periodLabel})
                            </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 2 }}>
                            Quy chuẩn: Hoàn thành đúng hạn (+10 × Hệ số), Hoàn thành trễ
                            hạn (+5 × Hệ số), Quá hạn chưa xong (-2 × Hệ số)
                        </div>
                    </div>

                    <Space wrap>
                        <Select
                            value={periodType}
                            onChange={(val) => setPeriodType(val)}
                            style={{ width: 150 }}
                            options={[
                                { value: "ALL", label: "Toàn thời gian" },
                                { value: "MONTH", label: "Theo Tháng" },
                                { value: "QUARTER", label: "Theo Quý" },
                                { value: "YEAR", label: "Theo Năm" },
                            ]}
                        />

                        {periodType === "MONTH" && (
                            <DatePicker
                                picker="month"
                                format="MM/YYYY"
                                value={monthVal}
                                onChange={(val) => val && setMonthVal(val)}
                            />
                        )}

                        {periodType === "QUARTER" && (
                            <Select
                                value={quarterVal}
                                onChange={(val) => setQuarterVal(val)}
                                style={{ width: 130 }}
                                options={[
                                    {
                                        value: `${dayjs().year()}-Q1`,
                                        label: `Quý 1/${dayjs().year()}`,
                                    },
                                    {
                                        value: `${dayjs().year()}-Q2`,
                                        label: `Quý 2/${dayjs().year()}`,
                                    },
                                    {
                                        value: `${dayjs().year()}-Q3`,
                                        label: `Quý 3/${dayjs().year()}`,
                                    },
                                    {
                                        value: `${dayjs().year()}-Q4`,
                                        label: `Quý 4/${dayjs().year()}`,
                                    },
                                ]}
                            />
                        )}

                        {periodType === "YEAR" && (
                            <DatePicker
                                picker="year"
                                value={yearVal}
                                onChange={(val) => val && setYearVal(val)}
                            />
                        )}

                        <Select
                            allowClear
                            placeholder="Tất cả Đơn vị"
                            style={{ width: 170 }}
                            value={deptId}
                            onChange={(val) => setDeptId(val)}
                            options={departments.map((d) => ({
                                value: d.dept_id,
                                label: d.name,
                            }))}
                        />

                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchKpiReport}
                            loading={loading}
                        />

                        <Button
                            type="primary"
                            icon={<FileExcelOutlined />}
                            onClick={handleExportExcel}
                            style={{
                                background: "#16a34a",
                                borderColor: "#16a34a",
                                fontWeight: 600,
                            }}
                        >
                            Xuất Excel (.xlsx)
                        </Button>

                        <Button
                            type="primary"
                            icon={<PrinterOutlined />}
                            onClick={handlePrintPdfReport}
                            style={{
                                background: "#2563eb",
                                borderColor: "#2563eb",
                                fontWeight: 600,
                            }}
                        >
                            In biểu mẫu PDF (A4)
                        </Button>
                    </Space>
                </div>
            </Card>

            {/* ─────────────── ROW 1: 4 EMULATION GRADE SUMMARY CARDS ─────────────── */}
            <Row gutter={[14, 14]}>
                {(
                    [
                        {
                            grade: "A+" as KpiGradeType,
                            count: report.summary.gradeCounts.A_PLUS,
                            desc: "Hoàn thành ≥ 90%, đúng hạn ≥ 90%, 0 việc quá hạn",
                        },
                        {
                            grade: "A" as KpiGradeType,
                            count: report.summary.gradeCounts.A,
                            desc: "Hoàn thành ≥ 75%, đúng hạn ≥ 75%, tối đa 1 việc trễ",
                        },
                        {
                            grade: "B" as KpiGradeType,
                            count: report.summary.gradeCounts.B,
                            desc: "Hoàn thành ≥ 50% khối lượng công việc được giao",
                        },
                        {
                            grade: "C" as KpiGradeType,
                            count: report.summary.gradeCounts.C,
                            desc: "Tỷ lệ hoàn thành < 50% hoặc tồn đọng việc quá hạn",
                        },
                    ] as const
                ).map((item) => {
                    const cfg = GRADE_STYLE_CONFIG[item.grade];
                    return (
                        <Col xs={24} sm={12} lg={6} key={item.grade}>
                            <Card
                                size="small"
                                style={{
                                    borderRadius: 12,
                                    background: cfg.bg,
                                    border: `1px solid ${cfg.border}`,
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: 12.5,
                                        fontWeight: 700,
                                        color: cfg.color,
                                    }}
                                >
                                    {cfg.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: 28,
                                        fontWeight: 800,
                                        color: cfg.color,
                                        margin: "4px 0",
                                    }}
                                >
                                    {item.count}{" "}
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>
                                        nhân sự
                                    </span>
                                </div>
                                <div style={{ fontSize: 11.5, color: "#475569" }}>
                                    {item.desc}
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            {/* ─────────────── ROW 2: RANKING TABLE WITH EXPANDABLE TASK BREAKDOWN ─────────────── */}
            <Card
                size="small"
                style={{ borderRadius: 12, border: "1px solid #e2e8f0" }}
                title={
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 8,
                        }}
                    >
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <TrophyOutlined style={{ color: "#d97706", fontSize: 16 }} />
                            <span style={{ fontWeight: 700, color: "#0f172a" }}>
                                Bảng Tổng hợp Điểm KPI & Xếp hạng Thi đua ({report.periodLabel})
                            </span>
                        </div>

                        <Segmented
                            value={rankingMode}
                            onChange={(val) =>
                                setRankingMode(val as "EMPLOYEE" | "DEPARTMENT")
                            }
                            options={[
                                {
                                    label: `Xếp hạng Cá nhân (${report.employeeRanking.length})`,
                                    value: "EMPLOYEE",
                                    icon: <UserOutlined />,
                                },
                                {
                                    label: `Xếp hạng Tập thể Đơn vị (${report.departmentRanking.length})`,
                                    value: "DEPARTMENT",
                                    icon: <TeamOutlined />,
                                },
                            ]}
                        />
                    </div>
                }
            >
                {rankingMode === "EMPLOYEE" ? (
                    <Table
                        rowKey="user_id"
                        size="small"
                        columns={employeeColumns}
                        dataSource={report.employeeRanking}
                        pagination={{ pageSize: 10 }}
                        expandable={{
                            expandedRowRender: (record: IKpiEmployeeRow) => (
                                <div
                                    style={{
                                        background: "#f8fafc",
                                        padding: 12,
                                        borderRadius: 10,
                                        border: "1px solid #e2e8f0",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            fontSize: 13,
                                            color: "#1e293b",
                                            marginBottom: 8,
                                        }}
                                    >
                                        Chi tiết các đầu việc cấu thành điểm KPI của{" "}
                                        {record.name} ({record.tasks.length} công việc):
                                    </div>
                                    <Table<IKpiEmployeeTaskItem>
                                        rowKey="id"
                                        size="small"
                                        pagination={false}
                                        dataSource={record.tasks}
                                        columns={[
                                            {
                                                title: "Mã CV",
                                                dataIndex: "code",
                                                key: "code",
                                                width: 115,
                                                render: (code: string, t) => (
                                                    <Tag
                                                        color="blue"
                                                        style={{
                                                            cursor: "pointer",
                                                            fontWeight: 600,
                                                        }}
                                                        onClick={() => onOpenDetail(t.id)}
                                                    >
                                                        {code}
                                                    </Tag>
                                                ),
                                            },
                                            {
                                                title: "Tên công việc",
                                                dataIndex: "title",
                                                key: "title",
                                                render: (title: string, t) => (
                                                    <span
                                                        style={{
                                                            fontWeight: 600,
                                                            cursor: "pointer",
                                                            color: "#0f172a",
                                                        }}
                                                        onClick={() => onOpenDetail(t.id)}
                                                    >
                                                        {title}
                                                    </span>
                                                ),
                                            },
                                            {
                                                title: "Trạng thái",
                                                dataIndex: "status",
                                                key: "status",
                                                width: 140,
                                                render: (st: IKpiEmployeeTaskItem["status"]) => {
                                                    const cfg =
                                                        TASK_STATUS_CONFIG[st] ||
                                                        TASK_STATUS_CONFIG.NEW;
                                                    return (
                                                        <Tag color={cfg.color}>
                                                            {cfg.label}
                                                        </Tag>
                                                    );
                                                },
                                            },
                                            {
                                                title: "Hạn hoàn thành",
                                                dataIndex: "deadline",
                                                key: "deadline",
                                                width: 145,
                                                render: (d: string) =>
                                                    dayjs(d).format("DD/MM/YYYY HH:mm"),
                                            },
                                            {
                                                title: "Đánh giá hạn",
                                                key: "onTime",
                                                width: 130,
                                                align: "center",
                                                render: (_: unknown, t) =>
                                                    t.onTime ? (
                                                        <Tag
                                                            color="green"
                                                            icon={<CheckCircleOutlined />}
                                                        >
                                                            Đúng hạn
                                                        </Tag>
                                                    ) : (
                                                        <Tag color="red">
                                                            Trễ / Quá hạn
                                                        </Tag>
                                                    ),
                                            },
                                            {
                                                title: "Hệ số KPI",
                                                dataIndex: "kpi_weight",
                                                key: "kpi_weight",
                                                width: 90,
                                                align: "center",
                                            },
                                            {
                                                title: "Điểm KPI đạt",
                                                dataIndex: "kpi_score",
                                                key: "kpi_score",
                                                width: 115,
                                                align: "center",
                                                render: (sc?: number | null) =>
                                                    sc !== null && sc !== undefined ? (
                                                        <Tag color="gold">
                                                            +{sc} điểm
                                                        </Tag>
                                                    ) : (
                                                        <span style={{ color: "#94a3b8" }}>
                                                            Chưa duyệt
                                                        </span>
                                                    ),
                                            },
                                            {
                                                title: "",
                                                key: "view",
                                                width: 80,
                                                align: "center",
                                                render: (_: unknown, t) => (
                                                    <Button
                                                        size="small"
                                                        type="link"
                                                        icon={<EyeOutlined />}
                                                        onClick={() => onOpenDetail(t.id)}
                                                    >
                                                        Xem
                                                    </Button>
                                                ),
                                            },
                                        ]}
                                    />
                                </div>
                            ),
                        }}
                    />
                ) : (
                    <Table
                        rowKey="dept_name"
                        size="small"
                        columns={deptColumns}
                        dataSource={report.departmentRanking}
                        pagination={{ pageSize: 10 }}
                    />
                )}
            </Card>
        </div>
    );
};

export default KpiEvaluationView;
