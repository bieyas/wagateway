import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFKAIAgentDevice1779444035018 implements MigrationInterface {
    name = 'AddFKAIAgentDevice1779444035018'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_agents" ADD CONSTRAINT "FK_7e17880d886b40b14716547adfd" FOREIGN KEY ("deviceId") REFERENCES "devices"("deviceId") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "ai_agents" DROP CONSTRAINT "FK_7e17880d886b40b14716547adfd"`);
    }

}
