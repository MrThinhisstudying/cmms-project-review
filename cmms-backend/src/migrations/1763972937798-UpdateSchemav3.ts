import type { QueryRunner } from "typeorm";

export class UpdateSchemav31763972937798 {
    name = 'UpdateSchemav31763972937798'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repair" ADD "inspection_created_by" integer`);
        await queryRunner.query(`ALTER TABLE "repair" ADD "acceptance_created_by" integer`);
        await queryRunner.query(`ALTER TABLE "repair" ADD CONSTRAINT "FK_da29e7393f608e83c3ad3dd486a" FOREIGN KEY ("inspection_created_by") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "repair" ADD CONSTRAINT "FK_dd4f69663652c67d07fca11cc16" FOREIGN KEY ("acceptance_created_by") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "repair" DROP CONSTRAINT "FK_dd4f69663652c67d07fca11cc16"`);
        await queryRunner.query(`ALTER TABLE "repair" DROP CONSTRAINT "FK_da29e7393f608e83c3ad3dd486a"`);
        await queryRunner.query(`ALTER TABLE "repair" DROP COLUMN "acceptance_created_by"`);
        await queryRunner.query(`ALTER TABLE "repair" DROP COLUMN "inspection_created_by"`);
    }

}
