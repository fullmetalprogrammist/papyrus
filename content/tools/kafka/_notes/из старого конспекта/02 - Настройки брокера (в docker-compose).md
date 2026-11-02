# Пример docker-compose

Здесь в итоге размещу готовый рабочий конфиг, а внизу пойдет объяснение, что к чему:

```yaml
version: '2'

services:

# ========================= ZooKeeper section ========================= #

  # ========== Zookeper A ========== #

  zookeeper-1:
  
    image: confluentinc/cp-zookeeper:latest
    
    container_name: my-zookeeper-1
    
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      
    ports:
      - 22181:2181

  # ========== Zookeper B ========== #      
      
  zookeeper-2:
  
    image: confluentinc/cp-zookeeper:latest
    
    container_name: my-zookeeper-2
    
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000
      
    ports:
      - 22182:2181

# ========================= Kafka section ========================= #

  # ========== Broker A ========== #

  broker-1:
  
    image: confluentinc/cp-kafka:latest
    
    container_name: my-broker-1
    
    depends_on:
      - zookeeper-1
      - zookeeper-2
      
    ports:
      - 49092:49092
    
    environment:
    
#      KAFKA_BROKER_ID: 1  # Не обязательно, если не задан, то автогенерация
      
      KAFKA_ZOOKEEPER_CONNECT: zookeeper-1:2181,zookeeper-2:2181
      
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT,OUTSIDE:PLAINTEXT
      
      KAFKA_LISTENERS: INSIDE://broker-1:9092,OUTSIDE://broker-1:49092
      
      KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-1:9092,OUTSIDE://localhost:49092
      
      KAFKA_INTER_BROKER_LISTENER_NAME: INSIDE
      
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"


  # ========== Broker B ========== #

  broker-2:
  
    image: confluentinc/cp-kafka:latest
    
    container_name: my-broker-2
    
    depends_on:
      - zookeeper-1
      - zookeeper-2
      
    ports:
      - 49093:49092
    
    environment:
    
#      KAFKA_BROKER_ID: 2  # Не обязательно, если не задан, то автогенерация
      
      KAFKA_ZOOKEEPER_CONNECT: zookeeper-1:2181,zookeeper-2:2181
      
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT,OUTSIDE:PLAINTEXT
      
      KAFKA_LISTENERS: INSIDE://broker-2:9092,OUTSIDE://broker-2:49092
      
      KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-2:9092,OUTSIDE://localhost:49093
      
      KAFKA_INTER_BROKER_LISTENER_NAME: INSIDE
      
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"
```

В настройках вроде KAFKA_ZOOKEEPER_CONNECT, KAFKA_LISTENERS и прочих, поддерживающих несколько значений, лучше не использовать пробел после запятой. Для KAFKA_LISTENERS например пробелы не вызывают проблем, а вот из-за пробела в KAFKA_ZOOKEEPER_CONNECT была ошибка.

# Listeners, "слухачи"

Многие основные параметры кафки связаны с так называемыми `listener` ("слухач"). Listener - это, грубо говоря, "интерфейс" через который клиенты (поставщики и потребители, Pro и Con, а также другие брокеры) могут связаться с брокером. Такой интерфейс определяется комбинацией:

````
протокол безопасности + ip + порт
````

У слухача есть имя. По умолчанию за имя берется название протокола, но можно сделать алиасы (об этом дальше). Имя и порт должны быть уникальными по отдельности, т.е. уникальной должна быть не комбинация имя + порт, а конкретно и имя, и порт.

Протоколы безопасности для кафки:

* PLAINTEXT - данные передаются в незашифрованном виде и для подключения не требуется аутентификация
* SSL - сообщения зашифрованы и требуется аутентификация
* Возможно, еще какие-то

## Слухачи и доступ к брокерам

К одному и тому же брокеру доступ может осуществляться из разных мест. Допустим, из той же сети и из внешней. Внутри сети, например, брокеры кластера будут общаться друг с другом, а из внешних сетей будут подключаться Pro и Con. И например внутри сети нет необходимости шифровать данные, а при доступе извне - нужно. Значит, нужны разные протоколы для разных случаев.

Чтобы это реализовать, можно для каждого брокера описать несколько слухачей - один слухач будет например использовать протокол PLAINTEXT и порт 42030, а другой - SSL и порт 42031.

В случае с докером это тоже актуально: докер использует свою собственную виртуальную сеть, поэтому реализация доступа к брокеру внутри этой сети и извне (т.е. например с компьютера, где докер работает, "хоста") - тоже делается через объявление нескольких слухачей.

# Параметры

[Полный список параметров брокера кафки](https://kafka.apache.org/documentation/#brokerconfigs)

## Преобразование параметров

У кафки, работающей "не в докере", эти параметры задаются в файле `kafka.properties`. В случае использования в докере образа кафки от confluent, аналогичные настройки можно использовать в docker-compose. Правила преобразования оригинальных имен параметров в "докеро-конфлюентские":

* Все буквы пишутся капсом
* Параметр предваряется префиксом KAFKA
* Точки `.` заменяются на подчеркивание _
* Тире `-` заменяются на два подчеркивания __
* Подчеркивание `_` заменяется на три подчеркивания ___

Например, в оригинале параметр выглядит как `inter.broker.listener.name`, значит в docker-compose его надо писать так `KAFKA_INTER_BROKER_LISTENER_NAME`. Я буду писать оригинальные имена.

## Параметры брокера

### Идентификатор

Влючает несколько взаимосвязанных настроек:

* `broker.id` - идентификатор брокера. Если не задан, генерируется автоматически.
* `broker.id.generation.enable` - разрешить автоматическую генерацию id для брокеров. По умолчанию "true" 
* `reserved.broker.max.id` - число, от которого начинается генерация id брокеров путем увеличения на единицу. По умолчанию 1000. Значит, первый авто-id будет 1001, второй - 1002 и т.д.

## Параметры слухача

Предварительно нужно прочитать раздел про слухачей, чтобы понимать их формат и назначение в целом.

### Объявление слухачей

> Попытался написать на всякий случай как можно подробнее. Возможно получилось слишком перегружено и от этого только хуже. Время покажет.

Настройки взаимосвязаны и важно уяснить суть этих связей. Понять эти параметры можно только в совокупности, а не по отдельности.

* `listener.security.protocol.map` - эта настройка задает алиасы для названий протоколов. Зачем это нужно? По умолчанию имя слухача создается по имени протокола, которым будет пользоваться слухач. Имя слухача обязано быть уникальным, как и порт. Поэтому, если мы хотим объявить два слухача и каждый из них должен использовать PLAINTEXT-протокол, то получится, что обоим слухачам присвоится имя PLAINTEXT и уникальности не будет. Алиасы решают эту проблему, например:

  ```
  KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT, OUTSIDE:PLAINTEXT
  KAFKA_LISTENERS: INSIDE://broker-1:9092, OUTSIDE://broker-1:49092
  ```

  Создаем два алиаса - INSIDE и OUTSIDE для протокола PLAINTEXT и используем их в последующем объявлении слухачей. Они получают соответствующие имена и уникальность соблюдена.

  Кроме того, алиасы можно использовать не только для уникальности, но и для большей наглядности предназначения слухача. Например, если бы мы использовали разные протоколы, могли бы просто написать вот так:

  ```
  KAFKA_LISTENERS: PLAINTEXT://broker-1:9092, SSL://broker-1:49092
  ```

  Но алиасами можно показать более наглядно, что один слухач используется для общения "внутреннего" (INSIDE), например внутри сети докера, а второй слухач - для общения со "внешним миром", например с хостом, на котором работает докер или в случае сложных сетей - с какой-нибудь внешней по отношению к сети предприятия сетью.

* `listeners` - объявление всех слухачей, которые кафка создаст для конкретного брокера. Формат - "протокол(или алиас) + ip + порт". Здесь важно понимать, что ip - это именно ip машины, где работает данный брокер. Поэтому неудивительно, что и порт у каждого объявленного слухача обязан быть уникальным, поскольку все они на одной машине и два слухача не могут делить один порт.

* `advertised.listeners` - это описание того, *как* можно достучаться до слухачей, объявленных в параметре listeners.

  Очень тонкий лёд, на котором можно провалиться и утонуть в бездне непонимания, поэтому лучше разобрать на конкретном фрагменте настроек:

  ```yaml
  broker-1:
    ports:
      - 49092:49092
    environment:
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT, OUTSIDE:PLAINTEXT
      KAFKA_LISTENERS: INSIDE://broker-1:9092, OUTSIDE://broker-1:49092
      KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-1:9092, OUTSIDE://localhost:49092
      KAFKA_INTER_BROKER_LISTENER_NAME: INSIDE
      
  broker-2:
    ports:
      - 49093:49092
    environment:
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT, OUTSIDE:PLAINTEXT
      KAFKA_LISTENERS: INSIDE://broker-2:9092, OUTSIDE://broker-2:49092
      KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-2:9092, OUTSIDE://localhost:49093
      KAFKA_INTER_BROKER_LISTENER_NAME: INSIDE
  ```

  Это два брокера в докере, а клиенты - на хосте. Пример клиента - не только Pro и Con, но и например приложение Offset Explorer для gui работы с кластером.

  Как видно, у каждого брокера - по два слухача. Один - для доступа из собственной сети докера (INSIDE), а второй - для возможности соединения с хоста (OUTSIDE). Оба слухача в параметре listeners объявляются с внутренними докерскими ip:

  ```
  KAFKA_LISTENERS:
  br.1) INSIDE://broker-1:9092, OUTSIDE://broker-1:49092
  br.2) INSIDE://broker-2:9092, OUTSIDE://broker-2:49092
  ```

  > Здесь имена сервисов broker-1 и broker-2 в слухачах докер сам преобразует в нужные ip, которые он назначил этим сервисам автоматически

  Однако в advertised.listeners мы видим следующее:

  ```
  KAFKA_ADVERTISED_LISTENERS:
  br.1) KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-1:9092, OUTSIDE://localhost:49092
  br.2) KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-2:9092, OUTSIDE://localhost:49093
  ```

  У OUTSIDE почему-то указан какой-то localhost (хотя в докере нет понятия localhost), а во втором слухаче второго брокера к тому же и порт не такой какой был у него же в параметре listeners. В чем дело?

  А дело как раз в том, что к брокерам могут стучаться из разных мест. В данном случае предполагается, что из двух: из самой сети докера (т.к. брокеры общаются друг с другом тоже), и с хоста, где работает докер. В более сложных случаях дополнительно могут стучаться еще и из других сетей и т.д. И параметр advertised.listeners нужен как раз для того, чтобы каждый заинтересованный получил именно того слухача, который для него предназначается.

  Конкретно на этом примере с докером все выглядит так (рассмотрим broker-2, он более наглядный):

  1. Клиент (пусть Offset Explorer) сперва должен выполнить первичное подключение к брокеру, чтобы вытянуть себе информацию о всем кластере (в базовом конспекте по кафке в разделе "Метаданные" я об этом писал).
  2. Для этого мы должны указать ему адрес хотя бы одного брокера из кластера. Пусть - второго.
  3. Но подключение "к брокеру" фактически означает подключение к одному из слухачей этого брокера.
  4. У второго брокера есть два слухача, один работает на на порту 9092, а второй - на порту 49092 (KAFKA_LISTENERS: INSIDE://broker-2:9092, OUTSIDE://broker-2:49092)
  5. Судя по именам, мы решили, что слухач-9092 будет предназначаться для работы внутри самого докера, а слухач-49092 - для "внешних" клиентов.
  6. Поэтому мы сделали проброс именно до порта 49092, а не до 9092 - `49093:49092`. Теперь порт 49093 *хоста* (машины, где работает докер) связан с портом 49092 внутри докера, причем конкретно с портом сервиса broker-2. Хоть у сервиса broker-1 тоже есть порт 49092, но он тут не при чем - он связан с хостовым портом 49092, т.к. у него проброс выполнен вот так - `49092:49092`.
  7. Соответственно, когда клиент на хосте обращается на localhost:49093 он, за счет проброса портов, попадает на слухача `OUTSIDE://broker-2:49092`
  8. Клиент, успешно достучавшись до одного слухача, получает информацию обо всем кластере, т.е. автоматом узнает и о broker-1.
  9. Аналогичным образом попасть на `INSIDE://broker-2:9092` клиент с хоста не сможет, потому что "broker-2" для него ничего не значит, т.к. это внутренний идентификатор сервиса в докере и только для докера он имеет смысл.

  В более сложных сценариях все возможно будет хитрее, но суть сводится к одному: listeners - это сами слухачи, а advertised.listeners - это способы достучаться до них. Поэтому в a.l порты могут повторяться, т.к. здесь уже идет фактически не объявление слухачей, а просто наборы uri для клиентов из разных мест.

* `inter.broker.listener.name` - здесь указываем, какой слухач используется для связи брокеров друг с другом.

# Дополнительные заметки (черновик)

#### Протоколы и имена слухачей

В одном и том же брокере можно использовать одинаковый протокол на нескольких портах, если указать в KAFKA_LISTENER_SECURITY_PROTOCOL_MAP разные имена для этого протокола:

```
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT, OUTSIDE:PLAINTEXT, TST:PLAINTEXT    
KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-1:9092, OUTSIDE://localhost:49772, TST://localhost:49774
KAFKA_INTER_BROKER_LISTENER_NAME: INSIDE
```

Если же "алиасы" не указывать, т.е. написать имя протокола непосредственно, вот так:

```
KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://broker-1:9092, PLAINTEXT://localhost:49772, PLAINTEXT://localhost:49774
KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
```

то будет ошибка

> requirement failed: Each listener must have a different name, listeners: PLAINTEXT://0.0.0.0:9092, PLAINTEXT://0.0.0.0:49772, PLAINTEXT://0.0.0.0:49774

То есть, хоть порты и разные (и вероятно даже если бы ip были тоже разные), но в качестве имени используется имя протокола, что и приводит к ошибке.

#### Явный ip и по имени сервиса

Поскольку в докере можно самому объявить сеть и настроить ip для каждого сервиса вручную, я проверил, как реагирует брокер это:

```yaml
networks:
  servicesubnet:
    driver: bridge
    ipam:
      driver: default
      config:
        - subnet: "172.16.238.0/24"

services:

zookeeper:
  image: confluentinc/cp-zookeeper:latest
  container_name: my-zookeeper
  environment:
    ZOOKEEPER_CLIENT_PORT: 2181
    ZOOKEEPER_TICK_TIME: 2000
  ports:
    - 22181:2181
  networks:
    servicesubnet:
      ipv4_address: "172.16.238.13"  // <-- Явно задал адрес зукипера

broker-1:
  image: confluentinc/cp-kafka:latest
  container_name: my-kafka-1
  depends_on:
    - zookeeper
  networks:
    servicesubnet:
      ipv4_address: "172.16.238.14"  // <-- Явно задал адрес брокера
  ports:
    - 49772:49772
  environment:
      KAFKA_ZOOKEEPER_CONNECT: 172.16.238.13:2181  // <-- Норм
..
      KAFKA_ADVERTISED_LISTENERS: OUTSIDE://localhost:49772, INSIDE://172.16.238.14:9092  // <-- Норм
```



```
// Явный ip
KAFKA_ADVERTISED_LISTENERS: INSIDE://172.16.238.14:9092, OUTSIDE://localhost:49772
my-kafka-1   | [2023-02-14 09:37:01,604] INFO [BrokerToControllerChannelManager broker=1 name=forwarding]: Recorded new controller, from now on will use node 172.16.238.14:9092 (id: 1 rack: null) (kafka.server.BrokerToControllerRequestThread)

// Вместо ip - имя сервиса
KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-1:9092, OUTSIDE://localhost:49772
my-kafka-1   | [2023-02-14 09:38:52,232] INFO [BrokerToControllerChannelManager broker=1 name=forwarding]: Recorded new controller, from now on will use node broker-1:9092 (id: 1 rack: null) (kafka.server.BrokerToControllerRequestThread)

// Вместо ip - нет ничего
KAFKA_ADVERTISED_LISTENERS: INSIDE://:9092, OUTSIDE://localhost:49772
my-kafka-1   | [2023-02-14 09:39:35,161] INFO [BrokerToControllerChannelManager broker=1 name=alterPartition]: Recorded new controller, from now on will use node c47fb422f7e6:9092 (id: 1 rack: null) (kafka.server.BrokerToControllerRequestThread)
```

#### Допустимые имена слухачей

Мне было не понятно, чего стоит имя слухача, если это только протокол? Как по нему ориентироваться? И вот такой конфиг

```
KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: INSIDE:PLAINTEXT, OUTSIDE:PLAINTEXT, MIDSIDE:PLAINTEXT
KAFKA_ADVERTISED_LISTENERS: INSIDE://broker-1:9092, OUTSIDE://localhost:49772
KAFKA_INTER_BROKER_LISTENER_NAME: MIDSIDE
```

Дал такую ошибку:

> my-kafka-1   | java.lang.IllegalArgumentException: requirement failed: inter.broker.listener.name must be a listener name defined in advertised.listeners. The valid options based on currently configured listeners are INSIDE,OUTSIDE

Из этого я сделал вывод, что само "имя" конечно ничего не значит. Важна комбинация - когда имя используется в advertised.listeners (или возможно в listeners) в комбинации с ip и портом, то мы можем указывать это имя в inter.broker.listener.name, т.к. с ним уже как бы связан ip и порт и тогда все понятно.
