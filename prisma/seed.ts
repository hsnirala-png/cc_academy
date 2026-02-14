import "dotenv/config";
import { Role } from "@prisma/client";
import bcrypt from "bcrypt";
import { prisma } from "../src/utils/prisma";

const run = async (): Promise<void> => {
  const adminMobile = "9999999999";
  const adminEmail = "admin@ccacademy.com";
  const adminPassword = "Admin@12345";

  const existingAdmin = await prisma.user.findFirst({
    where: {
      OR: [{ mobile: adminMobile }, { email: adminEmail }],
    },
  });

  if (existingAdmin) {
    console.log("Admin already exists. Seed skipped.");
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.create({
    data: {
      name: "CC Academy Admin",
      mobile: adminMobile,
      email: adminEmail,
      passwordHash,
      role: Role.ADMIN,
    },
  });

  console.log("Admin user seeded successfully.");
};

run()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
