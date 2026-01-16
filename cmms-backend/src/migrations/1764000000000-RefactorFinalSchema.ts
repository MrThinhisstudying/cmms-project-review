import { MigrationInterface, QueryRunner } from "typeorm";

export class RefactorFinalSchema1764000000000 implements MigrationInterface {
    name = 'RefactorFinalSchema1764000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // 1. Create DeviceGroup table
        await queryRunner.query(`CREATE TABLE "device_group" ("id" SERIAL NOT NULL, "name" character varying NOT NULL, "description" character varying, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_device_group_id" PRIMARY KEY ("id"))`);

        // 2. Create UserDeviceGroup table
        await queryRunner.query(`CREATE TABLE "user_device_group" ("id" SERIAL NOT NULL, "user_id" integer NOT NULL, "group_id" integer NOT NULL, "is_group_lead" boolean NOT NULL DEFAULT false, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_user_device_group_id" PRIMARY KEY ("id"))`);

        // 3. Add Foreign Keys for UserDeviceGroup
        await queryRunner.query(`ALTER TABLE "user_device_group" ADD CONSTRAINT "FK_user_device_group_user" FOREIGN KEY ("user_id") REFERENCES "user"("user_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "user_device_group" ADD CONSTRAINT "FK_user_device_group_group" FOREIGN KEY ("group_id") REFERENCES "device_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // 4. Add group_id to Device
        await queryRunner.query(`ALTER TABLE "device" ADD "group_id" integer`);
        await queryRunner.query(`ALTER TABLE "device" ADD CONSTRAINT "FK_device_group" FOREIGN KEY ("group_id") REFERENCES "device_group"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);

        // 5. Add signature_url to User
        await queryRunner.query(`ALTER TABLE "user" ADD "signature_url" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // 5. Revert User signature
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "signature_url"`);

        // 4. Revert Device group_id
        await queryRunner.query(`ALTER TABLE "device" DROP CONSTRAINT "FK_device_group"`);
        await queryRunner.query(`ALTER TABLE "device" DROP COLUMN "group_id"`);

        // 3. Revert UserDeviceGroup FKs
        await queryRunner.query(`ALTER TABLE "user_device_group" DROP CONSTRAINT "FK_user_device_group_group"`);
        await queryRunner.query(`ALTER TABLE "user_device_group" DROP CONSTRAINT "FK_user_device_group_user"`);

        // 2. Drop UserDeviceGroup table
        await queryRunner.query(`DROP TABLE "user_device_group"`);

        // 1. Drop DeviceGroup table
        await queryRunner.query(`DROP TABLE "device_group"`);
    }

}
