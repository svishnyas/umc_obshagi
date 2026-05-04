# Как перезапустить dev-сервер вручную (Windows / PowerShell)

Используй этот порядок, если Cursor или терминал «зависли», порт занят, или после установки пакетов / правок Prisma.

## 1. Остановить текущий `npm run dev`

В том терминале, где запущен сервер: **Ctrl+C**.

Если терминал недоступен — см. шаг 2.

## 2. Освободить порт 3000 (если процесс остался висеть)

Открой PowerShell в папке проекта и выполни:

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
```

Если `npm` не находится в этой сессии, обнови PATH:

```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## 3. (Опционально) Prisma после смены схемы

```powershell
npx prisma db push
npx prisma generate
```

Если `generate` падает с EPERM на DLL — закрой dev-сервер и Cursor на минуту и повтори, или используй `npm run db:sync` из `package.json`.

## 4. Очистить кэш Next (если странные ошибки Prisma в браузере)

Удали папку `.next` в корне проекта, затем снова:

```powershell
npm run dev
```

## 5. Запуск

```powershell
cd путь\к\umc_obshagi
npm run dev
```

Можно добавить ярлык или сохранить скрипт `.ps1` с шагами 2 + `npm run dev`, если делаешь это часто.
