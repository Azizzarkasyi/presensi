import { getTenantPrisma } from '../prisma/tenant-prisma';
import { PrismaClient } from '@prisma/client';

async function test() {
  const prisma = getTenantPrisma('tenant_3');
  const userId = 2; // Assuming the user is 2? Let's check the users first.
  const users = await prisma.user.findMany();
  console.log('Users in tenant_3:', users.map(u => u.id));
  
  if (users.length === 0) return;
  const targetUserId = users[0].id;
  
  const targetMonth = new Date().getMonth();
  const targetYear = new Date().getFullYear();

  const startDate = new Date(targetYear, targetMonth, 1);
  const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

  const attendances = await prisma.attendance.findMany({
    where: {
      userId: targetUserId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    }
  });

  console.log(`Stats for user ${targetUserId} in June:`, attendances.length);
  
  const mayStartDate = new Date(targetYear, 4, 1);
  const mayEndDate = new Date(targetYear, 5, 0, 23, 59, 59, 999);
  const mayAttendances = await prisma.attendance.findMany({
    where: {
      userId: targetUserId,
      date: {
        gte: mayStartDate,
        lte: mayEndDate,
      },
    }
  });
  console.log(`Stats for user ${targetUserId} in May:`, mayAttendances.length);
}
test();
