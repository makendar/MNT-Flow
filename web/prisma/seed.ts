import { PrismaClient } from "@prisma/client";
import { DEMO_PASSWORD, seedDemo } from "./demo-seed";

const db = new PrismaClient();

seedDemo(db)
  .then(({ today }) => {
    console.log(`Demo data seeded (reporting date ${today}). Sign in with any demo account, password: ${DEMO_PASSWORD}`);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
