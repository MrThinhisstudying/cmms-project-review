import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ShiftDebt } from './entities/shift-debt.entity';
import { User } from '../user/user.entity';
import { Department } from '../departments/department.entity';
import { CreateShiftDebtDto, UpdateShiftDebtDto } from './dto/shift-debt.dto';

@Injectable()
export class ShiftDebtsService {
  constructor(
    @InjectRepository(ShiftDebt)
    private shiftDebtRepo: Repository<ShiftDebt>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(Department)
    private departmentRepo: Repository<Department>,
  ) {}

  async findAll(year?: number, month?: number, departmentId?: number): Promise<ShiftDebt[]> {
    const query = this.shiftDebtRepo.createQueryBuilder('debt')
      .leftJoinAndSelect('debt.user', 'user')
      .leftJoinAndSelect('user.department', 'userDepartment')
      .leftJoinAndSelect('debt.department', 'department');

    if (year) {
      query.andWhere('debt.year = :year', { year });
    }
    if (month) {
      query.andWhere('debt.month = :month', { month });
    }
    if (departmentId) {
      query.andWhere('(debt.department_id = :deptId OR user.department_id = :deptId)', { deptId: departmentId });
    }

    return query.orderBy('user.name', 'ASC').getMany();
  }

  async findOne(id: number): Promise<ShiftDebt> {
    const record = await this.shiftDebtRepo.findOne({
      where: { id },
      relations: ['user', 'user.department', 'department'],
    });
    if (!record) throw new NotFoundException('Không tìm thấy bản ghi nợ ca');
    return record;
  }

  async create(dto: CreateShiftDebtDto): Promise<ShiftDebt> {
    const opening = Number(dto.opening_debt) || 0;
    const taken = Number(dto.taken_days) || 0;
    const accrued = Number(dto.accrued_days) || 0;
    const closing = dto.closing_debt !== undefined ? Number(dto.closing_debt) : opening - taken + accrued;

    const record = this.shiftDebtRepo.create({
      ...dto,
      opening_debt: opening,
      taken_days: taken,
      accrued_days: accrued,
      closing_debt: closing,
    });
    return this.shiftDebtRepo.save(record);
  }

  async update(id: number, dto: UpdateShiftDebtDto): Promise<ShiftDebt> {
    const record = await this.findOne(id);

    const opening = dto.opening_debt !== undefined ? Number(dto.opening_debt) : record.opening_debt;
    const taken = dto.taken_days !== undefined ? Number(dto.taken_days) : record.taken_days;
    const accrued = dto.accrued_days !== undefined ? Number(dto.accrued_days) : record.accrued_days;
    const closing = dto.closing_debt !== undefined ? Number(dto.closing_debt) : opening - taken + accrued;

    Object.assign(record, {
      ...dto,
      opening_debt: opening,
      taken_days: taken,
      accrued_days: accrued,
      closing_debt: closing,
    });
    return this.shiftDebtRepo.save(record);
  }

  async remove(id: number): Promise<void> {
    const record = await this.findOne(id);
    await this.shiftDebtRepo.remove(record);
  }

  async bulkUpsert(items: any[]): Promise<{ created: number; updated: number; failed: number; errors: string[] }> {
    let created = 0;
    let updated = 0;
    let failed = 0;
    const errors: string[] = [];

    // Lấy trước toàn bộ user để map
    const allUsers = await this.userRepo.find({ relations: ['department'] });
    const userById = new Map<number, User>();
    const userByCode = new Map<string, User>();
    const userByName = new Map<string, User>();

    allUsers.forEach((u) => {
      userById.set(u.user_id, u);
      if (u.employee_code) {
        const raw = u.employee_code.trim().toLowerCase();
        userByCode.set(raw, u);
        const noZero = raw.replace(/^0+/, '');
        if (noZero) userByCode.set(noZero, u);
      }
      if (u.name) {
        userByName.set(u.name.trim().toLowerCase(), u);
      }
    });

    for (const item of items) {
      try {
        let matchedUser: User | undefined;
        if (item.user_id) {
          matchedUser = userById.get(Number(item.user_id));
        }
        if (!matchedUser && item.employee_code) {
          const raw = String(item.employee_code).trim().toLowerCase();
          matchedUser = userByCode.get(raw) || userByCode.get(raw.replace(/^0+/, ''));
        }
        if (!matchedUser && item.name) {
          matchedUser = userByName.get(String(item.name).trim().toLowerCase());
        }

        if (!matchedUser) {
          failed++;
          errors.push(`Không tìm thấy nhân viên: "${item.employee_code || item.name || item.user_id}"`);
          continue;
        }

        const year = Number(item.year);
        const month = Number(item.month);
        if (!year || !month) {
          failed++;
          errors.push(`Thiếu thông tin Năm hoặc Tháng cho nhân viên ${matchedUser.name}`);
          continue;
        }

        const opening = Number(item.opening_debt) || 0;
        const taken = Number(item.taken_days) || 0;
        const accrued = Number(item.accrued_days) || 0;
        const closing = item.closing_debt !== undefined ? Number(item.closing_debt) : opening - taken + accrued;

        // Tìm bản ghi nợ ca đã tồn tại trong tháng này
        let existing = await this.shiftDebtRepo.findOne({
          where: {
            user_id: matchedUser.user_id,
            year,
            month,
          },
        });

        if (existing) {
          existing.opening_debt = opening;
          existing.taken_days = taken;
          existing.accrued_days = accrued;
          existing.closing_debt = closing;
          if (item.reason !== undefined) existing.reason = item.reason;
          if (item.department_id) existing.department_id = item.department_id;
          else if (matchedUser.department?.dept_id) existing.department_id = matchedUser.department.dept_id;

          await this.shiftDebtRepo.save(existing);
          updated++;
        } else {
          const newRecord = this.shiftDebtRepo.create({
            user_id: matchedUser.user_id,
            year,
            month,
            department_id: item.department_id || matchedUser.department?.dept_id,
            opening_debt: opening,
            taken_days: taken,
            accrued_days: accrued,
            closing_debt: closing,
            reason: item.reason || '',
          });
          await this.shiftDebtRepo.save(newRecord);
          created++;
        }
      } catch (err: any) {
        failed++;
        errors.push(`Lỗi khi xử lý dòng: ${err?.message || 'Lỗi không xác định'}`);
      }
    }

    return { created, updated, failed, errors };
  }
}
