import { MigrationInterface, QueryRunner } from "typeorm";

export class AddApprovedByTechRequest1768703979857 implements MigrationInterface {
    name = 'AddApprovedByTechRequest1768703979857'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repair" ADD "approved_by_tech_request" integer`);
        await queryRunner.query(`ALTER TABLE "repair" ADD CONSTRAINT "FK_9b025566aa1d7048ddd32eb5af1" FOREIGN KEY ("approved_by_tech_request") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repair" DROP CONSTRAINT "FK_9b025566aa1d7048ddd32eb5af1"`);
        await queryRunner.query(`ALTER TABLE "repair" DROP COLUMN "approved_by_tech_request"`);
    }

}
