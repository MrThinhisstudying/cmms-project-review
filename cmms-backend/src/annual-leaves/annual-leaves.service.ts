import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAnnualLeaveDto } from './dto/create-annual-leave.dto';
import { UpdateAnnualLeaveDto } from './dto/update-annual-leave.dto';
import { AnnualLeave } from './entities/annual-leave.entity';
import { LeaveHistory } from './entities/leave-history.entity';
import { User } from '../user/user.entity';
import { RecordLeaveDto } from './dto/record-leave.dto';

@Injectable()
export class AnnualLeavesService {
  constructor(
    @InjectRepository(AnnualLeave)
    private annualLeaveRepo: Repository<AnnualLeave>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(LeaveHistory)
    private leaveHistoryRepo: Repository<LeaveHistory>,
  ) {}

  async create(createDto: CreateAnnualLeaveDto) {
    const record = this.annualLeaveRepo.create(createDto);
    return this.annualLeaveRepo.save(record);
  }

  async findAll(year?: number) {
    const query = this.annualLeaveRepo.createQueryBuilder('leave')
      .leftJoinAndSelect('leave.user', 'user')
      .leftJoinAndSelect('user.department', 'department');
    
    if (year) {
      query.where('leave.year = :year', { year });
    }
    
    return query.getMany();
  }

  async findByUser(userId: number, year?: number) {
    const query = this.annualLeaveRepo.createQueryBuilder('leave')
      .leftJoinAndSelect('leave.user', 'user')
      .where('leave.user_id = :userId', { userId });
      
    if (year) {
      query.andWhere('leave.year = :year', { year });
    }

    return query.orderBy('leave.year', 'DESC').getMany();
  }

  async findLeaveHistoriesByUser(userId: number, year?: number) {
    const query = this.leaveHistoryRepo.createQueryBuilder('history')
      .where('history.user_id = :userId', { userId });
      
    if (year) {
      query.andWhere('history.year = :year', { year });
    }

    return query.orderBy('history.created_at', 'DESC').getMany();
  }

  async findOne(id: number) {
    const record = await this.annualLeaveRepo.findOne({
      where: { id },
      relations: ['user'],
    });
    if (!record) throw new NotFoundException();
    return record;
  }

  async update(id: number, updateDto: UpdateAnnualLeaveDto) {
    const record = await this.findOne(id);
    Object.assign(record, updateDto);
    return this.annualLeaveRepo.save(record);
  }

  async remove(id: number) {
    const record = await this.findOne(id);
    return this.annualLeaveRepo.remove(record);
  }

  async getMetrics(year: number) {
    const data = await this.annualLeaveRepo.find({ where: { year } });
    let totalEntitlement = 0;
    let totalTaken = 0;
    let totalCompensatoryQuota = 0;
    let totalCompensatoryTaken = 0;
    for (const r of data) {
      totalEntitlement += (Number(r.current_year_leave) || 0) + (Number(r.leave_balance_n1) || 0) + (Number(r.leave_balance_n2) || 0);
      totalTaken += (Number(r.m1_taken) || 0) + (Number(r.m2_taken) || 0) + (Number(r.m3_taken) || 0) + (Number(r.m4_taken) || 0) + 
                    (Number(r.m5_taken) || 0) + (Number(r.m6_taken) || 0) + (Number(r.m7_taken) || 0) + (Number(r.m8_taken) || 0) + 
                    (Number(r.m9_taken) || 0) + (Number(r.m10_taken) || 0) + (Number(r.m11_taken) || 0) + (Number(r.m12_taken) || 0);
      totalCompensatoryQuota += Number(r.compensatory_leave_quota) || 0;
      totalCompensatoryTaken += Number(r.compensatory_leave_taken) || 0;
    }
    return {
      total_employees: data.length,
      total_entitlement: totalEntitlement,
      total_taken: totalTaken,
      total_remaining: totalEntitlement - totalTaken,
      total_compensatory_quota: totalCompensatoryQuota,
      total_compensatory_taken: totalCompensatoryTaken,
      total_compensatory_remaining: totalCompensatoryQuota - totalCompensatoryTaken,
    };
  }

  async bulkUpsert(data: any[]) {
    if (!data || !data.length) return { success: 0, errors: ['Không có dữ liệu nào được gửi'] };

    // Fetch all users to map by user_id, employee_code (with and without leading zeros), and name
    const allUsers = await this.userRepo.find();
    const userById = new Map<number, number>();
    const userByCode = new Map<string, number>();

    allUsers.forEach((u) => {
      userById.set(u.user_id, u.user_id);
      if (u.employee_code) {
        const raw = u.employee_code.trim().toLowerCase();
        userByCode.set(raw, u.user_id);
        const noZero = raw.replace(/^0+/, '');
        if (noZero) userByCode.set(noZero, u.user_id);
      }
    });

    let successCount = 0;
    const errors = [];

    for (const row of data) {
      if (!row.year) {
        errors.push(`Thiếu thông tin Năm`);
        continue;
      }

      let userId: number | undefined;
      if (row.user_id && userById.has(Number(row.user_id))) {
        userId = Number(row.user_id);
      } else if (row.employee_code) {
        const raw = String(row.employee_code).trim().toLowerCase();
        userId = userByCode.get(raw) || userByCode.get(raw.replace(/^0+/, ''));
      }

      if (!userId) {
        errors.push(`Không tìm thấy nhân viên: ${row.employee_code || row.name || row.user_id}`);
        continue;
      }

      // check if exist
      let record = await this.annualLeaveRepo.findOne({ where: { user_id: userId, year: Number(row.year) } });

      if (!record) {
        record = this.annualLeaveRepo.create({ user_id: userId, year: Number(row.year) });
      }
        
        // update fields
        if (row.leave_balance_n2 !== undefined) record.leave_balance_n2 = row.leave_balance_n2;
        if (row.leave_balance_n1 !== undefined) record.leave_balance_n1 = row.leave_balance_n1;
        if (row.current_year_leave !== undefined) record.current_year_leave = row.current_year_leave;
        if (row.compensatory_leave_quota !== undefined) record.compensatory_leave_quota = row.compensatory_leave_quota;
        if (row.compensatory_leave_taken !== undefined) record.compensatory_leave_taken = row.compensatory_leave_taken;
        
        // months
        for (let i = 1; i <= 12; i++) {
            const key = `m${i}_taken`;
            if (row[key] !== undefined) record[key] = row[key];
        }

        try {
            await this.annualLeaveRepo.save(record);
            successCount++;
        } catch (e: any) {
            errors.push(`Lỗi khi lưu cho MSNV ${row.employee_code}: ${e.message}`);
        }
    }

    return { success: successCount, errors };
  }

  async recordLeave(dto: RecordLeaveDto) {
    const {
      user_id,
      year,
      applied_month,
      days_taken,
      from_date,
      to_date,
      reason,
      location,
      attachments,
      leave_type = 'ANNUAL',
      document_number,
      approved_by,
      signed_date,
    } = dto;
    
    // Tìm hoặc tạo mới AnnualLeave record cho user trong năm
    let annualLeave = await this.annualLeaveRepo.findOne({ where: { user_id, year } });
    if (!annualLeave) {
        annualLeave = this.annualLeaveRepo.create({ user_id, year });
        await this.annualLeaveRepo.save(annualLeave);
    }

    // Phân loại xử lý trừ quỹ tương ứng
    if (leave_type === 'COMPENSATORY') {
        // Nghỉ bù: Cộng dồn vào số ngày nghỉ bù đã sử dụng (KHÔNG trừ vào phép năm)
        annualLeave.compensatory_leave_taken = (Number(annualLeave.compensatory_leave_taken) || 0) + Number(days_taken);
        await this.annualLeaveRepo.save(annualLeave);
    } else if (leave_type === 'ANNUAL') {
        // Phép năm: Cộng dồn phép vào tháng tương ứng
        const monthKey = `m${applied_month}_taken`;
        (annualLeave as any)[monthKey] = ((annualLeave as any)[monthKey] || 0) + Number(days_taken);
        await this.annualLeaveRepo.save(annualLeave);
    }
    // Các loại nghỉ khác (SPECIAL_PAID, SICK_LEAVE, UNPAID): Lưu lịch sử nhưng không trừ phép năm hay nghỉ bù

    // Lưu vào leave_histories
    const history = this.leaveHistoryRepo.create({
        user_id,
        annual_leave_id: annualLeave.id,
        from_date: new Date(from_date),
        to_date: new Date(to_date),
        days_taken,
        applied_month,
        year,
        reason,
        location,
        attachments,
        leave_type,
        document_number,
        approved_by,
        signed_date: signed_date ? new Date(signed_date) : undefined,
    });
    await this.leaveHistoryRepo.save(history);

    return history;
  }
}
