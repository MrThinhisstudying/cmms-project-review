import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Unique} from 'typeorm';
import {User} from 'src/user/user.entity';
import {CompanyPolicy} from './company-policy.entity';

@Entity('company_policy_acks')
@Unique(['policy_id', 'user_id'])
export class CompanyPolicyAck {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    policy_id: number;

    @ManyToOne(() => CompanyPolicy, (policy) => policy.acknowledgments, {onDelete: 'CASCADE'})
    @JoinColumn({name: 'policy_id'})
    policy: CompanyPolicy;

    @Column()
    user_id: number;

    @ManyToOne(() => User, {eager: true, onDelete: 'CASCADE'})
    @JoinColumn({name: 'user_id'})
    user: User;

    @CreateDateColumn()
    acknowledged_at: Date;
}
