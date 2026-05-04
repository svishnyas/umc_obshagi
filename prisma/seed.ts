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

  const passwordHash = await bcrypt.hash("demo123", 10);

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

  const u = async (
    nickname: string,
    dormId: string,
    room: string | null,
    isOwner = false,
  ) =>
    prisma.user.create({
      data: {
        nickname,
        dormId,
        room,
        passwordHash,
        isOwner,
      },
    });

  const anton = await u("Владыка Форума", d1.id, "312", true);
  const lena = await u("Лена В.", d2.id, "108");
  const dima = await u("Дима Н.", d3.id, "215");
  const masha = await u("Маша Д.", d2.id, "305");
  const kirill = await u("Кирилл О.", d1.id, "412");

  const maxim = await u("Максим", d1.id, "201");
  const serega = await u("Серёга В.", d3.id, "104");
  const katya = await u("Катя", d2.id, "210");
  const yulia = await u("Юля", d2.id, "112");
  const natasha = await u("Наташа", d2.id, "401");

  const now = Date.now();
  const hours = (n: number) => new Date(now - n * 3600000);
  const days = (n: number) => new Date(now - n * 86400000);

  const p1 = await prisma.post.create({
    data: {
      authorId: anton.id,
      dormId: d1.id,
      tag: "e",
      text: "В субботу в холле 3 этажа собираемся на настолки. Начинаем в 18:00, приносите что есть.",
      createdAt: hours(2),
    },
  });
  await prisma.comment.createMany({
    data: [
      { postId: p1.id, authorId: maxim.id, text: "Буду!" },
      { postId: p1.id, authorId: serega.id, text: "Иду, беру UNO" },
    ],
  });

  const p2 = await prisma.post.create({
    data: {
      authorId: lena.id,
      dormId: d2.id,
      tag: "l",
      text: "Потеряла ключ от комнаты около столовой. Брелок — маленький жёлтый медведь. Если найдёте — стучите в 108.",
      createdAt: hours(4),
    },
  });

  const p3 = await prisma.post.create({
    data: {
      authorId: dima.id,
      dormId: d3.id,
      tag: "q",
      text: "До какого времени работает прачечная? Написано 22:00, но вчера в 21 уже было закрыто.",
      createdAt: hours(6),
    },
  });
  await prisma.comment.create({
    data: {
      postId: p3.id,
      authorId: katya.id,
      text: "До 21:30 по факту",
    },
  });

  const p4 = await prisma.post.create({
    data: {
      authorId: masha.id,
      dormId: d2.id,
      tag: "g",
      text: "Девчонки, в нашем дворе появилась новая лавочка — наконец-то можно нормально посидеть летним вечером.",
      createdAt: days(1),
    },
  });
  await prisma.comment.createMany({
    data: [
      { postId: p4.id, authorId: yulia.id, text: "Ура, давно ждали!" },
      {
        postId: p4.id,
        authorId: natasha.id,
        text: "Кто-нибудь уже опробовал?",
      },
    ],
  });

  const p5 = await prisma.post.create({
    data: {
      authorId: kirill.id,
      dormId: d1.id,
      tag: "g",
      text: "Поменяли лампочку на 4 этаже — теперь хоть что-то видно. Спасибо коменданту.",
      createdAt: days(2),
    },
  });

  const squad312 = await prisma.roomSquad.create({
    data: {
      dormId: d1.id,
      roomLabel: "312",
      title: "Ночная смена",
      bannerColor: "#4B9EFF",
      members: {
        create: [
          { userId: anton.id, role: "LEADER" },
          { userId: maxim.id, role: "MEMBER" },
        ],
      },
    },
  });
  await prisma.post.create({
    data: {
      authorId: maxim.id,
      dormId: d1.id,
      squadId: squad312.id,
      tag: "g",
      text: "Кто снова оставил чайник на плите? Мы не против чая, но будьте аккуратнее.",
    },
  });

  const posts = [p1, p2, p3, p4, p5];
  const likers = [masha, dima, lena, kirill, anton, maxim];
  let li = 0;
  for (const p of posts) {
    const n = p.id === p1.id ? 3 : p.id === p4.id ? 4 : 2;
    for (let i = 0; i < n; i++) {
      const liker = likers[li % likers.length];
      li++;
      await prisma.like.create({
        data: { postId: p.id, userId: liker.id },
      });
    }
  }

  await prisma.event.createMany({
    data: [
      {
        dormId: d1.id,
        title: "Настолки в холле",
        dateText: "Сб, 18:00",
        color: "#4B9EFF",
      },
      {
        dormId: d2.id,
        title: "Кино-вечер",
        dateText: "Пт, 20:00",
        color: "#FF6BAE",
      },
      {
        dormId: null,
        title: "Уборка этажей",
        dateText: "Вс, 11:00",
        color: "#1ECC8A",
      },
    ],
  });

  console.log("Seed OK — демо-пароль всех пользователей: demo123");
  console.log("Коды общаг: 123456 / 234567 / 345678");
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
