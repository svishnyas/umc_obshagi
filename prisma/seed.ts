import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.photo.deleteMany();
  await prisma.post.deleteMany();
  await prisma.roomSquadMember.deleteMany();
  await prisma.roomSquad.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.event.deleteMany();
  await prisma.user.deleteMany();
  await prisma.dorm.deleteMany();

  const ownerPassword = process.env.SEED_OWNER_PASSWORD?.trim() || "demo123";
  const ownerNickname = "Артём Родионов";
  const ownerRoom = "301";

  const d1 = await prisma.dorm.create({
    data: {
      slug: "1",
      name: "Волхонка",
      sub: "Мужская общага",
      color: "#4B9EFF",
      accessCodeHash: await bcrypt.hash("123456", 10),
    },
  });
  const d2 = await prisma.dorm.create({
    data: {
      slug: "2",
      name: "Даниловская",
      sub: "Женская общага",
      color: "#FF6BAE",
      accessCodeHash: await bcrypt.hash("234567", 10),
    },
  });
  const d3 = await prisma.dorm.create({
    data: {
      slug: "3",
      name: "Беговая",
      sub: "Мужская общага",
      color: "#FFB347",
      accessCodeHash: await bcrypt.hash("345678", 10),
    },
  });
  const owner = await prisma.user.create({
    data: {
      nickname: ownerNickname,
      dormId: d1.id,
      room: ownerRoom,
      passwordHash: await bcrypt.hash(ownerPassword, 10),
      isOwner: true,
    },
  });

  await prisma.notification.create({
    data: {
      userId: owner.id,
      text: `Аккаунт ${ownerNickname} создан. Роль старосты включена.`,
    },
  });

  console.log("Seed OK — база очищена от тестовых данных.");
  console.log(`Создан владелец: ${ownerNickname} (комн. ${ownerRoom}, Волхонка).`);
  console.log(
    `Пароль владельца: ${ownerPassword} (можно задать через SEED_OWNER_PASSWORD).`,
  );
  console.log("Коды общаг: 123456 / 234567 / 345678");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
