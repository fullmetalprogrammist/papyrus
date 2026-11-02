

# Массивы

## Создать массив

Пустой:

```java
var numbers = new int[10];
```

---

Заполненный значениями:

```java
var numbers = new int[] { 5, 7, 10, 35, 14 };  // размер вычисляется автоматически
```



## Длина массива

```java
int len = arr.length;
```



## Отсортировать массив

С мутацией:

```java
Arrays.sort(arr);  // void
```

---

Без мутации: скопировать + сортировать копию





## Копия массива

```java
var arr = new int[] { 5, 3, 7, 10 };
int[] arrCopy = arr.clone();
```

`.clone()` - метод Object, для массива создает shallow-копию. Для массива int нормально, потому что int примитив.

---

```java
import java.util.Arrays;

var arr = new int[] { 5, 3, 7, 10 };
int[] arrCopy = Arrays.copyOf(arr, arr.length);
```



## Сравнить два массива на равно \ не равно

```java
import java.util.Arrays;

boolean eq = Arrays.equals(arr1, arr2);
```

- "Умный" - если в массиве примитивы, сравнивает через ==. Если объекты - через equals.



## Массив → список

- Если массив из объектов:

```java
var numbers = new Integer[] { 5, 7, 13, 4, 21 };
List<Integer> list = Arrays.asList(numbers);
```

- https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Arrays.html#asList(T...)
- 

---

- Если массив из примитивов:

```java
var numbers = new int[] { 5, 7, 13, 4, 21 };
        List<Integer> list = Arrays.stream(numbers)
            .boxed()
            .toList();
```

- Тут через `Arrays.asList()` не получится из-за особенностей дженериков. Будет список, где каждый элемент это `int[]`. Поэтому через стримы.
- Как это работает
  - `Arrays.stream(numbers)` вернет IntStream
  - `.boxed()` на IntStream вернет `Stream<Integer>`
  - `.toList()` соберет в `List<Integer>`



## Массив → стрим

- Через апи стримов:

```java
import java.util.stream.IntStream;

int[] arr = new int[] { 5, 7, 10, 3, 20 };
IntStream stream = IntStream.of(arr);
```

---

- Через утилиты массивов

```java
import java.util.stream.Stream;
import java.util.Arrays;

var arr = new String[] { "Hello", "world", "how", "are", "you" };
Stream<String> stream = Arrays.stream(arr);
```

- https://docs.oracle.com/en/java/javase/26/docs/api/java.base/java/util/Arrays.html#stream(T%5B%5D)

# Строки

## Длина строки

```java
int len = "hello".length();  // 5
```

- Скобки - главное. В отличие от массивов, у строки это метод.



## Получить символ по позиции

```java
char ch1 = "hello".charAt(1);  // e
```



## Разбить строку на отдельные символы

Разбить на массив char:

```java
char[] chars = "Hello, world!".toCharArray();
```

---

Разбить на массив строк из одной буквы:

```java
String[] chars = "Hello, world!".split("");
```



## Соединить несколько строк в одну

```java
var words = new String[] { "hello", "world", "how", "are", "you" };
String joined = String.join(" ", words);
```

- Вторым параметром можно использовать:
  - Отдельные строки
  - Массив строк
  - Коллекции строк, список например



## Повторить строку много раз

```java
String www = "w".repeat(3);  // www
```



## Строка пустая \ состоит из пробелов

```java
boolean empty = "".isEmpty();     // true
boolean blank = "   ".isBlank();  // true
```

- empty - это вообще никаких символов, т.е. length() == 0
- blank - это empty или целиком только из "пробельных символов" (пробел, таб, \n)



## Убрать из строки начальные и конечные пробелы

```java
String trimmed = "   hello   ".trim();  // hello
```





# Символы

## Символ большой или маленький?

```java
boolean big = Character.isUpperCase('B');
```

```java
boolean small = Character.isLowerCase('s');
```



## Изменить регистр символа

```java
char up = Character.toUpperCase('a');  // A
```

```java
char low = Character.toLowerCase('D');  // d
```



## Символ - это буква \ цифра?

```java
boolean res = Character.isLetter('m');
```

```java
boolean res = Character.isDigit('7');
```

```java
boolean res = Character.isLetterOrDigit('*');
```







# Стримы

## import стримов

```java
import java.util.stream.IntStream;
import java.util.stream.LongStream;
import java.util.stream.Stream;
```



## Ренж от i до j

```java
IntStream.range(0, 10);  // 0 - 9
```

```java
IntStream.rangeClosed(0, 10);  // 0 - 10
```



## Итерация - бесконечная и конечная

- Бесконечная итерация

```java
IntStream.iterate(0, i -> i + 1)  // init + генерация next
```

- Конечная итерация

```java
IntStream.iterate(0, i -> i < 10, i -> i + 1)  // init + условие окончания + генерация next
```



## min, max, sum, avg

```java
IntStream numbers = IntStream.of(5, 10, 3, 7, 21);
```

```java
// Минимальный
OptionalInt min = numbers.min();
```

```java
// Максимальный
OptionalInt max = numbers.max();
```

```java
// Среднее
OptionalDouble avg = numbers.average();
```

```java
// Сумма
int sum = numbers.sum();
```



## Стрим → массив

- В массив Object'ов:

```java
Object[] arr = coll.stream()
    .// промежуточные операции
    .toArray();
```

---

- В массив нужного типа:

```java
Person[] arr = coll.stream()
    .// промежуточные операции
    .toArray(Person[]::new);
```





# Списки

## Создать список с несколькими элементами

```java
var words = new ArrayList<String>(
    List.of("Hello", "world", "how", "are", "you")
);
```



## Размер списка

```java
var list = List.of("Hello", "world");
int size = list.size();  // 2
```



## Получить элемент списка по индексу

```java
List<Integer> numbers = List.of(5, 7, 14, 21);
int third = numbers.get(3);  // 21
```



## Список пустой?

```java
if (list.isEmpty()) { ... }
```

```java
if (list.size() == 0) { ... }
```





# Математика

## Модуль

```java
int a = 1;
int b = 5;
Math.abs(a - b);  // 4
```



## Минимальное из двух значений

```java
int min = Math.min(5, 7);
```

- Принимает только два значения
  - Если надо больше, тогда через стримы

# Особенности, правила

## .of() возвращает неизменяемые коллекции

- `List.of` возвращает неизменяемый список, поэтому его надо закинуть в конструктор обычного списка
  - То же самое касается и остальных коллекций



## Примитивы и дженерики

- Дженерики с примитивами не работают, только с объектами

```
List<int>     ❌
List<Integer> ✅
```