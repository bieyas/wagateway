import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAlwaysOnBlacklistToAIAgent1779439643933 implements MigrationInterface {
    name = 'AddAlwaysOnBlacklistToAIAgent1779439643933'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_agents" ADD "alwaysOn" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "ai_agents" ADD "blacklistPhones" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_agents" DROP COLUMN "blacklistPhones"`);
        await queryRunner.query(`ALTER TABLE "ai_agents" DROP COLUMN "alwaysOn"`);
    }

}
