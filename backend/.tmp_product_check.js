require("dotenv/config");
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();
(async () => {
  try {
    const r = await p.$queryRawUnsafe("SELECT COUNT(*) AS c FROM Product");
    console.log(r);
  } catch (e) {
    console.error(e.message);
    console.error(e.code);
    console.error(e.meta);
  } finally {
    await p.$disconnect();
  }
})();
