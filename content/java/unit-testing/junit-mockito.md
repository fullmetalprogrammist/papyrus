# Код примера

## RegistrationService

```java
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private String generateConfirmationCode() {
        return String.format("%06d", new Random().nextInt(1_000_000));
    }

    public User registerNewUser(String username, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new UsernameTakenException(username);
        }

        if (userRepository.existsByEmail(email)) {
            throw new EmailTakenException(email);
        }

        var user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setConfirmationToken(generateConfirmationCode());

        user = userRepository.save(user);

        notificationService.sendNotification(user);

        return user;
    }
}

```



## UserRepository и сущность User

### UserRepository

```java
public interface UserRepository extends JpaRepository<User, Long> {
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
```



### Сущность User

```java
@Entity
@Table(name = "users")
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 255)
    private String email;

    @Column(nullable = false)
    private boolean confirmed = false;

    @Column(name = "confirmation_token", length = 64)
    private String confirmationToken;
}
```



## NotificationService

### Интерфейс NotificationService

```java
public interface NotificationService {
    void sendNotification(User user);
}
```



### Реализация EmailNotificationService

```java
@Service
public class EmailService implements NotificationService {

    @Override
    public void sendNotification(User user) {
        System.out.println(
            "Для подтверждения регистрации перейдите по ссылке https://nomatter.com?code=" + user.getConfirmationToken()
        );
    }
}
```



## Исключения

```java
public class UsernameTakenException extends RuntimeException {
    public UsernameTakenException(String username) {
        super("Имя пользователя " + username + " занято.");
    }
}
```

```java
public class EmailTakenException extends RuntimeException {
    public EmailTakenException(String email) {
        super("Почта " + email + " занята.");
    }
}
```





# Элементы тестов

## stub

- `Stub` - используется для подмены зависимости, когда нужно чтобы зависимость вернула заранее известные данные.
  - Например, у нас есть сервис RegistrationService и мы хотим его протестировать. У него есть зависимость - интерфейс UserRepository, который извлекает из БД пользователя.
  - Нам не нужен реальный пользователь, реальная БД, поэтому для UserRepository мы создаем стаб:
    - В тесте сами создаем объект пользователя, которого должны "найти".
    - Для репозитория создаем стаб и настраиваем его, чтобы он например при вызове метода **.findById(1L)** вернул наш объект пользователя.
    - Передаем стаб в качестве зависимости сервису вместо реального репозитория и всё - у сервиса есть имитация репозитория без реальной БД. Стаб возвращает нам созданного нами известного пользователя, с помощью которого мы тестируем поведение.



## mock

- `Mock` - используется для подмены зависимости, когда надо проверить что тестируемый объект эту зависимость вызвал.
  - Например, у нас есть сервис RegistrationService, который при регистрации должен отсылать письмо пользователю. Для этого у него есть зависимость EmailService.
  - Мы хотим проверить, что RegistrationService вызывает EmailService. Так что мы создаем мок EmailService и передаем его в RegistrationService.
    - Потом вызываем метод регистрации у RegistrationService и проверяем через мок, вызывал его сервис регистрации или нет. Если вызывал, мок это зафиксирует.
- TODO
  - А мок умеет возвращать данные как стаб или он только для проверки взаимодействий?
  - Моки используются только для сервисов, которые ничего не возвращают? Типа отправки емейла например?



## spy

- `Spy` - используется для частичной замены поведения в реальном объекте.
  - Например, у нас есть сервис RegistrationService, который при регистрации генерирует какой-то код активации аккаунта и отправляет его на почту пользователю. Метод этот пусть называется **generateActivationCode()**. Возможно он какой-то долгий или тоже вызывает сторонний сервис, в общем, возня.
  - Репозиторий мы застабили, сервис почты замокали.
  - А сам RegistrationService мы можем "заспаить" - подменить generateActivationCode() чтобы он возвращал известное значение. При этом все остальные методы работают как обычно.





# Инструменты

- Для тестирования используются несколько инструментов
  - `JUnit` - фреймворк запуска тестов. Объявление тестов, настройки Before, After и т.д. - это все здесь.
  - `Mockito` - фреймворк для создания stub, mock, spy.
- Т.о. у них разделены ответственности.
- В Spring оба они входят в spring boot стартер, отдельно подключать не надо.





# Импорты

- Сразу тут соберу импорты всех методов обоих инструментов

```java
// JUnit
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;

// Mockito
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
```





# JUnit

## Общие практики

- Как оформлять тесты, группировать их
  - Все тесты, посвященные бизнес-классу, собираем в одном тестовом классе.
- Как называть класс с тестами
  - Классу давать окончание Test, например RegistrationServiceTest.
    - Технически это не обязательно, но так принято, +плагины сборщиков могут на это ориентироваться и ищут тесты именно по именам.
- Где писать сам код тестов
  - Код тестов пишем как методы класса с тестами.
  - Называть методы по принципу
    - `имяМетода_чтоПроверяетТест`
    - `имяМетода_кейс_ожидаемоеПоведение`





## TODO

- Аннотации @Before, @After и прочие

# Mockito

## Активация мокито, создание моков

```java
@ExtendWith(MockitoExtension.class)  // <-- Чтобы работали остальные аннотации Mockito
public class RegistrationServiceTest {

    @Mock  // <-- Создает мок для UserRepository
    private UserRepository userRepository;
    @Mock  // <-- Создает мок для NotificationService
    private NotificationService emailService;

    @InjectMocks  // <-- Внедряет моки в объект
    private RegistrationService registrationService;

    @Test
    void registerNewUser_usernameTaken_throws() {
        when(userRepository.existsByUsername("becky"))
            .thenReturn(true);

        assertThrows(
            UsernameTakenException.class,
            () -> registrationService.registerNewUser("becky", "bthatcher@gmail.com")
        );
    }
}
```

- Как создать мок
  - Объявить в тестовом классе поле с типом, который хотим замокать.
  - Повесить на это поле аннотацию `@Mock`.
- Как внедрить моки в целевой объект
  - Объявить в тестовом классе поле с типом, в который хотим внедрить моки вместо зависимостей.
  - Повесить на это поле аннотацию `@InjectMocks` - объект создастся и в него в качестве зависимостей внедрятся моки через  конструктор.
- Чтобы аннотации `@Mock` и `@InjectMocks` работали, вешаем на класс с тестами аннотацию `@ExtendWith(MockitoExtension.class)`



# Настройка поведения моков

## when()

- `when` используется чтобы задать, что должен возвращать мок, когда на нем вызывается метод.
- Внутри when мы вызываем метод мока с нужным аргументом.

```java
// "Когда вызывается userRepository.existsByUsername с аргументом 'becky', возвращай true"
when(userRepository.existsByUsername("becky"))  // вызываем нужный метод мока с нужным аргументом
    .thenReturn(true);  // указываем что надо вернуть при этом
```

```java
User user = new User(1L, "Alice");
// "Когда вызывается userRepository.findById с любым Long, возвращай указанный объект"
when(userRepository.findById(anyLong()))
    .thenReturn(Optional.of(user));
```

**Что после when**:



### .thenReturn(value)

- `.thenReturn(значение)` - для возврата указанного значения.



### .thenThrow(exception)

- `.thenThrow(исключение)` - для выброса указанного исключения.

```java
when(userRepository.findById(10L)
    .thenThrow(new UserNotFoundException("not found"));
```



### .thenAnswer(args -> { })

- `.thenAnswer()` - когда нужно не просто фиксированное значение вернуть, а
  - Получить аргументы вызова.
  - Выполнить какую-то логику, которая возвращает ответ.

```java
@Test
void registerNewUser_returnsUserWithId() {
    when(userRepository.save(any(User.class)))
        .thenAnswer(arg -> {
            User u = arg.getArgument(0);
            u.setId(20L);
            return u;
        });

    User saved = registrationService.registerNewUser("joe", "harper@gmail.com");

    assertEquals(20L, saved.getId());
}
```

- Здесь мы не просто возвращаем из userRepository.save заранее созданный объект, а позволяем методу registerNewUser самому создать объект и передать его в save.
  - save мы с помощью **матчера** настраиваем на прием любого объекта типа User.
  - с помощью .thenAnswer() мы получаем переданный объект, устанавливаем ему явно Id, т.о. как бы имитируя сохранение в БД, и возвращаем тот же самый объект.
- Т.о. общая цепочка: registrationService создает объект user, передает его в save; срабатывает наш стаб, добивает полученный от registrationService объект id'шником и возвращает этот объект; проверяем, что у "сохраненного" объекта появился правильный id.



## Матчеры

- Матчеры используются в when и verify, чтобы указывать не конкретное значение, а множество однотипных значений.



## doReturn()

- TODO





# Проверки

## assert



## verify





# Что вообще должно быть в юнит-тестах

```java
@Service
@RequiredArgsConstructor
public class RegistrationService {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    private String generateConfirmationCode() {
        return String.format("%06d", new Random().nextInt(1_000_000));
    }

    public User registerNewUser(String username, String email) {
        if (userRepository.existsByUsername(username)) {
            throw new UsernameTakenException(username);
        }

        if (userRepository.existsByEmail(email)) {
            throw new EmailTakenException(email);
        }

        var user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setConfirmationToken(generateConfirmationCode());

        user = userRepository.save(user);

        notificationService.sendNotification(user);

        return user;
    }
}
```

