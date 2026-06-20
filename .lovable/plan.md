## Что строим (MVP, первый этап)

Веб-приложение для трекинга сериалов в духе Letterboxd/Serializd. Тёмная тема, акцент на постеры.

### Стек
- TanStack Start + React + Tailwind (текущий шаблон)
- Lovable Cloud (Supabase под капотом) — auth, БД, edge function
- TMDB API через edge function-прокси (ключ в секретах, не в бандле)

### Схема БД (миграция)
- `profiles` (id = auth.uid(), username unique, avatar_url, bio)
- `watch_status` (user_id, tmdb_show_id, status enum, updated_at) + UNIQUE(user_id, tmdb_show_id)
- `episode_progress` (user_id, tmdb_show_id, season_number, episode_number, watched_at) + UNIQUE(...)
- `reviews` (user_id, target_type enum, tmdb_show_id, season_number nullable, episode_number nullable, rating 1–10, text, contains_spoilers, created_at) + 3 частичных уникальных индекса по target_type
- `likes` отложен на второй этап
- RLS на всех таблицах: SELECT всем (включая anon), INSERT/UPDATE/DELETE только если user_id = auth.uid()
- GRANT'ы (anon SELECT, authenticated всё, service_role ALL)
- Триггер auto-create профиля при signup

### TMDB edge function
Один edge function `tmdb` с роутингом по query (`?path=trending/tv/week` и т.п.) — проксирует GET-запросы к `api.themoviedb.org/3`, добавляя `Authorization: Bearer ${TMDB_API_KEY}`. Клиент дёргает через `supabase.functions.invoke('tmdb', { body: { path, params } })`.

### Сервисный слой (хуки)
`src/lib/tracking.ts`:
- `useWatchStatus(tmdbId)`, `setWatchStatus(tmdbId, status)`
- `logEpisode/unlogEpisode`, `logSeason/unlogSeason` (проставляет/удаляет все эпизоды сезона разом), `logShow/unlogShow`
- `useReviews(target)`, `upsertReview(...)`

### Страницы (MVP-объём)
1. `/` — Discover: trending + popular grid, поиск
2. `/show/$id` — постер, мета, статус-дропдаун, список сезонов, рецензии на сериал, форма рецензии
3. `/show/$id/season/$n` — список эпизодов с чекбоксами, кнопка "отметить весь сезон"
4. `/show/$id/season/$n/episode/$e` — детали эпизода, отметка, рецензии на эпизод с тоглом спойлеров
5. `/profile/$username` — статистика (completed, всего эпизодов, средняя оценка), вкладки по статусам, лента рецензий
6. `/auth` — email/password (Google добавим, если попросишь)

### Дизайн
Тёмная палитра (близко к Letterboxd: глубокий фон ~#14181c, акцент тёплый янтарный/оранжевый для рейтингов), grid постеров 2:3, минимум хрома, типографика — современный sans (Inter/Geist).

### Что нужно от тебя ДО запуска
1. Подтверждение, что включаем Lovable Cloud (auth + БД + edge function)
2. **TMDB API Read Access Token (v4)** — получить на themoviedb.org → Settings → API → "API Read Access Token". Я попрошу его через secure-форму после твоего "ок".

### После генерации проверим
- Edge function скрывает ключ (в Network видны только запросы к Supabase functions)
- RLS: попытка update чужой записи через консоль вернёт ошибку
- Флоу: signup → поиск → статус → отметка эпизода → рецензия

### Что НЕ войдёт в первый этап
Лайки рецензий, фолловинг/лента друзей, импорт из Trakt — на второй заход.

---

Подтверди план (или скажи, что поправить), и я сразу включу Cloud и начну.