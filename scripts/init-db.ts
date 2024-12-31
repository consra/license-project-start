import { execSync } from 'child_process';

async function initializeDatabase() {
  try {
    console.log('Running Prisma migrations...');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });
    console.log('Database initialization complete!');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initializeDatabase(); 