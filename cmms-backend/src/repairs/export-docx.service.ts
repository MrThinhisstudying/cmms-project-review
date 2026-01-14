import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import * as fs from 'fs';
import * as path from 'path';
import ImageModule from 'docxtemplater-image-module-free';
import { Repair } from './entities/repair.entity';
import axios from 'axios';

@Injectable()
export class ExportDocxService {
    private readonly logger = new Logger(ExportDocxService.name);
    // Path to templates/repairs at project root
    private readonly templatePath = path.join(__dirname, '..', '..', 'templates', 'repairs');
    private readonly tempDir = path.resolve(__dirname, '../../temp');

    constructor() {
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    async generateRepairDocx(repair: Repair, type: 'B03' | 'B04' | 'B05'): Promise<string> {
        const templateFile = path.join(this.templatePath, `${type}.docx`);
        if (!fs.existsSync(templateFile)) {
            throw new NotFoundException(`Template ${type}.docx chưa được tải lên hệ thống`);
        }

        const content = fs.readFileSync(templateFile, 'binary');
        const zip = new PizZip(content);

        const imageModule = new ImageModule({
            centered: false,
            fileType: 'docx',
            getImage: async (tagValue: string) => {
                try {
                    const response = await axios.get(tagValue, { responseType: 'arraybuffer' });
                    return Buffer.from(response.data);
                } catch (error) {
                    this.logger.error(`Error downloading image: ${tagValue}`, error);
                    return null;
                }
            },
            getSize: () => [100, 50], // Default size, adjust as needed or make dynamic
        });

        const doc = new Docxtemplater(zip, {
            modules: [imageModule],
            paragraphLoop: true,
            linebreaks: true,
        });

        const data = this.mapRepairData(repair, type);
        this.logger.debug(`Rendering data for ${type}:`, JSON.stringify(data, null, 2));
        
        // Render the document (async because of image module)
        await doc.renderAsync(data);

        const buf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
        const fileName = `${type}_${repair.repair_id}_${Date.now()}.docx`;
        const filePath = path.join(this.tempDir, fileName);

        fs.writeFileSync(filePath, buf as any);

        return filePath;
    }


    private mapRepairData(repair: Repair, type: string): any {
        // Common data
        const formatDateParts = (date: Date | undefined) => {
            if (!date) return { day: "...", month: "...", year: "..." };
            const d = new Date(date);
            return {
                day: d.getDate().toString().padStart(2, '0'),
                month: (d.getMonth() + 1).toString().padStart(2, '0'),
                year: d.getFullYear().toString()
            };
        };

        const formatDate = (date: Date | undefined) => {
            if (!date) return "";
            const d = new Date(date);
            return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        };

        // Date selection logic: Use specific form dates if available, else repair creation date
        const targetDate = type === 'B04' ? repair.inspection_created_at 
                         : type === 'B05' ? repair.acceptance_created_at 
                         : repair.created_at;
        
        const dateParts = formatDateParts(targetDate);

        const commonData = {
            id: repair.repair_id,
            device_name: repair.device?.name || "",
            plate_number: repair.device?.reg_number || "",
            reg_number: repair.device?.reg_number || "", // Alias for user template
            reason: repair.location_issue || "",
            solution: repair.recommendation || "", 
            author: repair.created_by?.name || "",
            date: formatDate(targetDate),
            day: dateParts.day,
            month: dateParts.month,
            year: dateParts.year,
            
            // Additional typical fields
            device_code: repair.device?.device_code || "",
            created_department: repair.created_department?.name || "",
            using_department: repair.created_department?.name || "", // Alias for user template
        };

        if (type === 'B03') {
            return {
                ...commonData,
                // B03 specific
            };
        }

        if (type === 'B04') {
            return {
                ...commonData,
                inspection_date: formatDate(repair.inspection_created_at),
                committee: repair.inspection_committee?.map((u, index) => ({
                    index: index + 1,
                    name: u.name,
                    role: u.position || u.role,
                    title: this.getCommitteeRoleTitle(u.role)
                })) || [],
                inspection_items: repair.inspection_items?.map((item, index) => ({
                    index: index + 1,
                    description: item.description,
                    cause: item.cause || "",
                    method: item.solution || "", // Maps solution -> method
                    result: "", // If needed, can be calculated or left empty
                    note: item.notes || ""
                })) || [],
                materials: repair.inspection_materials?.map((m: any, index) => ({
                    index: index + 1,
                    name: m.item_name,
                    specifications: m.specifications || m.code || m.item_code || `MA-${m.item_id}` || "",
                    unit: m.unit,
                    quantity: m.quantity,
                    note: m.notes
                })) || []
            };
        }

        if (type === 'B05') {
            // Aggregate all materials for B05
            const allMaterials: any[] = [];
            let matIndex = 1;

            // 1. Replaced Materials (Inspection Materials)
            if (repair.inspection_materials) {
                repair.inspection_materials.forEach(m => {
                    allMaterials.push({
                        index: matIndex++,
                        name: m.item_name || "Vật tư",
                        unit: m.unit || "",
                        qty_replace: m.quantity || 0,
                        qty_recovered: "",
                        percent_recovered: "",
                        qty_disposal: "",
                        percent_disposal: ""
                    });
                });
            }

            // 2. Recovered Materials
            if (repair.recovered_materials) {
                repair.recovered_materials.forEach(m => {
                    allMaterials.push({
                        index: matIndex++,
                        name: m.name,
                        unit: m.unit || "",
                        qty_replace: "",
                        qty_recovered: m.quantity || 0,
                        percent_recovered: m.damage_percentage ? `${m.damage_percentage}%` : "",
                        qty_disposal: "",
                        percent_disposal: ""
                    });
                });
            }

            // 3. Scrap Materials
            if (repair.materials_to_scrap) {
                repair.materials_to_scrap.forEach(m => {
                    allMaterials.push({
                        index: matIndex++,
                        name: m.name,
                        unit: m.unit || "",
                        qty_replace: "",
                        qty_recovered: "",
                        percent_recovered: "",
                        qty_disposal: m.quantity || 0,
                        percent_disposal: m.damage_percentage ? `${m.damage_percentage}%` : ""
                    });
                });
            }

            return {
                ...commonData,
                acceptance_date: formatDate(repair.acceptance_created_at),
                committee: repair.acceptance_committee?.map((u, index) => ({
                    index: index + 1,
                    name: u.name,
                    role: u.position || u.role,
                    title: this.getCommitteeRoleTitle(u.role)
                })) || [],
                failure_description: repair.failure_description,
                failure_cause: repair.failure_cause,
                conclusion: repair.acceptance_note,
                
                // Unified materials list
                all_materials: allMaterials
            };
        }

        return commonData;
    }

    private getCommitteeRoleTitle(role: string): string {
        const roleMap: Record<string, string> = {
            'TECHNICIAN': 'Cán bộ kỹ thuật',
            'TEAM_LEAD': 'Tổ trưởng',
            'UNIT_HEAD': 'Đội trưởng',
            'DIRECTOR': 'Ban Giám đốc',
            'OPERATOR': 'Người vận hành',
            'ADMIN': 'Quản lý'
        };
        return roleMap[role] || role;
    }
}
