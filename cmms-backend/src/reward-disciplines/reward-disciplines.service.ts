import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateRewardDisciplineDto } from './dto/create-reward-discipline.dto';
import { UpdateRewardDisciplineDto } from './dto/update-reward-discipline.dto';
import { RewardDiscipline } from './entities/reward-discipline.entity';
import { User } from '../user/user.entity';

@Injectable()
export class RewardDisciplinesService {
  constructor(
    @InjectRepository(RewardDiscipline)
    private readonly rewardDisciplineRepo: Repository<RewardDiscipline>,
  ) {}

  async create(createRewardDisciplineDto: CreateRewardDisciplineDto): Promise<RewardDiscipline> {
    const record = this.rewardDisciplineRepo.create({
        ...createRewardDisciplineDto,
        user: { user_id: createRewardDisciplineDto.user_id } as User
    });
    return await this.rewardDisciplineRepo.save(record);
  }

  async findAll(): Promise<RewardDiscipline[]> {
    return await this.rewardDisciplineRepo.find({
        relations: ['user', 'user.department'],
        order: { effective_date: 'DESC' }
    });
  }

  async findByUserId(userId: number): Promise<RewardDiscipline[]> {
    return await this.rewardDisciplineRepo.find({
        where: { user: { user_id: userId } },
        order: { effective_date: 'DESC' }
    });
  }

  async findOne(id: number): Promise<RewardDiscipline> {
    const record = await this.rewardDisciplineRepo.findOne({
      where: { id },
      relations: ['user']
    });
    if (!record) {
        throw new NotFoundException(`RewardDiscipline #${id} not found`);
    }
    return record;
  }

  async update(id: number, updateRewardDisciplineDto: UpdateRewardDisciplineDto): Promise<RewardDiscipline> {
    const record = await this.findOne(id);
    const updated = Object.assign(record, updateRewardDisciplineDto);
    return await this.rewardDisciplineRepo.save(updated);
  }

  async remove(id: number): Promise<void> {
    const record = await this.findOne(id);
    await this.rewardDisciplineRepo.remove(record);
  }
}
