const { PrismaClient } = require('@prisma/client');
require('dotenv').config({ path: './packages/db/.env' });

async function main() {
  const prisma = new PrismaClient();
  try {
    console.log('Searching for Antonio Aguirre...');
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { name: { contains: 'Antonio Aguirre', mode: 'insensitive' } },
          { email: { contains: 'antonio', mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      console.log('User not found!');
      return;
    }

    console.log(`User found: ${user.name} (${user.email}) - ID: ${user.id}`);

    // Fetch the 5 most recent category sync jobs for this user
    const syncJobs = await prisma.categorySyncJob.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    console.log('\n--- Recent Category Sync Jobs ---');
    console.table(syncJobs.map(job => ({
      id: job.id,
      status: job.status,
      errorMessage: job.errorMessage || 'None',
      createdAt: job.createdAt.toISOString(),
      finishedAt: job.finishedAt ? job.finishedAt.toISOString() : 'Pending/Running'
    })));

    // Check if the user is locked (workerBusyUntil)
    console.log(`\nUser workerBusyUntil: ${user.workerBusyUntil ? user.workerBusyUntil.toISOString() : 'Not locked'}`);
    const now = new Date();
    if (user.workerBusyUntil && user.workerBusyUntil > now) {
      console.log(`⚠️ User is currently locked for another ${Math.round((user.workerBusyUntil - now) / 1000)} seconds.`);
    }

    // Check currently active categories
    const categories = await prisma.category.findMany({
      where: { userId: user.id }
    });
    console.log(`\nTotal categories in database: ${categories.length}`);
    const syncCats = categories.filter(c => c.source === 'sync');
    const manualCats = categories.filter(c => c.source === 'manual');
    const archivedCats = categories.filter(c => c.source === 'archived');
    console.log(`- Active Synced categories: ${syncCats.length}`);
    console.log(`- Manual categories: ${manualCats.length}`);
    console.log(`- Archived categories: ${archivedCats.length}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
