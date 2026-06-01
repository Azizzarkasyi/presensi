const nowWIB = new Date(new Date().getTime() + 7 * 60 * 60 * 1000);
console.log('UTC Month of nowWIB:', nowWIB.getUTCMonth());
console.log('UTC Date of nowWIB:', nowWIB.toISOString());
