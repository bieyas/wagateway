import { MigrationInterface, QueryRunner } from "typeorm";

export class AddChatHistory1779390286775 implements MigrationInterface {
    name = 'AddChatHistory1779390286775'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."idx_chat_history_device_jid_ts"`);
        await queryRunner.query(`ALTER TABLE "chat_history" DROP COLUMN "rawData"`);
        await queryRunner.query(`ALTER TABLE "chat_history" ADD "rawData" text`);
        await queryRunner.query(`CREATE INDEX "IDX_9d7b35c742e53f7ae383f5f48f" ON "chat_history" ("deviceId", "chatJid", "messageTimestamp") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_9d7b35c742e53f7ae383f5f48f"`);
        await queryRunner.query(`ALTER TABLE "chat_history" DROP COLUMN "rawData"`);
        await queryRunner.query(`ALTER TABLE "chat_history" ADD "rawData" json`);
        await queryRunner.query(`CREATE INDEX "idx_chat_history_device_jid_ts" ON "chat_history" ("deviceId", "chatJid", "messageTimestamp") `);
    }

}
