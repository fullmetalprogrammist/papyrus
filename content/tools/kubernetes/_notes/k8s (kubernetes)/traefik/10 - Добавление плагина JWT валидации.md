

- Добавить в базовый конфиг траефика плагин и включить пару опций

```yaml
# Плагин для валидации JWT и добавления инфы из токена в заголовки запроса
experimental:
  plugins:
    jwt-validation-middleware:
      moduleName: "github.com/legege/jwt-validation-middleware"
      version: "v0.2.1"
providers:
  kubernetesCRD:
    enabled: true
  kubernetesGateway:
    enabled: true
```

- Обновить сетап

```
helm upgrade traefik traefik/traefik -n traefik --values "путь\до\traefik-basic-config.yaml"
```





- Создать объект плагина

```yaml
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: traefik-jwt-middleware-plugin
  namespace: dev  # Важно чтобы мидлвар находился в том же неймспейсе, что и роут, в котором мы будем его использовать
spec:
  plugin:
    jwt-validation-middleware:
      # URL с JWKS-ключами вашего Keycloak
      jwksUrl: "http://keycloak.keycloak.svc.cluster.local:8080/realms/ths/protocol/openid-connect/certs"
      # Опционально: добавлять payload токена в заголовки запроса
      payloadHeaders:
        X-User-Id: sub
      # Необязательные параметры:
      # optional: false  # false = токен обязателен
      # authQueryParam: authToken # проверять токен в query-параметре
      # authCookieName: authToken # проверять токен в cookie
```

- Применить

```
kubectl apply -f "путь\до\манифеста-с-плагином.yaml"
```





- Приделать плагин к роуту

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: user-route
  namespace: dev
spec:
  parentRefs:
    - name: traefik-gateway
      namespace: traefik
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /user
      backendRefs:
        - name: user-svc
          port: 48080
      filters:  # Вот тут
        - type: ExtensionRef
          extensionRef:
            group: traefik.io
            kind: Middleware
            name: traefik-jwt-middleware-plugin
```

- Обновить роут

```
kubectl apply -f "путь\до\роута.yaml"
```



- Теперь при отправке запроса должны получать сообщение о том что нет токена