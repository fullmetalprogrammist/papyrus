```
helm repo add traefik https://traefik.github.io/charts
```



```
helm repo update
```



```
kubectl create namespace traefik
```





- Настройка TLS для локальной разработки
  - В винде можно выполнять эту команду из git bash, потому что вместе с git ставятся и прочие проги, в их числе и openssl, и git bash знает где они лежат. Иначе придется прописывать путь до нее в PATH, чтобы работало из powershell.
  - Путь сохранения сертификата - куда удобно. Главное не перепутать его

````
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout tls.key -out "D:\tmp\tls.crt" -subj "/CN=*.traefik.localhost"
````

- Эту команду вводить через powershell:

```
kubectl create secret tls local-selfsigned-tls --cert="D:\tmp\tls.crt" --key="D:\tmp\tls.key" --namespace traefik
```

- Дополнительно
  - Если надо удалить сертификат

```
kubectl delete secret local-selfsigned-tls -n traefik
```





# Конфиг траефика

- Это конфиг для траефика, на его специфичном формате. Он на основе него будет создавать уже куберовские объекты:
  - Сохраняем в произвольное место под любым именем, например `traefik-basic-config.yaml`

```yaml
# Configure Network Ports and EntryPoints
# EntryPoints are the network listeners for incoming traffic.
ports:
  # Defines the HTTP entry point named 'web'
  web:
    port: 80
    nodePort: 30000
    # Instructs this entry point to redirect all traffic to the 'websecure' entry point
    http:
      redirections:
        entryPoint:
          to: websecure
          scheme: https
          permanent: true

  # Defines the HTTPS entry point named 'websecure'
  websecure:
    port: 443
    nodePort: 30001

# Enables the dashboard in Secure Mode
api:
  dashboard: true
  insecure: false

ingressRoute:
  dashboard:
    enabled: true
    matchRule: Host(`dashboard.traefik.localhost`)
    entryPoints:
      - websecure
    middlewares:
      - name: dashboard-auth

# Creates a BasicAuth Middleware and Secret for the Dashboard Security
extraObjects:
  - apiVersion: v1
    kind: Secret
    metadata:
      name: dashboard-auth-secret
    type: kubernetes.io/basic-auth
    stringData:
      username: admin
      password: "admin"      # Replace with an Actual Password
  - apiVersion: traefik.io/v1alpha1
    kind: Middleware
    metadata:
      name: dashboard-auth
    spec:
      basicAuth:
        secret: dashboard-auth-secret

# We will route with Gateway API instead.
ingressClass:
  enabled: false

# Enable Gateway API Provider & Disables the KubernetesIngress provider
# Providers tell Traefik where to find routing configuration.
providers:
  kubernetesIngress:
    enabled: false
  kubernetesGateway:
    enabled: true

## Gateway Listeners
gateway:
  listeners:
    web:           # HTTP listener that matches entryPoint `web`
      port: 80
      protocol: HTTP
      namespacePolicy:
        from: All

    websecure:         # HTTPS listener that matches entryPoint `websecure`
      port: 443
      protocol: HTTPS  # TLS terminates inside Traefik
      namespacePolicy:
        from: All
      mode: Terminate
      certificateRefs:    
        - kind: Secret
          name: local-selfsigned-tls  # the Secret we created before the installation
          group: ""

# Enable Observability
logs:
  general:
    level: INFO
  # This enables access logs, outputting them to Traefik's standard output by default. The [Access Logs Documentation](https://doc.traefik.io/traefik/observability/access-logs/) covers formatting, filtering, and output options.
  access:
    enabled: true

# Enables Prometheus for Metrics
metrics:
  prometheus:
    enabled: true
```

- Устанавливаем траефик

```
helm install traefik traefik/traefik --namespace traefik --values "путь\до\traefik-basic-config.yaml"
```

- Если что-то изменилось и надо обновить тогда

```
helm upgrade traefik traefik/traefik --namespace traefik --values "путь\до\traefik-basic-config.yaml"
```

- После установки появится под траефика и сервис-балансировщик
  - Искать их надо в неймспейсе traefik, дашборд миникуба по умолчанию показывает default неймспейс, там их не будет, надо переключиться

- Направляем трафик на балансировщик траефика
  - Имя кластера нужно, если нужный кластер не задан как кластер по умолчанию 

```
minikube tunnel -p имяКластера
```

- Теперь админка траефика должна быть доступна по адресу

```
https://dashboard.traefik.localhost/
```

- Браузер будет материться из-за отсутствия сертификата, но надо просто продолжать
  - Сертификаты, которые мы создавали, нужны самому траефику, а к браузеру и инсомнии отношения не имеют



- Деплоим приложение





- Настраиваем путь до приложения

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: user-route
  namespace: dev
spec:
  parentRefs:
    - name: traefik-gateway # Name of the Gateway that Traefik creates when you enable the Gateway API provider
      namespace: traefik
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /user
      backendRefs:
        - name: user-svc
          port: 48080
```

- HTTPRoute не отображается в стандартной админке миникуба, поэтому нужны команды консольные

```
kubectl get httproute -n dev
```

```
kubectl describe httproute имяРоута -n dev
```















