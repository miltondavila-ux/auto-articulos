import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Load env file
function loadEnv() {
  if (process.env.DATABASE_URL) {
    console.log("Using existing DATABASE_URL");
    return;
  }
  const possiblePaths = [
    path.join(__dirname, '../apps/web/.env.local'),
    path.join(__dirname, '../apps/worker/.env'),
    path.join(__dirname, '../.env.local'),
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`Loading env from ${envPath}`);
      const content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const firstEqual = trimmed.indexOf('=');
          if (firstEqual !== -1) {
            const key = trimmed.slice(0, firstEqual).trim();
            let value = trimmed.slice(firstEqual + 1).trim();
            // remove quotes if any
            if (value.startsWith('"') && value.endsWith('"')) {
              value = value.slice(1, -1);
            } else if (value.startsWith("'") && value.endsWith("'")) {
              value = value.slice(1, -1);
            }
            process.env[key] = value;
          }
        }
      }
      break;
    }
  }
}

loadEnv();

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dailyArticleLimit: true,
        maxTitlesPerBatch: true,
      }
    });
    console.log('=== USERS IN DATABASE ===');
    console.log(`Found ${users.length} users.`);
    fs.writeFileSync(path.join(__dirname, 'production_users.json'), JSON.stringify(users, null, 2));
    console.log('Written to scripts/production_users.json');
  } catch (error) {
    console.error('Error listing users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
