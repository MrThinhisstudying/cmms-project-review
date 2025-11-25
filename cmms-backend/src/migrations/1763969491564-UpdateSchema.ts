import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSchema1763969491564 implements MigrationInterface {
    name = 'UpdateSchema1763969491564'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repair" DROP COLUMN "damage_description"`);
        await queryRunner.query(`ALTER TABLE "repair" DROP COLUMN "damage_cause"`);
        await queryRunner.query(`ALTER TABLE "repair" DROP COLUMN "repair_solution"`);
        await queryRunner.query(`ALTER TABLE "repair" DROP COLUMN "inspection_notes"`);
        await queryRunner.query(`ALTER TABLE "repair" ADD "inspection_items" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repair" DROP COLUMN "inspection_items"`);
        await queryRunner.query(`ALTER TABLE "repair" ADD "inspection_notes" text`);
        await queryRunner.query(`ALTER TABLE "repair" ADD "repair_solution" jsonb`);
        await queryRunner.query(`ALTER TABLE "repair" ADD "damage_cause" jsonb`);
        await queryRunner.query(`ALTER TABLE "repair" ADD "damage_description" jsonb`);
    }

}
