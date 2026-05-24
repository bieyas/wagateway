import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSenderNameToConversationMessages1779600300000 implements MigrationInterface {
    name = 'AddSenderNameToConversationMessages1779600300000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversation_messages" ADD COLUMN IF NOT EXISTS "senderName" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "conversation_messages" DROP COLUMN IF EXISTS "senderName"`);
    }
}
