```

```





# Флоу работы IAM в системе

## Процесс регистрации пользователя

Вот утверждённые шаги, которые мы зафиксировали к текущему моменту:

1. Вася отправляет `username` и `password` на гейт (Kong).
   1. например https://api.myshop.com/v1/register или https://myshop.com/api/v1/register
      1. загуглить, какой варик лучше и почему
2. Гейт без изменений проксирует запрос в `user`-сервис.
3. `user`-сервис проверяет бизнес-правила (уникальность `username`), хэширует пароль и сохраняет его в своей БД вместе с `username`.
4. `user`-сервис синхронно отправляет запрос в Keycloak через Admin API на создание пользователя с теми же `username` и `password`.
5. Keycloak возвращает HTTP-статус 201 и заголовок `Location`, содержащий внутренний ID пользователя (UUID).
6. `user`-сервис сохраняет полученный от Keycloak ID в своей БД, связывая его со своей записью о Васе.
7. При успехе всех операций `user`-сервис возвращает Васе ответ об успешной регистрации.
8. При любом неуспехе user-сервис удаляет у себя запись о Васе и возвращает ответ, что регистрация не удалась.

Процесс регистрации и входа всегда разделен. Сначала регистрируемся, потом отдельно входим.

## Процесс входа пользователя в систему

Вот утверждённые шаги процесса входа Васи:

1. Вася отправляет `username` и `password` на гейт (Kong) по эндпоинту, например, `POST /v1/login`.
2. Гейт проксирует запрос напрямую в Keycloak (на его token endpoint), минуя `user`-сервис.
3. Keycloak проверяет креды по своему хранилищу, и при успехе генерирует JWT-токены (access_token, refresh_token), а при неудаче возвращает 401.
4. Гейт получает ответ от Keycloak и без изменений проксирует его обратно клиенту (Васе).
5. Фронтенд, получив JWT, сам решает, куда перенаправить Васю (например, на главную страницу или в личный кабинет).
6. Если Вася открывает защищённую страницу без токена (или с истёкшим токеном), гейт возвращает 401, а фронтенд перенаправляет его на страницу входа.



# Концептуальные моменты

- keycloak спрятан за гейтом, клиенты не ходят в кейклок напрямую
- на кейклоке лежит задача аутентификации, на гейте - задача авторизации





# Вопросы

- Что вообще нужно устанавливать для работы keykloak в кубернетисе?
- Как keycloak соотносится с api gateway?
  - Как выглядит работа пользователей и администраторов с keycloak в микросервисной системе?
- Как выглядит регистрация пользователя в системе, в которой используется keycloak?
  - Допустим, я программист, которому нужно сделать чтобы Вася, который хочет зарегистрироваться в интернет-магазине, регистрировался и ничего не знал ни про какой keycloak





# Терминология

- `IAM` - Identity and Access Management, управление идентификацией и доступом
- `реалм` - изолированный домен безопасности
  - включает в себя пользователей, роли, настройки и прочие вещи







# Черновая настройка

- установка пакетов

```
PS C:\WINDOWS\system32> helm repo add codecentric https://codecentric.github.io/helm-charts
"codecentric" has been added to your repositories
PS C:\WINDOWS\system32> helm install my-keycloak codecentric/keycloakx
NAME: my-keycloak
LAST DEPLOYED: Mon Apr 20 13:26:14 2026
NAMESPACE: default
STATUS: deployed
REVISION: 1
DESCRIPTION: Install complete
TEST SUITE: None
NOTES:
***********************************************************************
*                                                                     *
*                Keycloak.X Helm Chart by codecentric AG              *
*                                                                     *
***********************************************************************

Keycloak was installed with a Service of type ClusterIP

Create a port-forwarding with the following commands:

export POD_NAME=$(kubectl get pods --namespace default -l "app.kubernetes.io/name=keycloakx,app.kubernetes.io/instance=my-keycloak" -o name)
echo "Visit http://127.0.0.1:8080 to use your application"
kubectl --namespace default port-forward "$POD_NAME" 8080
```

- ~~выполнить~~
  - P.S. это не надо, если установил конг. Это делает ingress controller, основанный на nginx

```
minikube addons enable ingress
```

- манифест для конга
  - идея - запросы без токена трактуем как анонимов и пусть бизнес-сервис сам решает, обрабатывать или отклонять

```yaml
apiVersion: configuration.konghq.com/v1
kind: KongPlugin
metadata:
  name: block-anonymous
plugin: request-termination
config:
  status_code: 401
  message: "Неаутентифицированные идут на хой"
---
apiVersion: configuration.konghq.com/v1
kind: KongConsumer
metadata:
  name: anonymous  # Имя Consumer'а в K8s
username: anonymous  # Логин Consumer'а в Kong (тот самый "аноним")
```



- манифест со всем необходимым
  - много возни было, в итоге вот этот варик заработал, потом разобраться что к чему, проблемы были в StatefulSet keycloak, а в этом варианте надо подождать пока раздуплится, сначала может быть красное

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: postgres-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 2Gi
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: keycloak-data
spec:
  accessModes:
    - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
---
apiVersion: v1
kind: Service
metadata:
  name: keycloak
  labels:
    app: keycloak
spec:
  ports:
    - protocol: TCP
      port: 8080
      targetPort: http
      name: http
  selector:
    app: keycloak
  type: ClusterIP
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: keycloak
  name: keycloak-discovery
spec:
  selector:
    app: keycloak
  clusterIP: None
  type: ClusterIP
---
apiVersion: apps/v1
# Use a stateful setup to ensure that for a rolling update Pods are restarted with a rolling strategy one-by-one.
# This prevents losing in-memory information stored redundantly in two Pods.
kind: StatefulSet
metadata:
  name: keycloak
  labels:
    app: keycloak
spec:
  serviceName: keycloak-discovery
  # Run with one replica to save resources, or with two replicas to allow for rolling updates for configuration changes
  replicas: 2
  selector:
    matchLabels:
      app: keycloak
  template:
    metadata:
      labels:
        app: keycloak
    spec:
      containers:
        - name: keycloak
          image: quay.io/keycloak/keycloak:26.6.1
          args: ["start"]
          env:
            - name: KC_BOOTSTRAP_ADMIN_USERNAME
              value: "admin"
            - name: KC_BOOTSTRAP_ADMIN_PASSWORD
              value: "admin"
            # In a production environment, add a TLS certificate to Keycloak to either end-to-end encrypt the traffic between
            # the client or Keycloak, or to encrypt the traffic between your proxy and Keycloak.
            # Respect the proxy headers forwarded by the reverse proxy
            # In a production environment, verify which proxy type you are using, and restrict access to Keycloak
            # from other sources than your proxy if you continue to use proxy headers.
            - name: KC_PROXY_HEADERS
              value: "xforwarded"
            - name: KC_HTTP_ENABLED
              value: "true"
            # In this explorative setup, no strict hostname is set.
            # For production environments, set a hostname for a secure setup.
            - name: KC_HOSTNAME_STRICT
              value: "false"
            - name: KC_HEALTH_ENABLED
              value: "true"
            - name: 'KC_CACHE'
              value: 'ispn'
            # Passing the Pod's IP primary address to the JGroups clustering as this is required in IPv6 only setups
            - name: POD_IP
              valueFrom:
                fieldRef:
                  fieldPath: status.podIP
            # Instruct JGroups which DNS hostname to use to discover other Keycloak nodes
            # Needs to be unique for each Keycloak cluster
            - name: KC_CACHE_EMBEDDED_NETWORK_BIND_ADDRESS
              value: '$(POD_IP)'
            - name: 'KC_DB_URL_DATABASE'
              value: 'keycloak'
            - name: 'KC_DB_URL_HOST'
              value: 'postgres'
            - name: 'KC_DB'
              value: 'postgres'
            # In a production environment, use a secret to store username and password to the database
            - name: 'KC_DB_PASSWORD'
              value: 'keycloak'
            - name: 'KC_DB_USERNAME'
              value: 'keycloak'
          ports:
            - name: http
              containerPort: 8080
            - name: jgroups
              containerPort: 7800
            - name: jgroups-fd
              containerPort: 57800
          startupProbe:
            httpGet:
              path: /health/started
              port: 9000
            periodSeconds: 1
            failureThreshold: 600              
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 9000
            periodSeconds: 10
            failureThreshold: 3              
          livenessProbe:
            httpGet:
              path: /health/live
              port: 9000
            periodSeconds: 10
            failureThreshold: 3              
          resources:
            limits:
              cpu: 2000m
              memory: 2000Mi
            requests:
              cpu: 500m
              memory: 1700Mi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
  labels:
    app: postgres
spec:
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: mirror.gcr.io/postgres:17
          env:
            - name: POSTGRES_USER
              value: "keycloak"
            - name: POSTGRES_PASSWORD
              value: "keycloak"
            - name: POSTGRES_DB
              value: "keycloak"
            - name: POSTGRES_LOG_STATEMENT
              value: "all"
          ports:
            - name: postgres
              containerPort: 5432
          volumeMounts:
            - name: postgres-data
              mountPath: /var/lib/postgresql/data
      volumes:
        - name: postgres-data
          persistentVolumeClaim:
            claimName: postgres-data
---
apiVersion: v1
kind: Service
metadata:
  labels:
    app: postgres
  name: postgres
spec:
  selector:
    app: postgres
  ports:
    - protocol: TCP
      port: 5432
      targetPort: 5432
  type: ClusterIP
```

- сохранить в yaml, применить через kubectl apply -f путь-до-манифеста.yaml
  - при перезапуске кластера часть этих вещей может не подняться, лечится повторным применением манифеста
- чтобы не ебаться с админкой и она была легко доступна по адресу `http://localhost:8080`

```
kubectl port-forward svc/keycloak 8080:8080
```

креды: admin + admin

- зайти в админку
  - создать реалм
  - создать клиента
    - клиент - это приложение, которое будет взаимодействовать с кейклоком.
      - В данном случае по сути это только наш гейтвей и сервис user
    - протокол клиента выбрать OpenID Connect (OIDC)





## Дополнительные детали

- public client и confidential client
- секрет для конфед-клиента - искать в админке на странице клиента на вкладке Credentials
- когда настраиваешь роли для клиента, надо обращать внимание, что там много ролей и поэтому они разбиты на несколько страниц, и на одной странице видно не все. Поэтому если какой-то роли не видно, надо листать страницы и искать.



- для конга клиент делаем confindential
  - ставим опции Client Authentication и Service account roles