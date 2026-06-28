import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWebhookLogs1000000000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE webhook_logs (
        id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id  UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
        event_type      VARCHAR NOT NULL,
        payload         JSONB NOT NULL,
        status_code     INT NULL,
        delivered_at    TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_webhook_logs_application_id ON webhook_logs(application_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE webhook_logs;`);
  }
}
