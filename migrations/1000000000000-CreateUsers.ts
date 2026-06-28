import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1000000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE user_role_enum AS ENUM (
        'super_admin', 'employer', 'recruiter', 'applicant'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE users (
        id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email        VARCHAR NOT NULL UNIQUE,
        password_hash VARCHAR NOT NULL,
        role         user_role_enum NOT NULL,
        full_name    VARCHAR NOT NULL,
        webhook_url  VARCHAR NULL,
        created_at   TIMESTAMP NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_users_email ON users(email);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users;`);
    await queryRunner.query(`DROP TYPE user_role_enum;`);
  }
}
