# УМЦобщаги

Форум общежитий: Next.js (App Router) + **PostgreSQL** + Prisma + Auth.js + TanStack Query. Фото: **папка `public/uploads`** без MinIO, либо S3 при настройке переменных. Дизайн перенесён из макета `reference/forum.html`.

Репозиторий: [github.com/svishnyas/umc_obshagi](https://github.com/svishnyas/umc_obshagi)

## Требования

- **Node.js 20+** и npm.
- **PostgreSQL** для БД: локально удобнее всего через Docker (`docker compose up -d postgres`), либо облако ([Neon](https://neon.tech) и т.п.).

## Локальный запуск (Postgres в Docker)

1. Подними Postgres и скопируй окружение:

   ```bash
   docker compose up -d postgres
   cp .env.example .env
   ```

   В `.env` строка `DATABASE_URL` уже совпадает с `docker-compose.yml` (`umc` / `umc` / база `umc`).

2. Установи зависимости, применни миграции и (опционально) демо-данные:

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

## Опционально: MinIO / S3

Подними `docker compose up -d` (postgres + minio), задай в `.env` полный набор переменных **S3_\*** — тогда загрузки пойдут в бакет вместо `public/uploads`.

## Деплой на Vercel (из GitHub)

На Vercel **нельзя** полагаться на файл SQLite на диске — нужна **облачная Postgres** (удобно [Neon](https://neon.tech), бесплатный тариф).

1. Создай проект БД в Neon, скопируй **`DATABASE_URL`** (для serverless часто добавляют `?sslmode=require` в конец строки).
2. В настройках проекта Vercel → **Environment Variables** задай:
   - `DATABASE_URL` — из Neon;
   - `AUTH_SECRET`, `NEXTAUTH_URL` (`https://<проект>.vercel.app`), `AUTH_TRUST_HOST=true`.
3. Задеплой из GitHub. Сборка выполнит `prisma migrate deploy` и создаст таблицы.
4. **Один раз** заполни общаги и демо (с локальной машины, тот же `DATABASE_URL`):

   ```bash
   set DATABASE_URL=postgresql://...   # Windows; на macOS/Linux: export DATABASE_URL=...
   npm run db:seed
   ```

   Без сида регистрация даст «общага не найдена», потому что строк в таблице `Dorm` ещё нет.

Загрузки картинок на Vercel без S3 тоже ненадёжны (эфемерный диск) — для продакшена лучше задать **S3_\*** (Cloudflare R2, AWS S3 и т.д.).

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

## Деплой «без геморроя» (один дешёвый VPS)

Так проще всего держать **Postgres + файлы в `public/`** на одной машине. Панели вроде Timeweb/Selectel часто дают готовый VPS с Ubuntu — бери **1–2 GB RAM**, Debian/Ubuntu 22+. Установи PostgreSQL на VPS или подними контейнер из `docker-compose.yml` и пропиши `DATABASE_URL` в `.env`.

### 1. На сервере один раз

```bash
sudo apt update && sudo apt install -y git curl
# Node 20 LTS (через NodeSource — см. https://github.com/nodesource/distributions )
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm i -g pm2
```

Клон и сборка:

```bash
sudo mkdir -p /var/www && sudo chown "$USER":"$USER" /var/www
cd /var/www
git clone https://github.com/svishnyas/umc_obshagi.git
cd umc_obshagi
cp .env.example .env
nano .env   # см. блок переменных ниже
npm ci
npm run build
pm2 start npm --name umc-obshagi -- start
pm2 save
pm2 startup   # выполни выведенную команду, чтобы процесс поднимался после перезагрузки
```

Приложение слушает порт **3000** (по умолчанию у `next start`).

### 2. Обязательные переменные в `.env` на проде

| Переменная | Пример |
|------------|--------|
| `DATABASE_URL` | `postgresql://USER:PASS@localhost:5432/umc` (или Neon / другой хост) |
| `AUTH_SECRET` | длинная случайная строка: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://твой-домен.ru` (ровно как в браузере, со схемой) |
| `AUTH_TRUST_HOST` | `true` |

После правки `.env`: `npm run build && pm2 restart umc-obshagi` (`npm run build` уже вызывает `prisma migrate deploy`).

Опционально первый контент: `npm run db:seed` (демо-пользователи; на бою лучше свой регистрационный поток и не светить `demo123`).

### 3. Домен и HTTPS (проще всего — Caddy)

Установи [Caddy](https://caddyserver.com/docs/install#debian-ubuntu-raspbian), в `/etc/caddy/Caddyfile`:

```text
твой-домен.ru {
  reverse_proxy 127.0.0.1:3000
}
```

`sudo systemctl reload caddy` — сертификат Let's Encrypt подтянется сам, если DNS A-запись домена уже смотрит на IP VPS.

### 4. Обновление кода после пуша в GitHub

```bash
cd /var/www/umc_obshagi
git pull
npm ci
npm run build
pm2 restart umc-obshagi
```

### 5. Бэкап (очень желательно)

Делай дамп Postgres (`pg_dump`) и копируй **`public/uploads/`** (и при желании `public/gta_pic/`). Без этого «минимальный бюджет» легко превращается в потерю базы.

### Что не подходит «в лоб»

- **Старый вариант с SQLite на Vercel** — файловая БД на serverless не работает; используй Postgres (Neon) и см. раздел «Деплой на Vercel» выше.
- Репозиторий: [svishnyas/umc_obshagi](https://github.com/svishnyas/umc_obshagi) — автодеплой по пушу можно добавить позже через GitHub Actions + SSH на VPS (нужны секреты в настройках репозитория).
