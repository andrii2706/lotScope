# Розгортання LotScope: Vercel, Supabase, домен і пошта

Інструкція для того, хто розгортає і супроводжує застосунок. Усі акаунти (Vercel, Supabase, Google Cloud, Resend, реєстратор домену) реєструйте на робочу адресу проєкту (`admin@ваш-домен` або окремий Gmail проєкту), не на особисту пошту, і в кожному сервісі додайте другого власника. Тоді проєкт можна передати іншій людині без втрати доступів.

Нижче `ваш-домен` означає домен продукту, наприклад `lotscope.com.ua`. Поки домену немає, замість `https://ваш-домен` використовуйте адресу `https://назва-проєкту.vercel.app`.

## Що зараз увімкнено

Платні автоматичні функції поки вимкнені перемикачами в `src/config/features.ts`. Їхній код лишається в проєкті, ключі для них зараз не потрібні.

| Функція | Перемикач | Стан | Що бачить менеджер замість неї |
|---|---|---|---|
| Ринкова ціна з AUTO.RIA | `marketPriceAuto` | вимкнено | вводить ціну авто в Україні вручну |
| Автоматична історія за VIN (VinAudit і аукціони) | `vinHistoryAuto` | вимкнено | у кроці 5 завантажує PDF або скриншоти Carfax чи AutoCheck |

Звіт Carfax зберігається разом зі звітом LotScope:

1. Менеджер у кроці 5 форми додає PDF (до 3 МБ) або скриншоти, до 4 файлів.
2. ШІ читає звіт і додає висновки з історії в аналіз.
3. Після збереження файли лежать у базі разом зі звітом (`report_files`). У блоці «Історія за VIN» є посилання «Додані звіти історії», яке відкриває файл. Файли бачать ті самі люди, що й сам звіт.

Щоб увімкнути платну функцію пізніше:

1. Отримайте ключ (кроки 5 і 6 нижче) і додайте його у Vercel.
2. У `src/config/features.ts` змініть потрібний перемикач на `true`.
3. Закомітьте зміну і задеплойте.

## Перший продакшн-запуск без домену

Мінімальний набір, з яким застосунок працює для клієнтів на адресі `https://назва-проєкту.vercel.app`:

1. Крок 0: робоча пошта проєкту.
2. Крок 1: Supabase.
3. Крок 3: Claude API.
4. Крок 2: Vercel. Значення візьміть із шаблону `.env.production.example`: заповніть його і вставте у Vercel → Environment Variables (поле приймає вміст `.env` файлу). Рядки, для яких ще немає значень, видаліть перед вставкою.
5. Крок 4 (дані аукціонів), якщо потрібні «Знайти лот» і пошук лотів.
6. Крок 7: вхід через Google з redirect URI на адресу `vercel.app`.
7. Розділ 6: перевірка.

Кроки 8 і 9 (домен, DNS і пошта Resend) робите, коли купите домен. Що змінити після цього:

1. Додайте домен у Vercel і впишіть DNS-записи (розділ 3).
2. Змініть `APP_URL` на `https://ваш-домен`.
3. Додайте новий redirect URI в Google.
4. Налаштуйте Resend і додайте у Vercel `RESEND_API_KEY`, `MAIL_FROM`, `MAIL_REPLY_TO`.
5. Redeploy.

## Покроково: сервіс за сервісом

Ідіть по кроках по черзі. Кожен ключ одразу записуйте в менеджер паролів і в Vercel (розділ 1), а для локальної роботи ще й у `.env.local`. Позначка «обов'язково» означає, що без цього кроку застосунок не запрацює. Решта вмикає окремі функції, їх можна додати пізніше.

### Крок 0. Робоча пошта проєкту (обов'язково)

1. Створіть окрему пошту для проєкту: `admin@ваш-домен` (переадресація або Workspace) або, поки домену немає, окремий Gmail проєкту.
2. Увімкніть на ній 2FA.
3. Усі наступні акаунти реєструйте саме на неї.

### Крок 1. База даних Supabase (обов'язково)

1. supabase.com → Sign up з робочою поштою → New project. Регіон оберіть найближчий до користувачів (наприклад Frankfurt, `eu-central-1`), пароль бази згенеруйте і збережіть.
2. Після створення: кнопка Connect → вкладка з рядками підключення → Transaction pooler (порт 6543). Скопіюйте рядок і підставте пароль замість `[YOUR-PASSWORD]`. Це `DATABASE_URL`.
3. Database → Settings → SSL Configuration: увімкніть «Enforce SSL on incoming connections» і завантажте сертифікат (для `DATABASE_SSL_CA`, розділ 4).
4. Project Settings → Data API: вимкніть Enable Data API.
5. Таблиці можна створити з комп'ютера: у PowerShell у папці проєкту виконайте `$env:DATABASE_URL="рядок"; npm run db:migrate`. Інакше їх створить перший деплой на Vercel.
6. Для тестових деплоїв створіть другий проєкт Supabase (наприклад `lotscope-preview`) і візьміть його рядок для Preview.

### Крок 2. Vercel (обов'язково)

1. vercel.com → Sign up через GitHub-акаунт, де лежить репозиторій.
2. Add New → Project → імпортуйте репозиторій. Framework визначиться сам (Next.js), налаштування залиште за замовчуванням.
3. Перед першим деплоєм відкрийте Environment Variables і додайте `DATABASE_URL` (окремо для Production і Preview), `ADMIN_EMAILS`, `APP_URL` (поки `https://назва-проєкту.vercel.app`) і `ANTHROPIC_API_KEY` з кроку 3. Найшвидше: заповніть `.env.production.example` і вставте його вміст у поле змінних.
4. Deploy. Після деплою відкрийте сайт: має з'явитися сторінка входу.
5. Settings → Functions → Region: той самий регіон, що в Supabase. Settings → Deployment Protection: увімкніть Vercel Authentication для Preview.
6. Створіть свій акаунт супер адміна: на комп'ютері `$env:DATABASE_URL="рядок продакшн-бази"; npm run user:password -- admin@ваш-домен`. Пошта має бути в `ADMIN_EMAILS`. Або увійдіть через Google після кроку 7.

### Крок 3. Claude API (обов'язково для аналізу)

1. platform.claude.com → Sign up з робочою поштою.
2. Billing: додайте спосіб оплати і поповніть баланс. Без балансу ключ не працює.
3. Limits: поставте місячний ліміт витрат, щоб випадково не перевитратити.
4. API keys → Create key (назва `lotscope-production`) → скопіюйте. Ключ показується один раз.
5. Додайте у Vercel `ANTHROPIC_API_KEY` і зробіть Redeploy. Перевірка: `https://сайт/api/analyze` показує `configured: true`.

### Крок 4. Дані аукціонів apiauctions.io (для «Знайти лот», пошуку і розшифровки VIN)

1. apiauctions.io → зареєструйтесь з робочою поштою й оберіть тариф.
2. У кабінеті скопіюйте API key.
3. Додайте у Vercel `AUCTION_API_KEY`, Redeploy. Перевірка: `https://сайт/api/lot` показує `configured: true`, а пошук за VIN підтягує фото.

### Крок 5. AUTO.RIA (ринкова ціна в Україні, зараз вимкнено)

Зараз цей крок не потрібен: перемикач `marketPriceAuto` вимкнений, ціну вводять вручну. Виконайте його, коли вирішите увімкнути функцію.

1. Відкрийте developers.ria.com/signup і зареєструйтесь з робочою поштою. Підтвердьте пошту з листа (перевірте «Спам»).
2. Увійдіть у кабінет developers.ria.com/account/ і скопіюйте API-ключ (40 символів, він також приходить листом).
3. Додайте у Vercel `AUTORIA_API_KEY`, Redeploy.
4. Безкоштовно дається 1000 запитів і не більше 30 на годину. Одна перевірка ціни в LotScope витрачає 1–3 запити, результат кешується на 7 днів. Якщо не вистачатиме, пакети купуються на developers.ria.com/payment.
5. Якщо реєстрація не працює:
   - вимкніть VPN, бо сайт може не пускати з іноземних IP;
   - вимкніть блокувальник реклами або спробуйте інший браузер чи режим інкогніто;
   - зачекайте кілька хвилин на лист підтвердження і перевірте «Спам»;
   - якщо нічого не допомогло, напишіть у підтримку RIA через сайт.

### Крок 6. VinAudit (автоматична історія за VIN, платно, зараз вимкнено)

Зараз цей крок не потрібен: перемикач `vinHistoryAuto` вимкнений, історію додають файлом Carfax. Виконайте його, коли вирішите увімкнути функцію.

1. Відкрийте data.vinaudit.com/signup?service_id=vehicle-history. Адреса `api.vinaudit.com` — це сервер для запитів застосунку, не сайт. Там завжди видно лише `apiv2`, і це нормально.
2. Пробний період безкоштовний, до 10 запитів. Робочий тариф: $100 на місяць плюс $1 за запит, корпоративний — за домовленістю.
3. Для API потрібні три значення: ключ (`key`), логін (`user`) і пароль (`pass`) доступу до API. Якщо в кабінеті видно лише ключ, напишіть у підтримку VinAudit і попросіть API bulk access з user і pass для Vehicle History API.
4. Додайте у Vercel `VINAUDIT_API_KEY`, `VINAUDIT_USER`, `VINAUDIT_PASS`, Redeploy. Перевірка: `https://сайт/api/history` показує `nmvtis: true`. Помилки відповіді VinAudit пишуться в логи з позначкою `[vinaudit]`.

### Крок 7. Вхід через Google

1. console.cloud.google.com з робочого акаунта → вгорі Select project → New project (`LotScope`).
2. APIs & Services → OAuth consent screen (Google Auth Platform): тип External, назва LotScope, support email робочий, контакти розробника робочі. Scopes: `openid`, `email`, `profile`.
3. Audience: опублікуйте застосунок (Publish app). Інакше увійти зможуть лише тестові користувачі зі списку.
4. Clients (Credentials) → Create client → Web application. Authorized redirect URIs:
   - `https://назва-проєкту.vercel.app/api/auth/google/callback` (поки немає домену);
   - `https://ваш-домен/api/auth/google/callback` (коли з'явиться домен);
   - `http://localhost:3000/api/auth/google/callback` (для розробки).
5. Скопіюйте Client ID і Client secret у Vercel як `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, Redeploy. На сторінці входу з'явиться кнопка Google.
6. IAM & Admin → IAM: додайте другого власника проєкту.

### Крок 8. Домен і DNS

1. Купіть домен у реєстратора (для `.ua` — в українського реєстратора) на робочу пошту.
2. Vercel → Settings → Domains → Add: `ваш-домен` і `www.ваш-домен`. Vercel покаже записи, які треба додати.
3. Додайте ці записи в DNS-панелі реєстратора (таблиця в розділі 3) і дочекайтесь зеленої позначки у Vercel. Зазвичай це від кількох хвилин до кількох годин.
4. Змініть у Vercel `APP_URL` на `https://ваш-домен`, Redeploy. Перевірте, що redirect URI з доменом є в Google (крок 7).
5. Налаштуйте вхідну пошту `admin@` і `support@` (переадресація реєстратора або Cloudflare Email Routing).

### Крок 9. Пошта для листів Resend

1. resend.com → Sign up з робочою поштою.
2. Domains → Add domain → `send.ваш-домен`, регіон EU.
3. Resend покаже записи MX, SPF (TXT) і DKIM (TXT). Додайте їх у DNS і натисніть Verify. Окремо додайте запис `_dmarc` (розділ 3).
4. API Keys → Create API key з правом Sending access лише для цього домену.
5. Додайте у Vercel `RESEND_API_KEY`, `MAIL_FROM=LotScope <noreply@send.ваш-домен>`, `MAIL_REPLY_TO=support@ваш-домен`, Redeploy.
6. Перевірка: «Забули пароль?» на сторінці входу → лист приходить у «Вхідні», не в «Спам».

### Крок 10. Фінальна перевірка

Пройдіть розділ 6 цього документа. Потім створіть тестову компанію в `/admin`, відкрийте запрошення в режимі інкогніто, увійдіть як менеджер і зробіть один аналіз.

## 1. Змінні у Vercel

Задаються в Vercel: Project → Settings → Environment Variables. Файл `.env.local` потрібен лише для локального запуску. Після кожної зміни зробіть Redeploy, інакше нові значення не підхопляться. Ключі й паролі позначайте як Sensitive.

### Обов'язкові

| Змінна | Значення | Звідки взяти |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[пароль]@aws-0-[регіон].pooler.supabase.com:6543/postgres` | Supabase → Connect → Shared pooler, режим Transaction (порт 6543) |
| `APP_URL` | `https://ваш-домен` | адреса сайту, без `/` у кінці |
| `ADMIN_EMAILS` | `admin@ваш-домен` | пошта супер адміна, кілька через кому |
| `ANTHROPIC_API_KEY` | `sk-ant-…` | platform.claude.com → API keys |

### Дані для аналізу

| Змінна | Звідки взяти | Без неї |
|---|---|---|
| `AUCTION_API_KEY` | кабінет apiauctions.io | «Знайти лот» і пошук лотів показують лише посилання |
| `AUTORIA_API_KEY` | developers.ria.com/account/ після реєстрації на developers.ria.com/signup. Поки `marketPriceAuto` вимкнено, не потрібен | ринкову ціну вводять вручну |
| `VINAUDIT_API_KEY`, `VINAUDIT_USER`, `VINAUDIT_PASS` | data.vinaudit.com (пробно 10 запитів, далі $100/міс + $1 за запит). Поки `vinHistoryAuto` вимкнено, не потрібні | історію додають файлом Carfax |

### Вхід через Google

| Змінна | Звідки взяти |
|---|---|
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google Cloud → APIs & Services → Credentials → OAuth client ID (Web application) |

### Пошта

| Змінна | Значення |
|---|---|
| `RESEND_API_KEY` | resend.com → API Keys, право лише Sending access |
| `MAIL_FROM` | `LotScope <noreply@send.ваш-домен>` |
| `MAIL_REPLY_TO` | `support@ваш-домен`: спільна скринька, не особиста |

### Захист бази

| Змінна | Значення |
|---|---|
| `DATABASE_SSL_CA` | вміст сертифіката Supabase (розділ 4). Вмикає повну перевірку сертифіката бази |

### Не задавайте на продакшні

Змінні `AUCTION_API_URL`, `AUTORIA_API_URL`, `VINAUDIT_API_URL`, `RESEND_API_URL`, `NBU_API_URL`, `GOOGLE_AUTH_URL`, `GOOGLE_TOKEN_URL`, `GOOGLE_USERINFO_URL` потрібні лише для тестів з підробленими серверами. У коді вже прописані правильні адреси:

| Сервіс | Адреса в коді |
|---|---|
| Дані аукціонів | `https://apiauctions.io` |
| AUTO.RIA | `https://developers.ria.com` |
| VinAudit | `https://api.vinaudit.com` |
| Resend | `https://api.resend.com` |
| Курси НБУ | `https://bank.gov.ua` (ключ не потрібен) |
| Google OAuth | `accounts.google.com`, `oauth2.googleapis.com`, `openidconnect.googleapis.com` |

## 2. Адреси, які треба вписати в зовнішні сервіси

| Де | Що вписати |
|---|---|
| Google Cloud → Credentials → OAuth client → Authorized redirect URIs | `https://ваш-домен/api/auth/google/callback` (і `http://localhost:3000/api/auth/google/callback` для розробки) |
| Google Cloud → OAuth consent screen | назва LotScope, support email `support@ваш-домен`, домен у Authorized domains |
| Vercel → Settings → Domains | `ваш-домен` і `www.ваш-домен` (www перенаправити на основний) |
| Resend → Domains | `send.ваш-домен` |

Після зміни домену оновіть `APP_URL` у Vercel і redirect URI в Google, інакше вхід через Google і посилання в листах вестимуть на стару адресу.

## 3. DNS

Записи додаються там, де керуються DNS домену: у реєстратора, у Vercel (якщо домен купили через Vercel або перевели на нього nameservers) або в Cloudflare. Точні значення беріть з панелей Vercel і Resend: вони показують їх для вашого проєкту.

| Тип | Ім'я | Значення | Для чого |
|---|---|---|---|
| A | `@` | IP, який показує Vercel (зазвичай `76.76.21.21`) | сайт |
| CNAME | `www` | значення з Vercel (`cname.vercel-dns.com` або індивідуальне) | сайт на www |
| MX | `send` | `feedback-smtp.[регіон].amazonses.com`, пріоритет 10 (з Resend) | повернення листів Resend |
| TXT | `send` | `v=spf1 include:amazonses.com ~all` (з Resend) | SPF: Resend має право слати від домену |
| TXT | `resend._domainkey` | ключ DKIM з Resend | підпис листів |
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:admin@ваш-домен` | політика DMARC, її вимагають Gmail і Yahoo |
| MX | `@` | записи сервісу переадресації або пошти | вхідна пошта для `admin@` і `support@` |

Порядок:

1. Пошта йде з піддомену `send.`, тому SPF і MX Resend не конфліктують з поштою основного домену.
2. DMARC почніть з `p=none`. Через 2–4 тижні, коли у звітах немає чужих відправників, змініть на `p=quarantine`.
3. Для вхідної пошти без Workspace підійде переадресація реєстратора або Cloudflare Email Routing (додає свої MX автоматично). Коли перейдете на Google Workspace, замініть MX на записи Google і додайте Google до SPF основного домену. Код міняти не треба.
4. Якщо переносите DNS на Cloudflare, записи для Vercel ставте в режимі DNS only (сіра хмарка), інакше можливі проблеми з SSL-сертифікатом.
5. CAA-записи не додавайте без потреби. Якщо додаєте, дозвольте `letsencrypt.org`, бо через нього Vercel видає сертифікат.

## 4. Захист Supabase

Застосунок звертається до бази лише зі свого сервера через `DATABASE_URL`. Бібліотека Supabase в браузері не використовується, тому публічний API Supabase не потрібен.

1. **Підключення.** У `DATABASE_URL` використовуйте Shared pooler у режимі Transaction (порт 6543). Його Supabase радить для serverless-функцій, як на Vercel. Прямий рядок `db.[ref].supabase.co:5432` працює лише через IPv6 і для Vercel не підходить.
2. **SSL.** Database → Settings → SSL Configuration: увімкніть «Enforce SSL on incoming connections». Застосування перезапускає базу на кілька секунд або хвилин, тож робіть це не в робочий час.
3. **Перевірка сертифіката.** Там само завантажте CA-сертифікат (`prod-ca-….crt`). Вставте його вміст (від `-----BEGIN CERTIFICATE-----` до `-----END CERTIFICATE-----`) у змінну `DATABASE_SSL_CA` у Vercel і зробіть Redeploy. Без неї з'єднання шифрується, але сертифікат сервера не перевіряється. Якщо після додавання змінної застосунок не може підключитись до бази, видаліть її і повідомте розробника: з'єднання знову працюватиме з шифруванням без перевірки.
4. **Data API.** Project Settings → Data API: вимкніть Enable Data API. Застосунку він не потрібен, а вимкнений API закриває доступ до таблиць через публічний ключ.
5. **RLS і права.** Міграція (`db/schema.sql`) сама вмикає Row Level Security на всіх таблицях і забирає права в ролей `anon` і `authenticated`. Застосунок працює від імені власника таблиць, тому RLS йому не заважає. Якщо колись підключите застосунок окремою роллю, вона має бути власником таблиць або мати `BYPASSRLS`.
6. **Пароль бази.** Згенерований, довгий, зберігається лише у змінних Vercel і менеджері паролів. Якщо він потрапив у чат, лист чи репозиторій, змініть його (Database → Settings → Reset password) і оновіть `DATABASE_URL`.
7. **Обмеження за IP** (Network restrictions) з Vercel не налаштувати: функції Vercel виходять з різних IP. Захист тримається на SSL, паролі й вимкненому Data API. Якщо у вашому тарифі Vercel є статичні IP, їх можна додати в Network restrictions.
8. **Окрема база для Preview.** Під час кожного білду Vercel запускає міграцію схеми. Для Preview задайте інший `DATABASE_URL` (окремий проєкт Supabase), щоб тестові деплої не працювали з даними клієнтів.
9. **Резервні копії і доступ.** Перевірте розклад резервних копій у Database → Backups. Для роботи з клієнтами потрібен платний тариф, бо безкоштовний проєкт може призупинятись при неактивності. Увімкніть 2FA і додайте другого власника організації.

## 5. Захист Vercel

1. Усі ключі лише в Environment Variables, позначені Sensitive. Для Production і Preview задайте окремі значення.
2. Settings → Deployment Protection: увімкніть Vercel Authentication для Preview, щоб тестові адреси не були відкритими.
3. Settings → Functions → Region: оберіть регіон, найближчий до регіону Supabase (наприклад Frankfurt для `eu-central-1`). Це суттєво пришвидшує запити до бази.
4. Аналіз фото триває до 120 секунд: потрібен увімкнений Fluid Compute або тариф Pro.
5. Увімкніть 2FA і додайте другого власника команди.
6. Застосунок сам додає захисні заголовки (`next.config.ts`): HTTPS-only (HSTS), заборону вбудовувати сайт у чужі сторінки, `nosniff`, обмежений Referrer. Також він закриває сайт від індексації пошуковиками (`robots.txt` і `X-Robots-Tag: noindex`), бо це закритий інструмент для клієнтів.

## 6. Перевірка після деплою

Відкрийте під своїм входом:

| Адреса | Очікується |
|---|---|
| `https://ваш-домен/api/analyze` | `configured: true`: ключ Claude підхоплено |
| `https://ваш-домен/api/lot` | `configured: true`: дані аукціонів підключено |
| `https://ваш-домен/api/history` | `enabled: false`, поки автоматична історія вимкнена; після увімкнення `auction` і `nmvtis` показують, які джерела працюють |

Далі перевірте вручну:

1. Сторінка входу показує кнопку Google, вхід через неї працює для профілю, який створив адмін.
2. «Забули пароль?» надсилає лист від `noreply@send.ваш-домен`, лист не потрапляє в спам, відповідь на нього йде на `MAIL_REPLY_TO`.
3. Аналіз з доданим PDF Carfax: у звіті в блоці «Історія за VIN» є посилання на файл, і він відкривається.
4. Якщо увімкнено `marketPriceAuto`: у формі після вибору марки, моделі й року з'являється ринкова ціна AUTO.RIA.
5. У Supabase → Advisors → Security немає попереджень про таблиці без RLS.

Технічні причини помилок користувач не бачить: вони пишуться в логи функцій Vercel (Project → Logs) з позначками `[db]`, `[autoria]`, `Resend` тощо.
