import { getTenantPrisma } from './src/prisma/tenant-prisma';
import bcrypt from 'bcryptjs';

async function addAllUsers() {
  const tenantPrisma = getTenantPrisma('tenant_1');
  
  const users = [
    {
      email: 'leader@demo.com',
      password: await bcrypt.hash('leader123', 10),
      name: 'Demo Leader',
      role: 'LEADER',
      salary: 7000000,
    },
    {
      email: 'user@demo.com',
      password: await bcrypt.hash('user123', 10),
      name: 'Demo User',
      role: 'USER',
      salary: 5000000,
    }
  ];
  
  for (const userData of users) {
    try {
      const user = await tenantPrisma.user.create({
        data: {
          email: userData.email,
          password: userData.password,
          name: userData.name,
          role: userData.role as any,
          salary: userData.salary,
          salaryType: 'MONTHLY' as any,
          isActive: true,
        }
      });
      console.log(`✓ User created: ${user.email}`);
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`✓ User already exists: ${userData.email}`);
      } else {
        console.error(`✗ Error creating ${userData.email}:`, error.message);
      }
    }
  }
}

addAllUsers().catch(console.error).finally(() => process.exit(0));
