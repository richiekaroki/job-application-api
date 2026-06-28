import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokens1000000000003 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE refresh_tokens (
        id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash  VARCHAR NOT NULL,
        expires_at  TIMESTAMP NOT NULL,
        revoked     BOOLEAN NOT NULL DEFAULT false
      );
    `);

    await queryRunner.query(`
      CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE refresh_tokens;`);
  }
}
