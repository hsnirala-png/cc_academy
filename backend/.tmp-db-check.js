require("dotenv").config({ path: ".env" });
require("dotenv").config({ path: ".env.local", override: true });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

prisma.user.findFirst({ select: { id: true } })
  .then((row) => {
    console.log("DB_OK", row);
  })
  .catch((err) => {
    console.error("DB_ERR", err);
  })
  .finally(async () => {
    await prisma["$disconnect"]();
  });
