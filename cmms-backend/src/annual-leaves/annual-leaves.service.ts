import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateAnnualLeaveDto } from './dto/create-annual-leave.dto';
import { UpdateAnnualLeaveDto } from './dto/update-annual-leave.dto';
import { AnnualLeave } from './entities/annual-leave.entity';
import { User } from '../user/user.entity';

@Injectable()
export class AnnualLeavesService {
  constructor(
    @InjectRepository(AnnualLeave)
    private annualLeaveRepo: Repository<AnnualLeave>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
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
    // data is expected to be an array of objects
    // { employee_code, year, leave_balance_n2, leave_balance_n1, current_year_leave, m1_taken, ... }
    
    // First, find all valid users based on employee_code
    const employeeCodes = data.map(d => d.employee_code).filter(Boolean);
    if (!employeeCodes.length) return { success: 0, errors: ['Không có MSNV nào được gửi'] };

    const users = await this.userRepo.createQueryBuilder('user')
      .where('user.employee_code IN (:...codes)', { codes: employeeCodes })
      .getMany();
      
    const userMap = new Map(users.map(u => [u.employee_code, u.user_id]));
    
    let successCount = 0;
    const errors = [];

    for (const row of data) {
        if (!row.employee_code || !row.year) {
            errors.push(`Thiếu MSNV hoặc Năm`);
            continue;
        }
        const userId = userMap.get(row.employee_code);
        if (!userId) {
            errors.push(`Không tìm thấy MSNV: ${row.employee_code}`);
            continue;
        }

        // check if exist
        let record = await this.annualLeaveRepo.findOne({ where: { user_id: userId, year: row.year } });
        
        if (!record) {
            record = this.annualLeaveRepo.create({ user_id: userId, year: row.year });
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
}
