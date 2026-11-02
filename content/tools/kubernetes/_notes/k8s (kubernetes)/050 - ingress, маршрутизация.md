# Что такое ingress

- `ingress` - это объект кубера, который описывает правила маршрутизации.
- `ingress controller` - это конкретная технология, которая эти правила реализует.
  - Например, такие технологии как Kong, Traefic являются ingress-контролерами.







# Вопросы

- зачем несколько ingress'ов делают?
- канареечные релизы
- с портами получше разобраться, где нужны, где не нужны, почему и как это работает





# Как настроить kong

- minikube идет со встроенным аддоном kong
  - с этим аддоном возникают проблемы, поэтому лучше устанавливать kong отдельно
- для этого понадобится менеджер пакетов `chocolatey`
  - если не установлен, устанавливаем (через powershell, запущенный от имени администратора)

```
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

- проверяем версию, установился ли шоколатье `choco --version`
  - все прочие powershell'ы, открытые до установки, видеть его не будут
- теперь устанавливаем `helm` - менеджер пакетов конкретно для кубера

```
choco install kubernetes-helm -y
```

- добавляем репозиторий kong в менеджер

```
helm repo add kong https://charts.konghq.com
```

- устанавливаем активный кластер (если еще это не сделано)

```
minikube profile наш-кластер
```

- устанавливаем kong в наш кластер

```
helm install kong kong/kong --set ingressController.enabled=true
```

- по умолчанию helm использует тот же конфиг, что и kubectl
- проверяем что kong активировался
  - в дашборде в разделе Service > Ingress Classes появится строчка с kong
- теперь можно создавать ingress-объекты на основе kong
- предполагается, что в этот момент уже запущены сервисы и для них созданы объекты service
  - если нет, надо это сделать, прежде чем идти дальше
- описываем ingress-объект в yaml файле
  - создаем объект `minikube apply -f путь-до-файла.yaml`
  - в дашборде он должен появиться в Service > Ingresses
  - TODO: а какой  командой консоли можно увидеть, что он появился?
- включаем туннелирование трафика `minikube tunnel -p наш-кластер`
  - надо делать это из powershell, открытого обязательно от имени администратора
  - туннелирование нужно, чтобы трафик, отправленный на localhost, перенаправлялся в сеть миникуба
    - там его поймает load balancer и отправит на kong

## Дополнительно

- после установки конга появляется сервис kong-kong-proxy в статусе pending
  - у него тип LoadBalancer
- когда мы запускаем `minikube tunnel`, он сам находит сервис типа LoadBalancer и шлет трафик, отправленный на localhost, на этот сервис. А он уже отправляет этот запрос на конкретный объект ingress controller'а. Это такой паттерн кубера, на случай когда у контроллера несколько реплик, но все так же и когда она одна всего.





# Пример ingress-объекта

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: gateway
spec:
  ingressClassName: kong
  rules:
  - http:
      paths:
      - path: /user
        pathType: Prefix
        backend:
          service:
            name: user-svc
            port:
              number: 8080
```









# Дополнительно

- После установки вот такое выдало в консоль, мб тут есть что-то полезное

```
PS C:\WINDOWS\system32> helm install kong kong/kong --set ingressController.enabled=true
NAME: kong
LAST DEPLOYED: Mon Apr 20 11:48:09 2026
NAMESPACE: default
STATUS: deployed
REVISION: 1
DESCRIPTION: Install complete
TEST SUITE: None
NOTES:
To connect to Kong, please execute the following commands:

HOST=$(kubectl get svc --namespace default kong-kong-proxy -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
PORT=$(kubectl get svc --namespace default kong-kong-proxy -o jsonpath='{.spec.ports[0].port}')
export PROXY_IP=${HOST}:${PORT}
curl $PROXY_IP

Once installed, please follow along the getting started guide to start using
Kong: https://docs.konghq.com/kubernetes-ingress-controller/latest/guides/getting-started/

WARNING: Kong Manager will not be functional because the Admin API is not
enabled. Setting both .admin.enabled and .admin.http.enabled and/or
.admin.tls.enabled to true to enable the Admin API over HTTP/TLS.
```

