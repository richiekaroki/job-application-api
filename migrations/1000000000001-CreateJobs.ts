import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateJobs1000000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE job_status_enum AS ENUM ('open', 'closed');
    `);

    await queryRunner.query(`
      CREATE TABLE jobs (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        posted_by   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title       VARCHAR NOT NULL,
        description TEXT NOT NULL,
        location    VARCHAR NOT NULL,
        status      job_status_enum NOT NULL DEFAULT 'open',
        created_at  TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_jobs_status    ON jobs(status);
      CREATE INDEX idx_jobs_location  ON jobs(location);
      CREATE INDEX idx_jobs_posted_by ON jobs(posted_by);
      CREATE INDEX idx_jobs_created_at ON jobs(created_at);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE jobs;`);
    await queryRunner.query(`DROP TYPE job_status_enum;`);
  }
}
