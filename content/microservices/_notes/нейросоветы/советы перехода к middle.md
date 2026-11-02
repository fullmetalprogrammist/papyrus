Твой roadmap:

**Сейчас:**

1. Alex Xu Vol.1
2. проектировать 1 систему в неделю
3. Building Microservices

**Через 2–3 месяца:**

4. DDIA



# Примеры

## Exercise 1: Notification system

Сделай:

"как работает уведомление о новом сообщении"

Разбей:

1. client sends message
2. API принимает
3. сохраняет
4. публикует event
5. consumer читает
6. определяет online/offline
7. websocket push / push notification
8. retry
9. deduplication

Тут ты сразу увидишь:

- где Kafka нужна
- где Redis нужен
- где PostgreSQL нужен

------

## Exercise 2: Feed system (очень мощный)

"лента постов"

Тут появляются:

- fanout-on-write vs fanout-on-read
- ranking
- caching
- pagination
- hot keys
- eventual consistency

Это один из лучших кейсов для роста.

------

## Exercise 3: Booking system

Например:

- бронь места
- конкурентные запросы
- idempotency
- locking
- payment saga

Это очень быстро учит real-world backend.

# Самая важная привычка

На каждый инструмент спрашивай:

не

> "как использовать Kafka?"

а

> "какую проблему в системе она решает?"

Например:

Kafka:

не "очередь"

а:

- decoupling
- buffering
- retry
- replay
- event sourcing
- fanout

Redis:

не "кэш"

а:

- latency shield
- hot data
- distributed lock
- counters
- rate limiting
- ephemeral state

Postgres:

не "база"

а:

- source of truth
- transactions
- constraints
- consistency boundary

Это сильно меняет мышление.





# Несколько небольших систем vs одна большая

Да — **на твоём этапе лучше много небольших систем**.

Не потому что “крупная система хуже”, а потому что большой продукт вроде интернет-магазина — это на самом деле **20 разных систем, склеенных вместе**.

Например у большого e-commerce есть:

- каталог товаров
- поиск
- корзина
- checkout
- payment orchestration
- inventory reservation
- recommendation engine
- order management
- notification pipeline
- fraud detection
- delivery tracking
- analytics pipeline

Если взять всё сразу, мозг обычно уходит в хаос:

> “так, тут Redis… тут Kafka… тут maybe Elasticsearch… а как это всё вообще течёт?”

И ты не учишься архитектуре. Ты просто тонешь в complexity.

------

Лучший путь — **изолировать архитектурные паттерны**.

Например:

------

## 1. Notification system (учит event-driven)

Тут учишь:

- producer/consumer
- retries
- dead letter queue
- idempotency
- push delivery
- online/offline state

Инструменты:

Apache Kafka + Redis + PostgreSQL

------

## 2. Chat system (учит realtime + ordering)

Тут:

- websocket lifecycle
- message ordering
- fanout
- unread counters
- presence

Очень сильный кейс.

------

## 3. Booking/inventory (учит consistency)

Один из лучших.

Тут:

- race conditions
- pessimistic/optimistic locking
- reservation timeout
- exactly-once illusion
- saga

Это core backend thinking.

------

## 4. Feed system (учит scale)

Тут:

- pagination
- caching
- precompute vs compute-on-read
- hot partitions
- ranking

Очень production-like.

------

## 5. Payment system (учит reliability)

Тут:

- idempotency keys
- retries
- compensating transactions
- webhook processing

Это супер practical.

------

И вот потом ты делаешь:

> **E-commerce = composition of already understood subsystems**

То есть:

- inventory ← ты уже делал booking
- notifications ← ты уже делал notification system
- checkout ← ты уже делал payment
- order feed ← ты уже делал feed

И внезапно “большая система” становится понятной.

------

Это как в строительстве:

Неправильный путь:

> сразу построить торговый центр

Правильный путь:

> сначала научиться строить:

- дверь
- стену
- крышу
- лестницу
- проводку

Потом торговый центр — это композиция.

------

Я бы дал тебе такую progression:

**Month 1**

- rate limiter
- notification
- file upload service

**Month 2**

- chat
- booking
- payment

**Month 3**

- feed
- search
- analytics pipeline

**Month 4**

- e-commerce целиком

Вот это очень сильный маршрут до middle.

И важный момент:

Для каждой системы обязательно отвечай письменно:

1. где source of truth?
2. где state?
3. где consistency critical?
4. где можно eventual consistency?
5. где bottleneck?
6. где cache?
7. где async?
8. где failure modes?

Вот эти 8 вопросов дают очень быстрый рост.







Короткий честный ответ: **нет, этого недостаточно, чтобы “закрыть всё про Kafka и Redis в проде”** — но не потому что пример плохой, а потому что проблема в другом.

------

# Почему notification system НЕ может покрыть “всё про Kafka и Redis”

Даже если ты сделаешь его идеально, ты увидишь только **один класс проблем**:

## 1. Event-driven + delivery pipeline

Ты научишься:

- producer / consumer
- async processing
- basic retries
- DLQ
- fanout уведомлений

👉 это реально важная часть Kafka

------

## Но ты НЕ увидишь в этом кейсе:

### 1. Очень большие топики / partitioning стратегии

- hot partitions
- key design
- rebalancing в больших кластерах

------

### 2. Exactly-once / transactional semantics в сложных цепочках

- Kafka transactions
- outbox pattern в связке с DB

------

### 3. Stream processing как система

- windowing
- aggregations
- stateful consumers

------

### 4. Multi-team / multi-service Kafka usage

- разные продюсеры
- разные контракты событий
- schema evolution (Avro/Protobuf)

------

### 5. Failure modes “на масштабе”

- брокер частично умер
- lag растёт неделями
- consumer stuck
- poison messages в потоке

------

## Redis аналогично

Ты увидишь:

- cache presence
- online/offline state
- maybe rate limiting

Но НЕ увидишь:

- cache invalidation в сложных графах данных
- distributed locks edge cases
- memory eviction pressure в проде
- multi-region consistency

------

# Главная идея (очень важная)

> Один проект не может покрыть всю технологию.

И это нормально.

------

# Тогда зачем вообще notification system?

Потому что он даёт тебе:

## ✔ 1. “скелет мышления”

Ты понимаешь:

> backend = поток данных + точки хранения + асинхронные узлы

------

## ✔ 2. базовые роли систем

- DB = truth
- Kafka = movement
- Redis = speed/state shortcut

------

## ✔ 3. фундамент, на который ложатся остальные системы

------

# Как реально устроено обучение Kafka/Redis в проде

Это важно:

## Ты не учишь Kafka “целиком”

Ты учишь её через разные “нагрузки мышления”:

------

# 1. Notification system

👉 async + delivery

------

# 2. Event sourcing / audit log system

👉 immutability + replay

------

# 3. Analytics pipeline

👉 aggregation + stream processing

------

# 4. Recommendation/feed system

👉 fanout + scale + caching pressure

------

# 5. Payment / order system

👉 consistency + exactly-once illusions

------

## И только после 4–5 таких систем

Kafka начинает “собираться в голове” полностью.

------

# То же самое с Redis

------

## 1. cache-aside pattern (simple)

------

## 2. rate limiter

------

## 3. session store

------

## 4. distributed locks (carefully)

------

## 5. real-time presence / counters

------

# Важная мысль

Ты сейчас ищешь:

> “один проект, который даст мне всё”

Но в system design такого нет.

Это как пытаться:

> выучить всю физику через один эксперимент

------

# Правильная модель (очень важная)

## Kafka = не “вещь”

## Redis = не “вещь”

Это:

> разные способы движения и хранения состояния в разных типах систем

------

# Поэтому честный ответ:

### ❌ Notification system НЕ покрывает Kafka/Redis полностью

------

### ✔ Но он даёт 30–40% базового мышления

------

### ✔ Остальные 60–70% добираются другими кейсами

------

# И вот ключевая развилка для тебя

Если ты сделаешь:

### ❌ 1 огромный проект (e-commerce)

→ ты получишь кашу

------

### ✔ 5–7 маленьких систем

→ ты получишь карту паттернов

------

# Если очень упростить

## 1 система = 1 “угол зрения”

- chat → realtime + ordering
- notification → async delivery
- booking → consistency
- feed → scale + caching
- payment → reliability

------

# Итог

Notification system — это:

> не “вся Kafka и Redis”
> а “один важный слой реальности”

------

Если хочешь, я могу дальше сделать тебе очень практичную вещь:

👉 разложить **Kafka/Redis “по уровням mastery”**
и сказать:

- что ты должен понимать на junior
- что на middle
- что на senior

и какие системы дают каждый уровень.

Это обычно резко снимает путаницу “что мне вообще учить дальше”.