import { PrismaClient } from '@prisma/client';

// Public schema Prisma client for Tenant and SuperAdmin
const publicPrisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

// Cache for tenant-specific Prisma clients
const tenantClients: Map<string, PrismaClient> = new Map();

/**
 * Get the public schema Prisma client
 * Used for Tenant and SuperAdmin operations
 */
export function getPublicPrisma(): PrismaClient {
  return publicPrisma;
}

/**
 * Get or create a Prisma client for a specific tenant schema
 * @param schemaName - The tenant schema name (e.g., "tenant_1")
 */
export function getTenantPrisma(schemaName: string): PrismaClient {
  // Check cache first
  if (tenantClients.has(schemaName)) {
    return tenantClients.get(schemaName)!;
  }
  
  // Get base URL and append schema parameter
  const baseUrl = process.env.DATABASE_URL || '';
  const separator = baseUrl.includes('?') ? '&' : '?';
  const tenantUrl = `${baseUrl}${separator}schema=${schemaName}`;
  
  // Create new client for this tenant
  const client = new PrismaClient({
    datasources: {
      db: {
        url: tenantUrl,
      },
    },
    log: ['error', 'warn'],
  });
  
  // Cache it
  tenantClients.set(schemaName, client);
  
  return client;
}

/**
 * Clear a tenant client from cache (useful for cleanup)
 */
export async function clearTenantClient(schemaName: string): Promise<void> {
  const client = tenantClients.get(schemaName);
  if (client) {
    await client.$disconnect();
    tenantClients.delete(schemaName);
  }
}

/**
 * Disconnect all clients on shutdown
 */
export async function disconnectAll(): Promise<void> {
  await publicPrisma.$disconnect();
  
  for (const [, client] of tenantClients) {
    await client.$disconnect();
  }
  tenantClients.clear();
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await disconnectAll();
});
