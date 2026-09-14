# CS2 TacMap

*by mineDres-Team* — продвинутая интерактивная тактическая карта Counter-Strike 2: рисование маршрутов,
drag-and-drop иконок, траектории раскидок, тайминги, таймлайн раунда, шаринг страт по ссылке,
аккаунты через Discord и Discord-бот с выбором языка.

| Компонент | Где живёт | Что делает |
|---|---|---|
| `index.html` + `assets/` | GitHub Pages | Всё приложение (ES-модули, без сборки) |
| `server/` | ваша машина | API: страты, ревизии, Discord OAuth2, заглушки парсера демок |
| `bot/` | ваша машина | Discord-бот (disnake): панель языков RU/UK/EN, анонсы, карточки страт |

## Возможности приложения

- **Карты и этажи** — 9 карт, радары Simple Radar; Nuke и Vertigo с переключателем Upper/Lower,
  кнопка **Радар / Схема** в шапке.
- **Рисование** — кисть, стрелки, 8 цветов, толщина, ластик (стирает линии, нейды, замеры, иконки),
  очистка по этажу.
- **Иконки** — T/CT, AWP, смок/флеш/HE/молотов/дековй, C4, дефьюз, маркер. Drag-and-drop с панели
  или клик по иконке → клик по карте. Двойной клик — подпись, `Delete` — удалить.
- **Траектории раскидок** — режим `Nade`: клик по позиции игрока → клик по точке прилёта. Кривая с
  настраиваемой дугой, радиусом облака по типу гранаты и подписью лайнапа.
- **Рулетка / тайминги** — два клика дают дистанцию в юнитах и время в пути с учётом скорости
  (бег 250, нож 260, AWP 200, шаг 130, присед 85 u/s), масштаб берётся из реальных overview-scale карт.
- **Таймлайн раунда** — ползунок 0:00–1:55, play/pause, ключевые кадры. Режим `REC keys`: двигаете
  иконку на нужной секунде — записывается keyframe, между ними позиции интерполируются.
- **Share URL** — состояние сериализуется в компактный JSON, при необходимости жмётся `deflate-raw`
  и кладётся в `?strat=...` (base64url). Кнопка **Short** сохраняет страту в API и даёт `?s=<id>`.
- **История** — Undo/Redo (Ctrl+Z / Ctrl+Shift+Z), локальная история последних 25 состояний
  (в том числе автосейвы) и облачная история страт в аккаунте Discord с ревизиями.
- **Demo Analyzer** — загрузка `.dem` и ссылки на матч Faceit/матчмейкинг: UI готов, парсинг —
  заглушка на сервере (`status: not_implemented`) с описанием будущего пайплайна.
- **Экспорт PNG** — рендер текущего этажа со всеми слоями.

### Горячие клавиши

`V` выделение · `P` кисть · `A` стрелка · `E` ластик · `N` нейды · `R` рулетка ·
`Space` play/pause · `Ctrl+Z` / `Ctrl+Shift+Z` отмена/повтор · `Ctrl+S` share ·
`Delete` удалить выбранное · `Esc` отмена действия · `0` сброс вида ·
колесо мыши — зум, ПКМ/СКМ или `Alt`+ЛКМ — панорама.

## Деплой фронтенда на GitHub Pages

1. Запушьте репозиторий в GitHub.
2. **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` сам соберёт `_site` и опубликует.
4. Пропишите адрес своего API в `assets/js/config.js` (`API_BASE`) — или задайте его прямо в
   интерфейсе (панель **Backend API**), либо через `?api=https://...` в адресной строке.

Сайт полностью работает и без бэкенда: рисование, страты в URL и локальная история не требуют сервера.

## API на своей машине

```bash
cd server
cp .env.example .env      # заполнить JWT_SECRET, APP_ORIGINS, DISCORD_*
npm install
npm start                 # http://0.0.0.0:8787
```

Ключевые переменные `.env`:

| Переменная | Смысл |
|---|---|
| `APP_ORIGINS` | Разрешённые origin фронтенда, через запятую (адрес GitHub Pages) |
| `JWT_SECRET` | 64 случайных hex-символа: `openssl rand -hex 32` |
| `DISCORD_CLIENT_ID/SECRET` | Из Discord Developer Portal → OAuth2 |
| `DISCORD_REDIRECT_URI` | `http://ВАШ-IP:8787/api/auth/discord/callback` |
| `PUBLIC_URL` | Внешний адрес API |

### Маршруты

```
GET    /api/health
GET    /api/maps
GET    /api/auth/discord?redirect=<URL фронта>
GET    /api/auth/discord/callback
GET    /api/auth/me                     (Bearer)
POST   /api/auth/logout                 (Bearer)
GET    /api/strats/mine                 (Bearer)
POST   /api/strats                      (аноним → editToken, с токеном → привязка к аккаунту)
GET    /api/strats/:id
PUT    /api/strats/:id                  (владелец или X-Edit-Token)
DELETE /api/strats/:id                  (владелец)
GET    /api/strats/:id/revisions        (владелец)
POST   /api/demos/upload                (multipart .dem → 202 not_implemented)
POST   /api/demos/link                  (ссылка на матч → 202 not_implemented)
GET    /api/demos/jobs/:id
```

Данные лежат в `server/data/db.json` (атомарная запись), загруженные демки — в `server/data/uploads`.

### Discord OAuth2

В Developer Portal → OAuth2 → Redirects добавьте **точно** такой URI:

```
http://ВАШ-IP:8787/api/auth/discord/callback
```

Scope — `identify`. Схема входа: фронт с Pages шлёт пользователя на `/api/auth/discord`,
сервер обменивает код, выдаёт JWT и возвращает на фронт с `#token=...`. Токен хранится в
`localStorage` и ходит в заголовке `Authorization: Bearer` — кросс-доменно, без cookies.

## Discord-бот

```bash
cd bot
python -m venv .venv && . .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python bot.py
```

Токен и ID берутся из корневого `.env` (перекрываются `bot/.env`). Пример — `.env.example`.

| Команда | Что делает |
|---|---|
| `/panel` | Публикует и закрепляет панель выбора языка (Select Menu 🇷🇺 🇺🇦 🇬🇧) |
| `/language` | Смена языка без панели |
| `/langstats` | Сколько участников выбрали каждый язык |
| `/tacmap` | Карточка со ссылкой на тактическую карту |
| `/strat <код>` | Карточка страты из API: карта, счётчики объектов, кнопка «Открыть» |
| `/maps`, `/status` | Список карт и статус API |
| `/announce` | Модалка (заголовок, текст, ссылка, картинка) → оформленный embed с пингом нужного языка |
| `/say`, `/help` | Быстрое сообщение и справка |

Панель переживает перезапуск бота: `View` персистентная, id сообщения хранится в `bot/data/bot.json`.
Для выдачи ролей включите **Server Members Intent** и поставьте роль бота выше языковых ролей.

### Автозапуск (systemd)

```ini
[Unit]
Description=CS2 TacMap API
After=network.target

[Service]
WorkingDirectory=/opt/cs2-tacmap/server
ExecStart=/usr/bin/node src/index.js
Restart=always
User=tacmap
EnvironmentFile=/opt/cs2-tacmap/server/.env

[Install]
WantedBy=multi-user.target
```

```ini
[Unit]
Description=CS2 TacMap Discord Bot
After=network.target cs2-tacmap-api.service

[Service]
WorkingDirectory=/opt/cs2-tacmap/bot
ExecStart=/opt/cs2-tacmap/bot/.venv/bin/python bot.py
Restart=always
User=tacmap

[Install]
WantedBy=multi-user.target
```

## Архитектура фронтенда

```
assets/js/
  config.js            адрес API, база радаров, лимиты, инвайт Discord
  core/                bus (события), store (состояние), geometry, codec (base64/deflate), dom
  data/                maps.js (радары, масштабы, спавны), catalog.js (иконки, гранаты, скорости)
  render/              stage (viewport, зум, ввод), mapView (радар/схема), overlay (canvas), tokens (иконки)
  tools/               select, pen, arrow, eraser, nade, ruler + маршрутизатор инструментов
  features/            history, share, library, document, api, auth, timeline, demo, exportPng
  ui/panels.js         связывание всех панелей и горячих клавиш
```

Новый инструмент = объект `{ id, tip, onDown, onMove, onUp }` в `tools/` и строка в `TOOLS`.
Новая карта = запись в `data/maps.js` + PNG радара в `assets/maps/`.

## Кредиты

Радары — [Simple Radar](https://readtldr.gg/simpleradar) (ReadTLDR / AREDONE), сконвертированы из `.dds` в PNG.
Counter-Strike — торговая марка Valve Corporation; проект не аффилирован с Valve.

**Powered by [mineDres-Team](https://discord.gg/ZMG7Z8pTs5)**
