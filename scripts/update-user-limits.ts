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

const EXCLUDED_EMAILS = [
  "lorenalvarez30@gmail.com", // Lorena Alvarez
  "info@patriciacoy.com", // Patricia Coy
  "vidaybienesraicesenmiami@gmail.com", // Nelida Gomez
  "contacto@elequipoinmobiliario.com", // El Equipo Inmobiliario
];

async function main() {
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  const run = process.argv.includes('--run');

  try {
    // We use a raw query to fetch users because the local schema has changes (like defaultPromptId)
    // that are not yet applied to the production database.
    const users: any[] = await prisma.$queryRawUnsafe(`
      SELECT id, email, name, role, "dailyArticleLimit", "maxTitlesPerBatch"
      FROM "User"
      ORDER BY email ASC
    `);

    const toUpdate: typeof users = [];
    const skipped: { user: typeof users[0]; reason: string }[] = [];

    for (const user of users) {
      if (user.role === 'admin') {
        skipped.push({ user, reason: 'Administrator' });
      } else if (EXCLUDED_EMAILS.includes(user.email.toLowerCase().trim())) {
        skipped.push({ user, reason: `Excluded email: ${user.email}` });
      } else {
        toUpdate.push(user);
      }
    }

    console.log('\n======================================');
    console.log(`TOTAL USERS: ${users.length}`);
    console.log(`USERS TO UPDATE: ${toUpdate.length}`);
    console.log(`USERS TO SKIP: ${skipped.length}`);
    console.log('======================================\n');

    console.log('--- SKIPPED USERS ---');
    for (const item of skipped) {
      console.log(`- ${item.user.email} (${item.user.name || 'No Name'}) [Role: ${item.user.role}] - Reason: ${item.reason} (Current Limits: Daily: ${item.user.dailyArticleLimit}, Batch: ${item.user.maxTitlesPerBatch})`);
    }

    console.log('\n--- USERS TO UPDATE ---');
    for (const user of toUpdate) {
      console.log(`- ${user.email} (${user.name || 'No Name'}) - Current Limits: Daily: ${user.dailyArticleLimit}, Batch: ${user.maxTitlesPerBatch}`);
    }

    if (run) {
      console.log('\n🚀 RUNNING SQL UPDATE IN PRODUCTION...');
      
      const updateQuery = `
        UPDATE "User"
        SET "dailyArticleLimit" = 10, "maxTitlesPerBatch" = 10
        WHERE role = 'user'
          AND email NOT IN ('lorenalvarez30@gmail.com', 'info@patriciacoy.com', 'vidaybienesraicesenmiami@gmail.com', 'contacto@elequipoinmobiliario.com')
      `;
      
      const result = await prisma.$executeRawUnsafe(updateQuery);
      
      console.log(`\n✅ SUCCESSFULLY UPDATED ${result} USERS IN PRODUCTION.`);
    } else {
      console.log('\n💡 DRY RUN ONLY. Run with "--run" flag to apply changes to production database.');
    }
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exitCode = 1;
});
