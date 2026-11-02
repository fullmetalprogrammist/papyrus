# Roadmap: изучение `Optional` в Java (только 20% знаний для 90% случаев)

Цель: уметь **читать, писать и поддерживать современный Java-код**, где используется `Optional`. Не изучаем редкие API, внутренности реализации и спорные паттерны.

------

## Этап 0. Понять зачем существует `Optional` (30 минут)

### Проблема, которую он решает

До Java 8:

```java
String name = user.getName();

if (name != null) {
    System.out.println(name.length());
}
```

Проблема:

- `null` может появиться где угодно;
- легко получить `NullPointerException`;
- код заполнен проверками.

`Optional<T>` — это контейнер, который говорит:

> "Значение может быть, а может отсутствовать".

Пример:

```java
Optional<String> name = user.getName();
```

Теперь отсутствие значения — это часть модели данных.

------

# Этап 1. Создание Optional (обязательно знать)

## 1. `Optional.of()`

Когда значение **точно не null**:

```java
Optional<String> name = Optional.of("Alex");
```

Если передать `null`:

```java
Optional.of(null); // NullPointerException
```

Использовать часто.

------

## 2. `Optional.ofNullable()` ⭐ главный метод

Когда значение может быть `null`:

```java
Optional<String> name = Optional.ofNullable(user.getName());
```

90% случаев создания Optional — это он.

------

## 3. `Optional.empty()`

Пустой Optional:

```java
Optional<String> name = Optional.empty();
```

------

# Этап 2. Проверка наличия значения

## Старый стиль (знать, но не писать)

```java
if (optional.isPresent()) {
    System.out.println(optional.get());
}
```

Работает, но обычно считается плохим стилем.

------

## Современный стиль

### `ifPresent()`

Выполнить действие, если значение есть:

```java
optional.ifPresent(name -> {
    System.out.println(name);
});
```

Чаще:

```java
optional.ifPresent(System.out::println);
```

Используется постоянно.

------

# Этап 3. Получение значения (самое важное)

## 1. `orElse()` ⭐

Значение по умолчанию:

```java
String name = optional.orElse("Unknown");
```

Если Optional пустой:

```
"Unknown"
```

Используется очень часто.

------

## 2. `orElseGet()` ⭐

Ленивое создание значения:

```java
String name = optional.orElseGet(() -> createDefaultName());
```

Разница:

```java
optional.orElse(expensiveMethod());
```

`expensiveMethod()` выполнится всегда.

А:

```java
optional.orElseGet(() -> expensiveMethod());
```

только если значения нет.

Практическое правило:

- простое значение → `orElse`
- вычисление/метод → `orElseGet`

------

## 3. `orElseThrow()` ⭐

Когда отсутствие значения — ошибка:

```java
User user = optional.orElseThrow();
```

Или:

```java
User user = optional.orElseThrow(
    () -> new UserNotFoundException()
);
```

Очень часто в сервисном коде.

------

# Этап 4. Преобразование Optional (самая важная часть)

Это главный навык.

------

## 1. `map()` ⭐⭐⭐

Изменить значение внутри Optional.

Было:

```java
Optional<User> user;
```

Получить имя:

```java
Optional<String> name =
        user.map(User::getName);
```

Аналог:

```java
if (user != null) {
    return user.getName();
}
return null;
```

`map()` используется постоянно.

------

## 2. `flatMap()` ⭐⭐

Когда метод уже возвращает Optional.

Например:

```java
Optional<User> user;

Optional<Address> address =
        user.flatMap(User::getAddress);
```

Если:

```java
User::getAddress
```

возвращает:

```java
Optional<Address>
```

нельзя использовать `map()`:

```java
user.map(User::getAddress);
```

получится:

```java
Optional<Optional<Address>>
```

`flatMap()` "разворачивает" вложенность.

------

# Этап 5. Цепочки Optional (главный паттерн)

Вот это нужно уметь читать:

```java
String city =
    userRepository.findById(id)
        .map(User::getAddress)
        .map(Address::getCity)
        .orElse("Unknown");
```

Что происходит:

1. нашли пользователя;
2. получили адрес;
3. получили город;
4. если чего-то нет → `"Unknown"`.

Это типичный production-код.

------

# Этап 6. Optional в Spring / backend (если работаешь с Java backend)

Чаще всего встретишь:

## Репозитории

Например:

```java
Optional<User> findById(Long id);
```

Использование:

```java
User user = repository.findById(id)
        .orElseThrow(() -> new UserNotFoundException());
```

------

## Сервисы

Хорошо:

```java
public User getUser(Long id) {
    return repository.findById(id)
            .orElseThrow();
}
```

Плохо:

```java
public Optional<User> getUser(Long id) {
    return repository.findById(id);
}
```

везде наружу таскать Optional.

------

# Этап 7. Где Optional НЕ надо использовать

Это важнее, чем знать методы.

## ❌ Поля класса

Плохо:

```java
class User {
    private Optional<String> name;
}
```

Обычно лучше:

```java
private String name;
```

------

## ❌ Параметры методов

Плохо:

```java
void sendEmail(Optional<String> email)
```

Лучше:

```java
void sendEmail(String email)
```

или:

```java
void sendEmail(String email)
```

с обработкой `null`.

------

## ❌ Коллекции

Плохо:

```java
Optional<List<User>>
```

Лучше:

```java
List<User>
```

Пустой список уже означает отсутствие элементов:

```java
[]
```

------

# Что можно НЕ учить пока

Не трать время на:

- `OptionalInt`
- `OptionalLong`
- `OptionalDouble`
- `filter()` (полезно, но не обязательно в начале)
- `stream()` + Optional сложные комбинации
- сериализацию Optional
- внутреннюю реализацию Optional
- кастомные Optional-паттерны
- использование Optional везде вместо null

------

# Минимальный набор методов для 90% случаев

Запомнить:

| Метод           | Частота | Назначение             |
| --------------- | ------- | ---------------------- |
| `ofNullable()`  | ⭐⭐⭐⭐⭐   | создать Optional       |
| `map()`         | ⭐⭐⭐⭐⭐   | преобразовать значение |
| `flatMap()`     | ⭐⭐⭐⭐    | цепочка Optional       |
| `orElse()`      | ⭐⭐⭐⭐⭐   | значение по умолчанию  |
| `orElseThrow()` | ⭐⭐⭐⭐⭐   | ошибка если пусто      |
| `ifPresent()`   | ⭐⭐⭐⭐    | выполнить действие     |

------

# Практический план на 3 дня

## День 1

- понять идею Optional;
- изучить:
  - `of`
  - `ofNullable`
  - `empty`
  - `orElse`
  - `orElseThrow`

Практика:
написать 10 методов с заменой `null`-проверок.

------

## День 2

Изучить:

- `map`
- `flatMap`
- цепочки вызовов.

Практика:

Переделать:

```java
if (user != null) {
    if (user.getAddress() != null) {
        return user.getAddress().getCity();
    }
}
return "Unknown";
```

в Optional-стиль.

------

## День 3

Практика на реальном коде:

- Spring Data `findById()`;
- сервисы;
- обработка отсутствующих сущностей.

------

## Итоговый уровень "достаточно для работы"

Ты должен свободно понимать такой код:

```java
return repository.findById(id)
        .map(User::getProfile)
        .map(Profile::getEmail)
        .orElseThrow(() -> new NotFoundException());
```

Если такой код понятен и ты можешь написать его сам — ты знаешь `Optional` на уровне, которого хватает примерно для 90% Java-проектов.