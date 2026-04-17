import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateLaborContractDto } from './dto/create-labor-contract.dto';
import { UpdateLaborContractDto } from './dto/update-labor-contract.dto';
import { LaborContract } from './entities/labor-contract.entity';
import { User } from '../user/user.entity';

@Injectable()
export class LaborContractsService {
  constructor(
    @InjectRepository(LaborContract)
    private readonly laborContractRepo: Repository<LaborContract>,
  ) {}

  async create(createLaborContractDto: CreateLaborContractDto): Promise<LaborContract> {
    const contract = this.laborContractRepo.create({
        ...createLaborContractDto,
        user: { user_id: createLaborContractDto.user_id } as User
    });
    return await this.laborContractRepo.save(contract);
  }

  async findAll(): Promise<LaborContract[]> {
    return await this.laborContractRepo.find({
        relations: ['user', 'user.department'],
        order: { created_at: 'DESC' }
    });
  }

  async findByUserId(userId: number): Promise<LaborContract[]> {
    return await this.laborContractRepo.find({
        where: { user: { user_id: userId } },
        order: { start_date: 'DESC' }
    });
  }

  async findOne(id: number): Promise<LaborContract> {
    const contract = await this.laborContractRepo.findOne({
      where: { id },
      relations: ['user']
    });
    if (!contract) {
        throw new NotFoundException(`LaborContract #${id} not found`);
    }
    return contract;
  }

  async update(id: number, updateLaborContractDto: UpdateLaborContractDto): Promise<LaborContract> {
    const contract = await this.findOne(id);
    const updated = Object.assign(contract, updateLaborContractDto);
    return await this.laborContractRepo.save(updated);
  }

  async remove(id: number): Promise<void> {
    const contract = await this.findOne(id);
    await this.laborContractRepo.remove(contract);
  }
}
