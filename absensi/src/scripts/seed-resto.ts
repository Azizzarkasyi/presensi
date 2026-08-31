import { tenantService } from '../prisma/tenant-service';
import { getTenantPrisma, getPublicPrisma, disconnectAll } from '../prisma/tenant-prisma';
import bcrypt from 'bcryptjs';

async function seedResto() {
  console.log('🌱 Memulai proses seeding data karyawan asli untuk Resto King...');

  try {
    console.log('Membangun perusahaan dan akun admin...');
    const tenant = await tenantService.createTenant({
      name: "Resto King",
      adminEmail: "restokingbabyayy@gmail.com",
      adminPassword: "Resto123",
      adminName: "Admin Resto King"
    });
    
    console.log(`✓ Perusahaan '${tenant.name}' berhasil dibuat dengan skema: ${tenant.schemaName}`);
    const tenantPrisma = getTenantPrisma(tenant.schemaName);
    
    console.log('Membuat data karyawan asli...');
    const hashedUserPassword = await bcrypt.hash("user123", 10);
    
    // Data Karyawan Asli
    const employeeData = [
      // Produksi (07:00 - 12:30)
      { name: "Husna", email: "husna@restoking.com", start: "07:00", end: "12:30", loc: "Produksi" },
      { name: "Nida", email: "nida@restoking.com", start: "07:00", end: "12:30", loc: "Produksi" },
      { name: "Dyah", email: "dyah@restoking.com", start: "07:00", end: "12:30", loc: "Produksi" },
      { name: "Septi", email: "septi@restoking.com", start: "07:00", end: "12:30", loc: "Produksi" },
      
      // Stand Unisa (14:30 - 21:30)
      { name: "Heri", email: "heri@restoking.com", start: "14:30", end: "21:30", loc: "Stand Unisa" },
      { name: "Widya", email: "widya@restoking.com", start: "14:30", end: "21:30", loc: "Stand Unisa" },
      
      // Stand UMY (14:30 - 21:30)
      { name: "Daffa", email: "daffa@restoking.com", start: "14:30", end: "21:30", loc: "Stand UMY" },
      { name: "Fadlin", email: "fadlin@restoking.com", start: "14:30", end: "21:30", loc: "Stand UMY" },
      
      // Stand Godean (14:30 - 21:30)
      { name: "Rio", email: "rio@restoking.com", start: "14:30", end: "21:30", loc: "Stand Godean" }
    ];

    const employees = [];
    for (const data of employeeData) {
      const emp = await tenantPrisma.user.create({
        data: {
          email: data.email,
          password: hashedUserPassword,
          name: data.name,
          role: "USER",
          isActive: true,
          salaryType: "MONTHLY",
          salary: 3000000,
          startWorkTime: data.start,
          endWorkTime: data.end,
          workLocations: [{ name: data.loc }] // Set lokasi kerja
        }
      });
      employees.push({ ...emp, ...data });
    }
    console.log(`✓ Berhasil membuat 9 karyawan (Password semua karyawan: user123)`);

    console.log('Membuat riwayat absensi untuk bulan ini...');
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();
    
    let attendanceCount = 0;
    
    for (const emp of employees) {
      for (let day = 1; day <= currentDay; day++) {
        const date = new Date(currentYear, currentMonth, day);
        if (date.getDay() === 0) continue; // Skip minggu libur
        
        const isPagi = emp.start === "07:00";
        
        // Atur jam masuk (dengan random terlambat dikit)
        const clockInTime = new Date(date);
        if (isPagi) {
          clockInTime.setHours(6, 45 + Math.floor(Math.random() * 30), 0); // 06:45 - 07:15
        } else {
          clockInTime.setHours(14, 15 + Math.floor(Math.random() * 30), 0); // 14:15 - 14:45
        }
        
        let status = "PRESENT";
        if (isPagi && clockInTime.getHours() === 7 && clockInTime.getMinutes() > 0) status = "LATE";
        if (!isPagi && clockInTime.getHours() === 14 && clockInTime.getMinutes() > 30) status = "LATE";

        // Atur jam pulang (jika sudah waktunya pulang)
        let clockOutTime = null;
        if (day < currentDay || (day === currentDay && today.getHours() >= (isPagi ? 12 : 21))) {
          clockOutTime = new Date(date);
          if (isPagi) {
            clockOutTime.setHours(12, 30 + Math.floor(Math.random() * 30), 0); // 12:30 - 13:00
          } else {
            clockOutTime.setHours(21, 30 + Math.floor(Math.random() * 30), 0); // 21:30 - 22:00
          }
        }

        await tenantPrisma.attendance.create({
          data: {
            userId: emp.id,
            date: date,
            clockIn: clockInTime,
            clockOut: clockOutTime,
            status: status as any,
          }
        });
        attendanceCount++;
      }
    }
    
    console.log(`✓ Berhasil membuat ${attendanceCount} record absensi.`);
    console.log('🎉 SEEDING SELESAI!');
    
  } catch (error) {
    console.error('❌ Gagal melakukan seeding:', error);
  } finally {
    await disconnectAll();
  }
}

seedResto();
