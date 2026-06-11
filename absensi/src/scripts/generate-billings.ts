import { PrismaClient } from "@prisma/client";
import { getTenantPrisma } from "../prisma/tenant-prisma";

const publicPrisma = new PrismaClient();
const COST_PER_USER = 10000;

async function generateMonthlyBillings() {
  console.log("Memulai pencetakan tagihan bulanan...");
  const date = new Date();
  const currentMonth = date.getMonth() + 1; // 1 - 12
  const currentYear = date.getFullYear();

  // 1. Ambil semua perusahaan yang aktif
  const tenants = await publicPrisma.tenant.findMany({
    where: { isActive: true },
  });

  let successCount = 0;

  for (const tenant of tenants) {
    console.log(`\nMemproses tagihan untuk Tenant: ${tenant.name} (${tenant.schemaName})`);
    
    // Cek apakah tagihan bulan ini sudah ada agar tidak ganda
    const existingBill = await publicPrisma.subscriptionBilling.findUnique({
      where: {
        tenantId_month_year: {
          tenantId: tenant.id,
          month: currentMonth,
          year: currentYear,
        },
      },
    });

    if (existingBill) {
      console.log(`➜ Tagihan bulan ${currentMonth}/${currentYear} sudah tercetak. Melewati...`);
      continue;
    }

    try {
      // 2. Hubungkan ke database khusus perusahaan ini
      const tenantPrisma = getTenantPrisma(tenant.schemaName);
      
      // 3. Hitung jumlah user yang berstatus Aktif
      const activeUserCount = await tenantPrisma.user.count({
        where: { isActive: true },
      });

      // Walaupun usernya 0, tetap buat tagihan (total Rp 0) sebagai rekam jejak
      const totalAmount = activeUserCount * COST_PER_USER;

      // 4. Buat record Tagihan di schema public
      await publicPrisma.subscriptionBilling.create({
        data: {
          tenantId: tenant.id,
          month: currentMonth,
          year: currentYear,
          activeUserCount: activeUserCount,
          amount: totalAmount,
          status: "PENDING",
        },
      });

      console.log(`➜ Sukses! Tercetak tagihan untuk ${activeUserCount} Karyawan (Total: Rp ${totalAmount.toLocaleString('id-ID')})`);
      successCount++;
    } catch (error: any) {
      console.error(`➜ Gagal memproses ${tenant.name}:`, error.message);
    }
  }

  console.log(`\n=== Selesai. Total ${successCount} tagihan baru berhasil dicetak. ===`);
  await publicPrisma.$disconnect();
}

generateMonthlyBillings();
