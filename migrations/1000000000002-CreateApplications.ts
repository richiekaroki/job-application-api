import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateApplications1000000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE application_status_enum AS ENUM (
        'pending', 'reviewed', 'shortlisted', 'rejected', 'hired'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE applications (
        id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id        UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
        applicant_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cover_letter  TEXT NOT NULL,
        status        application_status_enum NOT NULL DEFAULT 'pending',
        reviewed_by   UUID NULL REFERENCES users(id) ON DELETE SET NULL,
        created_at    TIMESTAMP NOT NULL DEFAULT now(),
        UNIQUE(job_id, applicant_id)
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_applications_job_id       ON applications(job_id);
      CREATE INDEX idx_applications_applicant_id ON applications(applicant_id);
      CREATE INDEX idx_applications_status       ON applications(status);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE applications;`);
    await queryRunner.query(`DROP TYPE application_status_enum;`);
  }
}
