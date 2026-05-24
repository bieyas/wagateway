import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGroupFieldsToConversations1779600000000 implements MigrationInterface {
    name = 'AddGroupFieldsToConversations1779600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "isGroup" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "groupId" character varying`);
        await queryRunner.query(`ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "groupName" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "groupName"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "groupId"`);
        await queryRunner.query(`ALTER TABLE "conversations" DROP COLUMN IF EXISTS "isGroup"`);
    }
}
