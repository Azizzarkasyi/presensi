import { exec } from "child_process";
import { promisify } from "util";
import { getPublicPrisma } from "./tenant-prisma";
import path from "path";

const execAsync = promisify(exec);

export class TenantMigrator {
  /**
   * Push the Prisma schema to a specific tenant schema
   */
  static async pushSchemaToTenant(schemaName: string): Promise<void> {
    console.log(`Pushing schema to tenant: ${schemaName}`);
    
    // Get the base database URL
    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Replace or append the schema parameter
    const urlObj = new URL(baseUrl);
    urlObj.searchParams.set("schema", schemaName);
    const tenantDbUrl = urlObj.toString();

    try {
      // Execute prisma db push targeting the tenant schema
      // --accept-data-loss prevents interactive prompts if there are breaking changes
      // --skip-generate avoids regenerating the Prisma Client needlessly for every tenant
      const { stdout, stderr } = await execAsync(
        "npx prisma db push --accept-data-loss --skip-generate",
        {
          env: {
            ...process.env,
            DATABASE_URL: tenantDbUrl,
          },
          // Ensure it runs in the absensi root directory
          cwd: path.resolve(__dirname, "../../"),
        }
      );
      
      console.log(`Successfully synced schema for ${schemaName}`);
      if (stderr) console.warn(stderr);
      
    } catch (error: any) {
      console.error(`Failed to push schema to ${schemaName}:`, error.message);
      throw new Error(`Migration failed for ${schemaName}`);
    }
  }

  /**
   * Sync all active tenants with the current Prisma schema
   */
  static async syncAllTenants(): Promise<void> {
    const prisma = getPublicPrisma();
    const tenants = await prisma.tenant.findMany();
    
    console.log(`Found ${tenants.length} tenants. Starting sync...`);
    
    // We shouldn't sync public here as it's already done via normal prisma db push
    // But if there are tenants, we sync them
    for (const tenant of tenants) {
      try {
        await this.pushSchemaToTenant(tenant.schemaName);
      } catch (error) {
        console.error(`Error syncing ${tenant.schemaName}. Skipping...`);
      }
    }
    
    console.log("Finished syncing all tenants.");
  }
}
