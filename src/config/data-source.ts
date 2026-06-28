import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import * as dotenv from 'dotenv';

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  username: process.env.DB_USERNAME || 'jobapi',
  password: process.env.DB_PASSWORD || 'jobapi_pass',
  database: process.env.DB_NAME || 'job_applications',
  namingStrategy: new SnakeNamingStrategy(),
  entities: ['src/**/*.entity{.ts,.js}'],
  migrations: ['migrations/*{.ts,.js}'],
  synchronize: false,
});
