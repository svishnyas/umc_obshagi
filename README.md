# УМЦобщаги

Форум общежитий: Next.js (App Router) + **SQLite** (по умолчанию) + Prisma + Auth.js + TanStack Query. Фото: **папка `public/uploads`** без MinIO, либо S3 при настройке переменных. Дизайн перенесён из макета `reference/forum.html`.

Репозиторий: [github.com/svishnyas/umc_obshagi](https://github.com/svishnyas/umc_obshagi)

## Требования

- **Только Node.js 20+** и npm — дополнительных установок (Docker, Postgres, MinIO) для локальной проверки не нужно.

## Локальный запуск без Docker

1. Скопируй окружение (в `.env.example` уже указан SQLite):

   ```bash
   cp .env.example .env
   ```

2. Установи зависимости и создай БД + демо-данные:

   ```bash
   npm install
   npx prisma migrate deploy
   npm run db:seed
   ```

3. Запуск:

   ```bash
   npm run dev
   ```

   Открой `http://localhost:3000` → `/auth` → после входа `/feed`.

Загрузки картинок сохраняются в `public/uploads/` и отдаются как `/uploads/...`.

## Демо-данные (после seed)

- **Пароль всех демо-пользователей:** `demo123`
- **Коды общаг:** `123456` (Волхонка), `234567` (Даниловская), `345678` (Беговая)

Вход: ник из сида (например `Антон К.`) + пароль `demo123` + код соответствующей общаги.

## Опционально: PostgreSQL + MinIO

Если нужны отдельные сервисы, подними `docker compose up -d`, задай в `.env` строку `DATABASE_URL` для Postgres и полный набор переменных **S3_\*** — тогда загрузки пойдут в бакет вместо `public/uploads`.

## Скрипты

| Команда              | Описание                    |
|---------------------|-----------------------------|
| `npm run dev`       | Dev-сервер                  |
| `npm run build`     | Сборка production           |
| `npm run db:migrate`| Prisma migrate dev          |
| `npm run db:seed`   | Заполнить БД                |
| `npm run db:studio` | Prisma Studio               |

## Структура

- `src/app` — страницы и Route Handlers (`/api/*`)
- `src/components/feed` — лента, топбар, сайдбары, профиль, уведомления
- `src/components/auth` — вход и регистрация
- `prisma/` — схема, миграции, `seed.ts`
- `reference/forum.html` — исходный HTML-макет

## Примечания

- Поллинг: посты и обзор ~30 с, уведомления ~20 с, presence ~15 с, heartbeat POST каждые 60 с.
- Имя и аватар в сессии подтягиваются из БД на сервере.

## Публикация на GitHub (первый push)

Сделай на своём компьютере в папке проекта (нужен установленный [Git](https://git-scm.com/downloads) и аккаунт GitHub).

1. Убедись, что **`.env` не попадёт в коммит** (он уже в `.gitignore`). Секреты в репозиторий не кладём.
2. Если папки `.git` ещё нет — инициализируй и закоммить:

   ```bash
   git init
   git add .
   git commit -m "Initial commit: УМЦобщаги"
   ```

3. Подключи удалённый репозиторий и отправь код (**один раз** подставь свой URL, если используешь SSH — замени на `git@github.com:svishnyas/umc_obshagi.git`):

   ```bash
   git branch -M main
   git remote add origin https://github.com/svishnyas/umc_obshagi.git
   git push -u origin main
   ```

   Если GitHub попросит логин: для HTTPS удобнее **Personal Access Token** вместо пароля ([документация GitHub](https://docs.github.com/en/authentication)).

4. Крупные файлы: один файл в репозитории не больше **100 MB** (лимит GitHub). Тяжёлые видео в `public/gta_pic/` лучше жать или хостить отдельно.

После пуша репозиторий перестанет быть «пустым», на странице [svishnyas/umc_obshagi](https://github.com/svishnyas/umc_obshagi) появится код и история коммитов.
