import { getTenantPrisma } from './src/prisma/tenant-prisma';
import bcrypt from 'bcryptjs';

async function addTestUser() {
  const tenantPrisma = getTenantPrisma('tenant_1');
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const user = await tenantPrisma.user.create({
    data: {
      email: 'admin@demo.com',
      password: hashedPassword,
      name: 'Demo Admin',
      role: 'ADMIN',
      salary: 10000000,
      salaryType: 'MONTHLY',
      isActive: true,
    }
  });
  
  console.log('User created:', user);
}

addTestUser().catch(console.error).finally(() => process.exit(0));
