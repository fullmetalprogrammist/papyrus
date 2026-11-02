Цель:

> **пройти разные pressure scenarios, в которых Kafka раскрывает разные роли**

У меня есть **progression из 6 проектов**.

------



# Промпт для объяснения проектов

Я изучаю backend architecture и хочу учиться через реализацию проектов.

В этом сообщении я описываю, что ты должен сделать. Во втором сообщении я скину описание проекта.

Твоя задача — выступить как senior backend engineer и полностью объяснить мне систему так, чтобы после объяснения я мог начать писать её сам.

Что нужно сделать:

**1. Объясни общую схему работы системы**

- как проходит полный lifecycle запроса/события;
- что происходит от начала до конца;
- какие компоненты участвуют;
- как между ними двигаются данные.

Объясняй по шагам, как будто трассируешь один реальный запрос через систему.

------

**2. Объясни архитектурную роль каждой технологии**

Для каждой технологии:

- какую роль она играет именно в этой системе;
- почему именно она подходит;
- какую проблему решает;
- почему эта проблема вообще возникает;
- что произойдёт, если убрать эту технологию.

------

**3. Объясни каждую указанную role**

Если у технологии указаны roles (например у Kafka: buffering, retry, fanout и т.д.), для каждой:

- объясни простыми словами, что это значит именно в контексте этой системы;
- покажи, где в flow это используется;
- какую проблему это решает;
- как это влияет на систему.

Не пропускай ни одной role.

------

**4. Объясни внутреннюю логику выбора**

Я хочу понять мышление архитектора.

Поэтому для каждого решения объясняй:

- почему это placed именно здесь;
- почему не раньше;
- почему не позже;
- почему не через другую технологию.

------

**5. Покажи hidden production problems**

Объясни:

- где система может ломаться;
- где возможны потери данных;
- где возможны дубликаты;
- где возможны race conditions;
- где могут быть bottlenecks.

Даже если я ещё не знаю эти термины — всё равно объясняй.

------

**6. Объясняй постепенно**

Не перепрыгивай в advanced topics, пока не объяснил базовый flow.

Сначала:

- что происходит;
- потом зачем это нужно;
- потом какие проблемы это решает.

------

**7. Не давай код**

Мне сейчас важно понять систему, а не копировать реализацию.

Цель:

после твоего объяснения я должен понимать:

- как эта система устроена;
- зачем здесь каждая технология;
- где их место в архитектуре;
- какую проблему решает каждая часть.

# Project 1 — Notification Delivery Pipeline

## Что строишь

Сервис отправки уведомлений:

- in-app
- email
- push

------

## Technologies

- Apache Kafka
- PostgreSQL
- Redis

------

## Roles

### Kafka

- async delivery
- decoupling
- buffering
- retry
- dead-letter queue
- fanout

------

### PostgreSQL

- source of truth
- notification history
- delivery status
- audit log

------

### Redis

- online/offline state
- deduplication keys
- rate limiting
- temporary delivery locks

------

## What Kafka teaches

- producers
- consumers
- consumer groups
- retries
- DLQ
- lag basics

------

## Самодеятельность

Есть компания AZOT, которая занимается тремя видами деятельности:

- Банкинг
- Маркетплейс
- Социальная сеть

Каждый сервис генерирует события, например:

- Банкинг - на счет зачислены деньги, карта заблокирована и т.д.
- Маркетплейс - заказ доставлен в пункт выдачи, возврат одобрен и т.д.
- Социальная сеть - новая заявка в друзья, новое сообщение и т.д.

Пользователи этих сервисов хотят получать уведомления разными способами. Кто-то только по смс, кто-то только в приложении, кто-то по почте и смс и т.д.

Строим систему, которая будет это реализовывать.



# Project 2 — Chat Message Pipeline

## Что строишь

Realtime chat:

- direct messages
- group chat
- message history

------

## Technologies

- Apache Kafka
- PostgreSQL
- Redis
- WebSocket

------

## Roles

### Kafka

- message fanout
- ordered delivery
- partition-by-chat
- replay message streams
- async side effects

------

### PostgreSQL

- message persistence
- chat metadata
- unread tracking

------

### Redis

- presence
- websocket session registry
- hot unread counters

------

## What Kafka teaches

- partition keys
- ordering guarantees
- rebalancing effects
- hot partition problems

------

------

# Project 3 — Analytics Event Pipeline

## Что строишь

User activity stream:

- page views
- clicks
- purchases
- sessions

------

## Technologies

- Apache Kafka
- PostgreSQL
- Redis

------

## Roles

### Kafka

- event ingestion
- buffering bursts
- replay analytics
- multiple consumers
- event retention

------

### PostgreSQL

- aggregated reports
- raw event snapshots
- business queries

------

### Redis

- real-time counters
- active session state
- rolling windows

------

## What Kafka teaches

- high-throughput ingestion
- multiple consumers on same topic
- replaying old events
- retention strategy

------

------

# Project 4 — Order Processing Pipeline

## Что строишь

Order lifecycle:

- created
- paid
- packed
- shipped
- delivered

------

## Technologies

- Apache Kafka
- PostgreSQL
- Redis

------

## Roles

### Kafka

- event choreography
- decoupled workflow
- retry downstream services
- replay failed workflows

------

### PostgreSQL

- order state machine
- inventory state
- payment state

------

### Redis

- idempotency keys
- temporary reservations
- fast order lookup

------

## What Kafka teaches

- event-driven workflows
- eventual consistency
- out-of-order event handling
- duplicate event handling

------

------

# Project 5 — Feed Fanout System

## Что строишь

Social feed:

- create post
- distribute to followers
- read feed

------

## Technologies

- Apache Kafka
- PostgreSQL
- Redis

------

## Roles

### Kafka

- fanout-on-write
- distribute to many consumers
- backpressure handling
- replay missed fanouts

------

### PostgreSQL

- post persistence
- follower graph
- feed metadata

------

### Redis

- hot feed cache
- pagination cursors
- ranking cache

------

## What Kafka teaches

- fanout at scale
- throughput pressure
- consumer lag under spikes
- partition balancing

------

------

# Project 6 — Audit Log / Event Sourcing System

## Что строишь

Immutable business event log:

- user changes
- order changes
- payment changes

------

## Technologies

- Apache Kafka
- PostgreSQL
- Redis

------

## Roles

### Kafka

- append-only log
- replay state
- rebuild projections
- event sourcing backbone

------

### PostgreSQL

- materialized projections
- snapshots
- read models

------

### Redis

- hot projections
- recent aggregates
- transient read acceleration

------

## What Kafka teaches

- replay as first-class concept
- immutable logs
- projection rebuilding
- schema evolution pressure

------

# Recommended order

1. Notification
2. Chat
3. Analytics
4. Orders
5. Feed
6. Event sourcing

------

# Coverage map

After all 6:

### Kafka mastery:

You will touch:

- producers
- consumers
- consumer groups
- partitions
- keys
- ordering
- retries
- DLQ
- lag
- replay
- fanout
- retention
- backpressure
- duplicate delivery
- event choreography
- event sourcing
- hot partitions
- reprocessing

Это уже очень близко к тому, что реально ждут в больших компаниях. Не “всё про Kafka”, но уже **уверенный production-grade middle foundation**.