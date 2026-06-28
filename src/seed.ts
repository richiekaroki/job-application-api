import { AppDataSource } from './config/data-source';
import { User, UserRole } from './users/user.entity';
import { Job, JobStatus } from './jobs/job.entity';
import {
  Application,
  ApplicationStatus,
} from './applications/application.entity';
import * as bcrypt from 'bcrypt';

async function seed() {
  await AppDataSource.initialize();
  console.log('🌱 Seeding database...');

  const userRepo = AppDataSource.getRepository(User);
  const jobRepo = AppDataSource.getRepository(Job);
  const appRepo = AppDataSource.getRepository(Application);

  // Clear existing data
  await appRepo.query('DELETE FROM applications');
  await jobRepo.query('DELETE FROM jobs');
  await userRepo.query('DELETE FROM users');

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // Create one user per role
  const superAdmin = userRepo.create({
    email: 'superadmin@jobapi.dev',
    passwordHash,
    role: UserRole.SUPER_ADMIN,
    fullName: 'Super Admin',
  });

  const employer = userRepo.create({
    email: 'employer@jobapi.dev',
    passwordHash,
    role: UserRole.EMPLOYER,
    fullName: 'Acme Corp',
    webhookUrl: 'https://webhook.site/test-endpoint',
  });

  const recruiter = userRepo.create({
    email: 'recruiter@jobapi.dev',
    passwordHash,
    role: UserRole.RECRUITER,
    fullName: 'Jane Recruiter',
  });

  const applicant = userRepo.create({
    email: 'applicant@jobapi.dev',
    passwordHash,
    role: UserRole.APPLICANT,
    fullName: 'John Applicant',
  });

  await userRepo.save([superAdmin, employer, recruiter, applicant]);
  console.log('✅ Users created');

  // Create sample jobs
  const job1 = jobRepo.create({
    postedBy: employer,
    title: 'Junior API Developer',
    description: 'Build and maintain RESTful APIs using Node.js and NestJS.',
    location: 'Nairobi, Kenya',
    status: JobStatus.OPEN,
  });

  const job2 = jobRepo.create({
    postedBy: employer,
    title: 'Full Stack Developer',
    description: 'Work across the stack with React and Node.js.',
    location: 'Remote',
    status: JobStatus.OPEN,
  });

  const job3 = jobRepo.create({
    postedBy: employer,
    title: 'Backend Engineer (Closed)',
    description: 'Senior backend role — position filled.',
    location: 'Nairobi, Kenya',
    status: JobStatus.CLOSED,
  });

  await jobRepo.save([job1, job2, job3]);
  console.log('✅ Jobs created');

  // Create a sample application
  const application = appRepo.create({
    job: job1,
    applicant: applicant,
    coverLetter:
      'I am excited to apply for this role. I have strong experience building RESTful APIs with NestJS and TypeScript.',
    status: ApplicationStatus.PENDING,
  });

  await appRepo.save(application);
  console.log('✅ Applications created');

  console.log(
    '\n🎉 Seed complete. Test credentials (all passwords: Password123!):',
  );
  console.log('  superadmin@jobapi.dev  — super_admin');
  console.log('  employer@jobapi.dev    — employer');
  console.log('  recruiter@jobapi.dev   — recruiter');
  console.log('  applicant@jobapi.dev   — applicant');

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
