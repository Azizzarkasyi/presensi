process.env.TZ = "Asia/Jakarta";
const nowWIB = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
const targetMonth = nowWIB.getUTCMonth();
const targetYear = nowWIB.getUTCFullYear();

const startDate = new Date(targetYear, targetMonth, 1);
const endDate = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

const clockInNow = new Date();
const today = new Date(Date.UTC(clockInNow.getFullYear(), clockInNow.getMonth(), clockInNow.getDate()));

console.log("targetMonth:", targetMonth);
console.log("startDate (UTC):", startDate.toISOString());
console.log("endDate (UTC):", endDate.toISOString());
console.log("today (UTC):", today.toISOString());
console.log("is today between startDate and endDate?", today >= startDate && today <= endDate);
