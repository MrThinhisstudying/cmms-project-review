import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateSchemav21763971824169 implements MigrationInterface {
    name = 'UpdateSchemav21763971824169'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repair" RENAME COLUMN "acceptance_result" TO "failure_description"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repair" RENAME COLUMN "failure_description" TO "acceptance_result"`);
    }

}
