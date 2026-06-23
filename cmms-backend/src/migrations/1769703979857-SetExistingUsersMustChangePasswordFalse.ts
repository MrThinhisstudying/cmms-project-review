import type { MigrationInterface, QueryRunner } from "typeorm";

export class SetExistingUsersMustChangePasswordFalse1769703979857 {
    name = 'SetExistingUsersMustChangePasswordFalse1769703979857'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Set must_change_password = false for all currently existing users
        await queryRunner.query(`UPDATE "user" SET "must_change_password" = false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Revert default if needed, normally not needed
    }
}
