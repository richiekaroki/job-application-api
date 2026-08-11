import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from './snake-naming.strategy';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
const isProduction = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        ssl: isProduction
          ? {
              rejectUnauthorized: true,
              ca: process.env.DB_CA_CERT,
            }
          : false,
        namingStrategy: new SnakeNamingStrategy(),
        entities: ['src/**/*.entity{.ts,.js}'],
        migrations: ['migrations/*{.ts,.js}'],
        synchronize: false,
      }
    : {
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
      },
);
