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
    for (const r of data) {
      totalEntitlement += r.current_year_leave + r.leave_balance_n1 + r.leave_balance_n2;
      totalTaken += r.m1_taken + r.m2_taken + r.m3_taken + r.m4_taken + r.m5_taken + r.m6_taken + r.m7_taken + r.m8_taken + r.m9_taken + r.m10_taken + r.m11_taken + r.m12_taken;
    }
    return {
      total_employees: data.length,
      total_entitlement: totalEntitlement,
      total_taken: totalTaken,
      total_remaining: totalEntitlement - totalTaken
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
    const { user_id, year, applied_month, days_taken, from_date, to_date, reason, location, attachments } = dto;
    
    // Tìm hoặc tạo mới AnnualLeave record cho user trong năm
    let annualLeave = await this.annualLeaveRepo.findOne({ where: { user_id, year } });
    if (!annualLeave) {
        annualLeave = this.annualLeaveRepo.create({ user_id, year });
        await this.annualLeaveRepo.save(annualLeave);
    }

    // Cộng dồn phép vào tháng tương ứng
    const monthKey = `m${applied_month}_taken`;
    (annualLeave as any)[monthKey] = ((annualLeave as any)[monthKey] || 0) + days_taken;
    await this.annualLeaveRepo.save(annualLeave);

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
        attachments
    });
    await this.leaveHistoryRepo.save(history);

    return history;
  }
}
