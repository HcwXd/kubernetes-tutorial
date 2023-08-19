# Kubernetes - 基礎概念 101

網頁好讀版：[https://chengweihu.com/kubernetes-tutorial-1-pod-node/](https://chengweihu.com/kubernetes-tutorial-1-pod-node/)

> Kubernetes 想解決的問題：手動部署多個容器到多台機器上並監測管理這些容器的狀態非常麻煩。
>
> Kubernetes 要提供的解法：提供一個平台以較高層次的抽象化去自動化操作與管理容器們。

![Kubernetes](https://d1.awsstatic.com/PAC/kuberneteslogo.eabc6359f48c8e30b7a138c18177f3fd39338e05.png)

Kubernetes（K8S）是一個可以幫助我們管理微服務（microservices）的系統，他可以自動化地部署及管理多台機器上的多個容器（Container）。簡單來說，他可以做到：

- 同時部署多個容器到多台機器上
- 管理多個容器的狀態，自動偵測並重啟故障的容器

### 目錄

- [**Kubernetes 四元件**](#Kubernetes-四元件)
- [**基本運作與安裝**](#基本運作與安裝)
- [**如何建立一個 Pod**](#如何建立一個-Pod)
- [**Kubernetes 進階三元件**](#Kubernetes-進階三元件)
- [**Helm**](#Helm)
- [**kubectl 額外補充**](#kubectl-額外補充)

## Kubernetes 四元件

在了解 Kubernetes 如何幫助我們管理容器們前，我們先要由小到大依序了解組成 Kubernetes 的四種最基本的元件：Pod、Worker Node、Master Node、Cluster。

### Pod

Kubernetes 運作的最小單位，一個 Pod 對應到一個應用服務（Application）

- 每個 Pod 都有一個身分證，也就是屬於這個 Pod 的 `yaml` 檔
- 一個 Pod 裡面可以有一個或是多個 Container，但一般情況一個 Pod 最好只有一個 Container
- 同一個 Pod 中的 Containers 共享相同資源及網路，彼此透過 local port number 溝通

### Worker Node

Kubernetes 運作的最小硬體單位，一個 Worker Node（簡稱 Node）對應到一台機器，可以是實體機如你的筆電、或是虛擬機如 AWS 上的一台 EC2 或 GCP 上的一台 computer engine。

每個 Node 中都有三個組件：kubelet、kube-proxy、Container Runtime。

- kubelet
  - 該 Node 的管理員，負責管理該 Node 上的所有 Pods 的狀態並負責與 Master 溝通
- kube-proxy
  - 該 Node 的傳訊員，負責更新 Node 的 iptables，讓 Kubernetes 中不在該 Node 的其他物件可以得知該 Node 上所有 Pods 的最新狀態
- Container Runtime
  - 該 Node 真正負責容器執行的程式，以 Docker 容器為例其對應的 Container Runtime 就是 Docker Engine

### Master Node

Kubernetes 運作的指揮中心，可以簡化看成一個特化的 Node 負責管理所有其他 Node。一個 Master Node（簡稱 Master）中有四個組件：kube-apiserver、etcd、kube-scheduler、kube-controller-manager。

- kube-apiserver

  - 管理整個 Kubernetes 所需 API 的接口（Endpoint），例如從 Command Line 下 kubectl 指令就會把指令送到這裏
  - 負責 Node 之間的溝通橋樑，每個 Node 彼此不能直接溝通，必須要透過 apiserver 轉介
  - 負責 Kubernetes 中的請求的身份認證與授權

- etcd

  - 用來存放 Kubernetes Cluster 的資料作為備份，當 Master 因為某些原因而故障時，我們可以透過 etcd 幫我們還原 Kubernetes 的狀態

- kube-controller-manager

  - 負責管理並運行 Kubernetes controller 的組件，簡單來說 controller 就是 Kubernetes 裡一個個負責監視 Cluster 狀態的 Process，例如：Node Controller、Replication Controller。這些 Process 會在 Cluster 與預期狀態（desire state）不符時嘗試更新現有狀態（current state）
  - 例如：現在要多開一台機器以應付突然增加的流量，那我的預期狀態就會更新成 N+1，現有狀態為 N，這時相對應的 controller 就會想辦法多開一台機器
  - controller-manager 的監視與嘗試更新也都需要透過訪問 kube-apiserver 達成

- kube-scheduler

  - 整個 Kubernetes 的 Pods 調度員，scheduler 會監視新建立但還沒有被指定要跑在哪個 Node 上的 Pod，並根據每個 Node 上面資源規定、硬體限制等條件去協調出一個最適合放置的 Node 讓該 Pod 跑

### Cluster

Kubernetes 中多個 Node 與 Master 的集合。基本上可以想成在同一個環境裡所有 Node 集合在一起的單位

## 基本運作與安裝

![K8s-Overview](https://github.com/HcwXd/kubernetes-tutorial/blob/master/src/kubernetes-structure.jpeg?raw=true)

### 基本運作

接下來我們用一個簡單的問題「Kubernetes 是如何建立一個 Pod？」來複習整體 Kubernetes 的架構。上圖為一個簡易的 Kubernetes Cluster，通常一個 Cluster 中其實會有多個 Master 作為備援，但為了簡化我們只顯示一個。

當使用者要部署一個新的 Pod 到 Kubernetes Cluster 時，使用者要先透過 User Command（kubectl）輸入建立 Pod 的對應指令（下面會在解說如何建立一個 Pod）。此時指令會經過一層認證確認傳送方的身份後傳遞到 Master Node 中的 API Server，API Server 會把指令備份到 etcd 。

接下來 controller-manager 會從 API Server 收到需要創建一個新的 Pod 的訊息，並檢查如果資源許可，就會建立一個新的 Pod。最後 Scheduler 在定期訪問 API Server 時，會詢問 controller-manager 是否有建置新的 Pod，如果發現新建立的 Pod 時，Scheduler 就會負責把 Pod 配送到最適合的一個 Node 上面。

### 安裝 Kubernetes

要實際動手在本機端體驗如何操作 Kubernetes 前，需要分別下載 Minikube、VirtualBox 以及 kubectl 三個套件。以下都以 MacOS 平台為主：

Minikube

- 一個 Google 發佈的輕量級工具，讓開發者可以輕鬆體驗一個的 Kubernetes Cluster。Minikube 會在本機端建立 Virtual Machine，並在其中運行一個 Single-Node 的 Kubernetes Cluster
- [Github 下載](https://github.com/kubernetes/minikube)

VirtualBox

- 因為 Minikube 會透過 Virtual Machine 跑 Kubernetes，因此會需要先安裝一個跑虛擬化的工具，在這邊可以直接使用 VirtualBox
- [官網載點](https://www.virtualbox.org/wiki/Downloads)

Kubectl

- Kubectl 是 Kubernetes 的 Command Line 工具，我們之後會透過 Kubectl 去操作我們的 Kubernetes Cluster
- [官網載點](https://kubernetes.io/docs/tasks/tools/install-kubectl/)

## 如何建立一個 Pod

在下載好所需的程式後，我們現在就可以來練習如何建立我們的第一個 Pod 了。

### 啟動 Minikube

下載完 minikube 之後，我們可以先透過

```
minikube
```

瞧瞧所有 minikube 的指令，然後透過

```
minikube start
```

就可以啟動 minikube，最後再補充五個常用的指令：

列出 minikube 的狀態

```
minikube status
```

停止 minikube 運行

```
minikube stop
```

ssh 進入 minikube 中

```
minikube ssh
```

查詢 minikube 對外的 ip

```
minikube ip
```

透過 minikube 提供的瀏覽器 GUI 查看 Cluster 狀況

```
minikube dashboard
```

### 準備 Pod 中運行的目標程式

在啟動 Minikube 後，在接下來我們要來選定一個要在我們 Pod 中運行的程式。我們要把這個程式打包成 Image 後上傳到 DockerHub 上，在這邊我們的目標範例程式是一個 Node.js 的 Web App，相關的程式碼可以在這個 [Github Repo](https://github.com/HcwXd/docker-tutorial/tree/master/docker-demo-app) 上找到。簡單來說，這個程式的邏輯就是會建立一個 Server 監聽在 3000 port，收到 request 進來後會渲染 `docker.html` 這個檔案，這時網頁上就會出現一隻可愛的小鯨魚。

你也可以試著自己透過 `docker build -t` 先建立好 docker image

```
docker build -t yourDockerAccount/yourDockerApp
```

然後再透過 `docker push` 上傳到 Dockerhub

```
docker push yourDockerAccount/yourDockerApp:latest
```

在這邊我已經把上面的 Node.js Web App 上傳到這個 [Dockerhub Repo](https://hub.docker.com/r/hcwxd/kubernetes-demo)。

接下來我們就要正式來建立一個 Pod 了

### 撰寫 Pod 的身分證

還記得我們在介紹 Kubernetes 時有提到，每個 Pod 都有一個身分證，也就是屬於這個 Pod 的 `.yaml` 檔。我們透過撰寫這個 `.yaml` 檔就可以建立出 Pod。

- `kubernetes-demo.yaml`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: kubernetes-demo-pod
  labels:
    app: demoApp
spec:
  containers:
    - name: kubernetes-demo-container
      image: hcwxd/kubernetes-demo
      ports:
        - containerPort: 3000
```

- apiVersion
  該元件的版本號

- kind

  該元件是什麼屬性，常見有 `Pod`、`Node`、`Service`、`Namespace`、`ReplicationController` 等

- metadata
  - name
    指定該 Pod 的名稱
  - labels
    指定該 Pod 的標籤，這裡我們暫時幫它上標籤為 `app=demoApp`
- spec
  - container.name
    指定運行出的 Container 的名稱
  - container.image
    指定 Container 要使用哪個 Image，這裡會從 DockerHub 上搜尋
  - container.ports
    指定該 Container 有哪些 port number 是允許外部資源存取

### 透過 kubectl 建立 Pod

有了身份證後，我們就可以透過 kubectl 指令來建立 Pod

```
kubectl create -f kubernetes-demo.yaml
```

看到 `pod/kubernetes-demo-pod created` 的字樣就代表我們建立成功我們的第一個 Pod 了。我們可以再透過指令

```
kubectl get pods
```

看到我們運行中的 Pod：

```
NAME                  READY   STATUS    RESTARTS   AGE
kubernetes-demo-pod   1/1     Running   0          60s
```

### 連線到我們 Pod 的服務資源

建立好我們的 Pod 之後，打開瀏覽器的 `localhost:3000` 我們會發現怎麼什麼都看不到。這是因為在 Pod 中所指定的 port，跟我們本機端的 port 是不相通的。因此，我們必須還要透過 `kubectl port-forward`，把我們兩端的 port 做 mapping。

```
kubectl port-forward kubernetes-demo-pod 3000:3000
```

做好 mapping 後，再打開瀏覽器的 `localhost:3000` ，我們就可以迎接一隻可愛的小鯨魚囉！

![kubernetes-demo-screenshot](https://github.com/HcwXd/docker-tutorial/blob/master/src/Docker-demo-screenshot.png?raw=true)

## Kubernetes 進階三元件

了解到了如何從無到有建立一個 Kubernetes Cluster 並產生一個 Pod 後，接下來我們要認識在現實應用中，我們還會搭配到哪些 Kubernetes 的進階元件。其中最重要的三個進階元件就是：Service、Ingress、Deployment。

### Service

還記得上面提到我們在連線到一個 Pod 的服務資源時，會使用到 `port-forward` 的指令。但如果我們有多個 Pods 想要同時被連線時，我們就可以用到 Service 這個進階元件。簡單來說，Service 就是 Kubernetes 中用來定義「一群 Pod 要如何被連線及存取」的元件。

要建立一個 Service，一樣要撰寫屬於他的身分證。

- `service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app: demoApp
  type: NodePort
  ports:
    - protocol: TCP
      port: 3001
      targetPort: 3000
      nodePort: 30390
```

- apiVersion
  該元件的版本號

- kind

  該元件是什麼屬性，常見有 `Pod`、`Node`、`Service`、`Namespace`、`ReplicationController` 等

- metadata

  - name
    指定該 Pod 的名稱

- spec

  - selector

    該 Service 的連線規則適用在哪一群 Pods，還記得我們在建立 Pod 的時候，會幫它上 `label`，這時就可以透過 `app = demoApp`，去找到那群 label 的 app 屬性是 MyApp 的 Pods 們

  - ports
    - targetPort
      指定我們 Pod 上允許外部資源存取 Port Number
    - port
      指定我們 Pod 上的 targetPort 要 mapping 到 Service 中 ClusterIP 中的哪個 port
    - nodePort
      指定我們 Pod 上的 targetPort 要 mapping 到 Node 上的哪個 port

接下來我們先重新建立我們的 Pod

```
kubectl create -f kubernetes-demo.yaml
```

接下來我們透過 `service.yaml` 來建立我們的 Service 元件

```
kubectl create -f service.yaml
```

然後我們可以透過

```
kubectl get services
```

取得我們新建立 Service 的資料

```
NAME         TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)          AGE
my-service   NodePort    10.110.237.205   <none>        3001:30391/TCP   60s
```

有了建立好的 Service 後，我們可以透過兩種方式連線我們的 Pod 的服務資源。首先，要從外部連線到我們的 Pod 資源服務，我們必須要先有我們的 Kubernetes Cluster（在這邊是 minikube）對外開放的 IP。我們先透過指令

```
minikube ip
```

得到我們 minikube 的 ip

```
192.168.99.100
```

接著打開我們的瀏覽器，輸入上面的 ip 加上我們在 `yaml` 檔指定的 `nodePort`，在這邊是 `192.168.99.100:30390`，就會得到我們的小鯨魚了。

要從我們的 minikube 裡面連線到我們的 Pod 則要先透過指令

```
minikube ssh
```

ssh 進入我們的 minikube cluster，接著輸入指令

```
curl <CLUSTER-IP>:<port>
```

其中 `CLUSTER-IP` 就是我們用 `kubectl get services` 得到我們 Service 的 IP，而 `port` 就是我們在 `yaml` 檔指定的 `port`，在這邊合起來就是 `10.110.237.205:3001`，於是我們

```
curl 10.110.237.205:3001
```

就可以在 minikube 裡面得到我們的小鯨魚囉！

### Deployment

了解了 Service 後，接下來要來暸解第二個進階元件：Deployment。今天當我們同時要把一個 Pod 做橫向擴展，也就是複製多個相同的 Pod 在 Cluster 中同時提供服務，並監控如果有 Pod 當機我們就要重新把它啟動時，如果我們要一個 Pod 一個 Pod 透過指令建立並監控是很花時間的。因此，我們可以透過 Deployment 這個特殊元件幫我們達成上述的要求。

同樣要建立一個 Deployment，要先撰寫屬於他的身分證。

`deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: demoApp
    spec:
      containers:
        - name: kubernetes-demo-container
          image: hcwxd/kubernetes-demo
          ports:
            - containerPort: 3000
  selector:
    matchLabels:
      app: demoApp
```

- apiVersion
  該元件的版本號

- kind

  該元件是什麼屬性，常見有 `Pod`、`Node`、`Service`、`Namespace`、`ReplicationController` 等

- metadata

  - name
    指定該 Pod 的名稱

- spec

  - replicas

    指定要建立多少個相同的 Pod，在這邊給的數字是所謂的 Desire State，當 Cluster 運行時如果 Pod 數量低於此數字，Kubernetes 就會自動幫我們增加 pod，反之就會幫我們關掉 Pod

  - template

- 指定這個 Deployment 建立的 Pod 們統一的設定，包括 metadata 以及這些 Pod 的 Containers，這邊我們就沿用之前建立 Pod 的設定

  - selector

    - 指定這個 Deployment 的規則要適用到哪些 Pod，在這邊就是指定我們在 template 中指定的 labels

接下來我們就可以透過指令

```
kubectl create -f deployment.yaml
```

建立好我們的 Deployment，這時我們可以查看我們的 Deployment 有沒有被建立好

```
kubectl get deploy
```

```
NAME            READY   UP-TO-DATE   AVAILABLE   AGE
my-deployment   3/3     3            3           60s
```

接著我們在看 Pod 們有沒有乖乖按照 Deployment 建立

```
kubectl get pods
```

```
NAME                             READY   STATUS    RESTARTS   AGE
my-deployment-5454f687cd-bxjfz   1/1     Running   0          60s
my-deployment-5454f687cd-gszbr   1/1     Running   0          60s
my-deployment-5454f687cd-k6zfv   1/1     Running   0          60s
```

這邊我們可以看到三個 Pod 都被建立好了，我們就成功做到了 Pod 的橫向擴展。而除了 Pod 的橫向擴展外，Deployment 的另外一個好處就是可以幫我們做到無停機的系統升級（Zero Downtime Rollout）。也就是說，當我們要更新我們的 Pod 時，Kubernetes 並不會直接砍掉我們所有的 Pod，而是會建立新的 Pod，等新的 Pod 開始正常運行後，再來取代舊的 Pod。

舉例來說，假設我們現在想要更新我們 Pod 對外的 Port，我們可以先透過指令

```
kubectl edit deployments my-deployment
```

接著我們會看到我們的 Yaml 檔

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  annotations:
    deployment.kubernetes.io/revision: '2'
  creationTimestamp: '2019-04-26T04:18:26Z'
  generation: 2
  labels:
    app: demoApp
  name: my-deployment
  namespace: default
  resourceVersion: '328692'
  selfLink: /apis/extensions/v1beta1/namespaces/default/deployments/my-deployment
  uid: 56608fb5-67da-11e9-933f-08002789461f
spec:
  progressDeadlineSeconds: 600
  replicas: 3
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: demoApp
  strategy:
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 25%
    type: RollingUpdate
  template:
    metadata:
      creationTimestamp: null
      labels:
        app: demoApp
    spec:
      containers:
        - image: hcwxd/kubernetes-demo
          imagePullPolicy: Always
          name: kubernetes-demo-container
          ports:
            - containerPort: 3000
              protocol: TCP
          resources: {}
          terminationMessagePath: /dev/termination-log
          terminationMessagePolicy: File
      dnsPolicy: ClusterFirst
      restartPolicy: Always
      schedulerName: default-scheduler
      securityContext: {}
      terminationGracePeriodSeconds: 30
```

我們把其中 `containerPort: 3000` 改成 `3001` 後儲存，Kubernetes 就會開始幫我們進行更新。這時我們繼續用指令 `kubectl get pods` 就會看到

```
NAME                             READY   STATUS              RESTARTS   AGE
my-deployment-5454f687cd-bxjfz   1/1     Running             0          60s
my-deployment-5454f687cd-gszbr   1/1     Terminating         0          60s
my-deployment-5454f687cd-k6zfv   1/1     Running             0          60s
my-deployment-78dc8dcb89-59272   0/1     ContainerCreating   0          1s
my-deployment-78dc8dcb89-dwtls   1/1     Running             0          5s
```

從上面可以看到，Kubernetes 會永遠保持有 3 個 Pods 在正常運作，如果有新的 Pod 還在 `ContainerCreating` 的階段時，他還不會關掉對應要被取代的 Pod。而在過一段時間我們輸入同樣指令可以看到

```
NAME                             READY   STATUS        RESTARTS   AGE
my-deployment-5454f687cd-bxjfz   1/1     Terminating   0          60s
my-deployment-5454f687cd-gszbr   1/1     Terminating   0          60s
my-deployment-5454f687cd-k6zfv   1/1     Terminating   0          60s
my-deployment-78dc8dcb89-59272   1/1     Running       0          11s
my-deployment-78dc8dcb89-7b7hg   1/1     Running       0          7s
my-deployment-78dc8dcb89-dwtls   1/1     Running       0          15s
```

我們三個新的 Pod 都被成功部署上去用來取代舊的 Pod 了，靠著這樣的機制，我們就可以確保系統在更新的時候不會有服務暫時無法使用的狀況。這時我們可以透過指令

```
kubectl rollout history deployment my-deployment
```

看到我們目前更改過的版本

```
deployment.extensions/my-deployment
REVISION  CHANGE-CAUSE
1         <none>
2         <none>
```

從上面可以看出來，我們目前有兩個版本，如果我們發現版本 2 的程式有問題，想要先讓服務先恢復成版本 1 的程式（Rollback）時，我們還可以透過指令

```
kubectl rollout undo deploy my-deployment
```

讓我們的 Pod 都恢復成版本 1。甚至之後如果版本變的較多後，我們也可以指定要 Rollback 到的版本

```
kubectl rollout undo deploy my-deployment --to-revision=2
```

### Ingress

了解完了 Service 跟 Deployment 後，接下來就輪到概念稍微複雜的 Ingress 元件了。 在上面有提到 Service 就是 Kubernetes 中用來定義「一群 Pod 要如何被連線及存取」的元件。 但在 Service 中，我們是將每個 Service 元件對外的 port number 跟 Node 上的 port number 做 mapping，這樣在我們的 Service 變多時，port number 以及分流規則的管理變得相當困難。

而 Ingress 可以透過 HTTP/HTTPS，在我們眾多的 Service 前搭建一個 reverse-proxy。這樣 Ingress 可以幫助我們統一一個對外的 port number，並且根據 hostname 或是 pathname 決定封包要轉發到哪個 Service 上，如同下圖的比較：

![K8s-Overview](https://github.com/HcwXd/kubernetes-tutorial/blob/master/src/Ingress-concept.jpeg?raw=true)在 Kubernetes 中，Ingress 這項服務其實是由 Ingress Resources、Ingress Server、Ingress Controller 構成。其中 Ingress Resources 就是定義 Ingress 的身分證，而 Ingress Server 則是實體化用來接收 HTTP/HTTPS 連線的網路伺服器。但實際上，Ingress Server 有各式各樣的實作，就如同市面上的 Web Server 琳瑯滿目一樣。因此，Ingress Controller 就是一個可以把定義好的 Ingress Resources 設定轉換成特定 Ingress Server 實作的角色。

舉例來說，Kubernetes 由官方維護的兩種 Ingress Controller 就有 [ingress-gce](https://github.com/kubernetes/ingress-gce/blob/master/README.md) 跟 [ingress-nginx](https://github.com/kubernetes/ingress-nginx/blob/master/README.md)，分別可以對應轉換成 GCE 與 Nginx。也有其他非官方在維護的 Controller，詳細的列表可見官網的 [additional-controllers](https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/#additional-controllers)。

接下來我們要來試著建立一個 Ingress 物件去根據 hostname 轉發封包到不同的 Pod 上面。所以第一步，我們要用 Deployment 建立好幾個不同的 Pod。在這邊我們直接透過準備好的兩個 Image 來建立其中的 Container，blue-whale 這個 Image 裡的程式會監聽 3000 port 然後在瀏覽器上被存取時會吐出藍色的鯨魚，purple-whale 則會吐出紫色的鯨魚。

`deployment.yaml`

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: blue-nginx
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: blue-nginx
    spec:
      containers:
        - name: nginx
          image: hcwxd/blue-whale
          ports:
            - containerPort: 3000

---

apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: purple-nginx
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: purple-nginx
    spec:
      containers:
        - name: nginx
          image: hcwxd/purple-whale
          ports:
            - containerPort: 3000
、
```

接著我們就可以透過 `kubectl create -f deployment.yaml` 建立好我們的 Pod。

```
AME                           READY   STATUS    RESTARTS   AGE
blue-nginx-6b68c797c7-28tkz    1/1     Running   0         60s
blue-nginx-6b68c797c7-8ww8l    1/1     Running   0         60s
purple-nginx-84854fd7c-8g4nl   1/1     Running   0         60s
purple-nginx-84854fd7c-tmrbs   1/1     Running   0         60s
```

建立好了 Pod 們後，接下來我們就要建立這些 Pod 對外的各自 Service，在這邊可以透過上面的圖來複習各自的關係。在這邊我們會把各至 Container 上的 3000 port 全部都轉到 80 port 上。

`service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: blue-service
spec:
  type: NodePort
  selector:
    app: blue-nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000

---
apiVersion: v1
kind: Service
metadata:
  name: purple-service
spec:
  type: NodePort
  selector:
    app: purple-nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
```

透過 `kubectl create -f service.yaml` 建立好我們的 Pod。

```
NAME             TYPE        CLUSTER-IP       EXTERNAL-IP   PORT(S)        AGE
blue-service     NodePort    10.111.192.164   <none>        80:30492/TCP   60s
purple-service   NodePort    10.107.21.77     <none>        80:32086/TCP   60s
```

最後，我們就可以來建立我們的主角 Ingress 了！在這邊我們的 Ingress 只有很簡單的規則，他會把所有發送到 `blue.demo.com` 的封包交給 service `blue-service` 負責，而根據上面 `service.yaml` 的定義，他會再轉交給 `blue-nginx` 這個 Pod。而發送給 `purple.demo.com` 則會轉交給 `purple-nginx`。

在這邊，我們要先記得使用指令 `minikube addons enable ingress` 來讓啟用 minikube 的 ingress 功能。接著，我們就來撰寫 ingress 的身分證。

`ingress.yaml`

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: web
spec:
  rules:
    - host: blue.demo.com
      http:
        paths:
          - backend:
              serviceName: blue-service
              servicePort: 80
    - host: purple.demo.com
      http:
        paths:
          - backend:
              serviceName: purple-service
              servicePort: 80
```

我們一樣透過 `kubectl create -f ingress.yaml` 來建立我們的 ingress 物件。並使用 `kubectl get ingress` 來查看我們的 ingress 狀況：

```
NAME   HOSTS                           ADDRESS     PORTS   AGE
web    blue.demo.com,purple.demo.com   10.0.2.15   80      60s
```

接下來我們要來測試 ingress 有沒有乖乖幫我們轉發。因為我們的 Cluster 實際上對外的 ip 都是我們透過指令 `minikube ip` 會看到的 `192.168.99.100`，這樣我們要怎麼同時讓這個 ip 可以是我們設定規則中的 `blue.demo.com` 以及 `purple.demo.com` 呢？

因為我們知道在 DNS 解析網址時，會先查找本機上 `/etc/hosts` 後才會到其他 DNS Server 上尋找。所以我們可以透過一個小技巧，在本機上把 `blue.demo.com` 以及 `purple.demo.com` 都指向 `192.168.99.100`。透過指令

```
echo 192.168.99.100   blue.demo.com  >> /etc/hosts
echo 192.168.99.100   purple.demo.com >> /etc/hosts
```

或是透過 `sudo vim /etc/hosts` 手動加上這兩條規則，我們就成功搞定 DNS 可以來測試了。接下來我們打開瀏覽器，輸入 `blue.demo.com` 就可以得到熟悉的藍色小鯨魚

![blue-whale-screenshot](https://github.com/HcwXd/kubernetes-tutorial/blob/master/src/blue-whale-screenshot.png?raw=true)

然後輸入 `purple.demo.com` 就可以得到紫色小鯨魚囉！

![purple-whale-screenshot](https://github.com/HcwXd/kubernetes-tutorial/blob/master/src/purple-whale-screenshot.png?raw=true)

## Helm

在上面我們介紹了多個 Kubernetes 的元件與他們所對應到的 `yaml` 設定檔。但假設我們今天有一個複雜的服務，裡面同時包含了很多種設定檔時，如何同時做好版本控制、管理、更新這些設定檔就變得不太容易。且要快速部署這個含有多個設定檔的服務也變得困難。因此 Helm 就是一個用來解決上述問題的工具。

簡單來說，Helm 就是一個管理設定檔的工具。他會把 Kubernetes 一個服務中各種元件裡的 `yaml` 檔統一打包成一個叫做 `chart` 的集合，然後透過給參數的方式，去同時管理與設定這些 `yaml` 檔案。

### 使用一個現有 Helm Chart

接下來我們要來示範用一個現有的 Helm Chart 來嘗試部署一個 wordpress 的服務。首先，我們的第一步當然就是要下載 Helm。MacOS 中我們可以直接使用 `Homebrew` 安裝，其他環境可以參考 [Helm 的 Github](https://github.com/helm/helm#install)。

```
brew install kubernetes-helm
```

下載完後，我們記得要 Helm 把 Cluster 配置初始化

```
helm init
```

接下來讓我們安裝 Wordpress 的 [Chart](https://github.com/helm/charts/tree/master/stable/wordpress)，我們可以直接透過指令

```
helm install stable/wordpress
```

這個指令會讓我們直接到 Chart Repository 去載入 Chart 檔並將它部署到我們的 Kubernetes Cluster 上，我們現在可以透過指令檢查我們的 Cluster

```
kubectl get all
```

```
NAME                                          READY   STATUS    RESTARTS   AGE
pod/peddling-hog-mariadb-0                    1/1     Running   0          60s
pod/peddling-hog-wordpress-7bf6d69c8b-b5flx   1/1     Running   1          60s

NAME                             TYPE           CLUSTER-IP       EXTERNAL-IP   PORT(S)                      AGE
service/peddling-hog-mariadb     ClusterIP      10.109.96.113    <none>        3306/TCP                     60s
service/peddling-hog-wordpress   LoadBalancer   10.101.157.184   <pending>     80:30439/TCP,443:31824/TCP   60s

NAME                                     READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/peddling-hog-wordpress   1/1     1            1           60s

NAME                                                DESIRED   CURRENT   READY   AGE
replicaset.apps/peddling-hog-wordpress-7bf6d69c8b   1         1         1       60s

NAME                                    READY   AGE
statefulset.apps/peddling-hog-mariadb   1/1     60s
```

可以看到我們透過 Chart 一次就安裝與部署了兩個 Pod、兩個 Service 以及其他各種元件。如果要一次把所有 Chart 所安裝的元件刪除，我們可以先透過 `helm list` 列出我們所有的 Chart。

```
NAME        	REVISION	UPDATED                 	STATUS  	CHART
peddling-hog	1       	Fri Apr 26 16:08:30 2019	DEPLOYED	wordpress-5.9.0
```

然後輸入 `helm delete peddling-hog` 就可以一次把所有元件刪除。

### Chart 的運作方式

嘗試完從 Chart 部署元件後，我們可以進一步來暸解 Chart 是如何運作的。我們可以到 Wordpress chart 的 [Github](https://github.com/helm/charts/tree/master/stable/wordpress) 上觀察這個 Chart 的檔案結構，或是透過指令來建立一個最簡單的 Chart

```
helm create helm-demo
```

接下來我們來看看 `./helm-demo` 的資料夾

```
.
├── Chart.yaml
├── charts
├── templates
│   ├── deployment.yaml
│   ├── ingress.yaml
│   ├── service.yaml
└── values.yaml
```

把這個 Chart 的檔案結構化簡後就如上所見。

- `Chart.yaml`
  定義了這個 Chart 的 Metadata，包括 Chart 的版本、名稱、敘述等

- `charts`

  在這個資料夾裡可以放其他的 Chart，這裡稱作 SubCharts

- `templates`
  定義這個 Chart 服務需要的 Kubernetes 元件。但我們並不會把各元件的參數寫死在裡面，而是會用參數的方式代入

- `values.yaml`
  定義這個 Chart 的所有參數，這些參數都會被代入在 templates 中的元件。例如我們會在這邊定義 `nodePorts` 給 `service.yaml` 、定義 `replicaCount` 給 `deployment.yaml`、定義 `hosts` 給 `ingress.yaml` 等等

從上面的檔案結構可以看到，我們透過編輯 `values.yaml`，就可以對所有的 `yaml` 設定檔做到版本控制與管理。並透過 install / delete 的方式一鍵部署 / 刪除。

### 如何建立自己的 Chart

了解了 Chart 大致上是如何運作後，我們就可以來實際建立一個簡單的 Chart。我們的目標是要透過 `deployment`、`service`、`ingress` 來讓使用者在輸入 `blue.demo.com` 時可以得到一隻小鯨魚。而首先，我們一樣輸入指令

```
helm create helm-demo
```

之後我們就先借看一下在 `ingress` 章節有使用過的 `yaml` 檔們。

`deployment.yaml`

```yaml
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  name: blue-nginx
spec:
  replicas: 2
  template:
    metadata:
      labels:
        app: blue-nginx
    spec:
      containers:
        - name: nginx
          image: hcwxd/blue-whale
          ports:
            - containerPort: 3000
```

`service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: blue-service
spec:
  type: NodePort
  selector:
    app: blue-nginx
  ports:
    - protocol: TCP
      port: 80
      targetPort: 3000
```

`ingress.yaml`

```yaml
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: web
spec:
  rules:
    - host: blue.demo.com
      http:
        paths:
          - backend:
              serviceName: blue-service
              servicePort: 80
```

然後我們就可以嘗試來把上述 `yaml` 檔中可以作為參數的部分抽取出來，在這邊為了降低複雜度，我們只簡單挑幾個參數出來，然後我們就可以把這些參數寫到 `values.yaml` 中。

`values.yaml`

```yaml
replicaCount: 2

image:
  repository: hcwxd/blue-whale

service:
  type: NodePort
  port: 80

ingress:
  enabled: true

  hosts:
    - host: blue.demo.com
      paths: [/]
```

把參數提取出來後，我們就來依樣畫葫蘆地把 `template` 中其他三個 `yaml` 檔寫成可以接受參數的方式：

`deployment.yaml`

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: { { include "value-helm-demo.fullname" . } }
spec:
  replicas: { { .Values.replicaCount } }
  selector:
    matchLabels:
      app: { { include "value-helm-demo.fullname" . } }
  template:
    metadata:
      labels:
        app: { { include "value-helm-demo.fullname" . } }
    spec:
      containers:
        - name: { { .Chart.Name } }
          image: '{{ .Values.image.repository }}'
          ports:
            - containerPort: 3000
```

`service.yaml`

```yaml
apiVersion: v1
kind: Service
metadata:
  name: { { include "value-helm-demo.fullname" . } }
spec:
  type: { { .Values.service.type } }
  ports:
    - port: { { .Values.service.port } }
      targetPort: 3000
      protocol: TCP
  selector:
    app: { { include "value-helm-demo.fullname" . } }
```

`ingress.yaml`

```yaml
{{- if .Values.ingress.enabled -}}
{{- $fullName := include "value-helm-demo.fullname" . -}}
apiVersion: extensions/v1beta1
kind: Ingress
metadata:
  name: {{ $fullName }}
spec:
  rules:
  {{- range .Values.ingress.hosts }}
    - host: {{ .host | quote }}
      http:
        paths:
        {{- range .paths }}
          - backend:
              serviceName: {{ $fullName }}
              servicePort: 80
        {{- end }}
  {{- end }}
{{- end }}
```

寫好後，我們就可以來一鍵部署我們的這三份檔案囉。我們可以直接在 `/helm-demo` 資料夾下輸入指令

```
helm install .
```

```
NAME:   gilded-peacock
LAST DEPLOYED: Mon May  6 16:31:27 2019
NAMESPACE: default
STATUS: DEPLOYED

RESOURCES:
==> v1/Deployment
NAME                      READY  UP-TO-DATE  AVAILABLE  AGE
gilded-peacock-helm-demo  0/2    2           0          0s

==> v1/Pod(related)
NAME                                       READY  STATUS             RESTARTS  AGE
gilded-peacock-helm-demo-5fc5964759-thcbz  0/1    ContainerCreating  0         0s
gilded-peacock-helm-demo-5fc5964759-wrb2w  0/1    ContainerCreating  0         0s

==> v1/Service
NAME                      TYPE      CLUSTER-IP     EXTERNAL-IP  PORT(S)       AGE
gilded-peacock-helm-demo  NodePort  10.106.164.53  <none>       80:30333/TCP  0s

==> v1beta1/Ingress
NAME                      HOSTS          ADDRESS  PORTS  AGE
gilded-peacock-helm-demo  blue.demo.com  80       0s


NOTES:
1. Get the application URL by running these commands:
  http://blue.demo.com/
```

部署成功後顯示的 `NAME: gilded-peacock` 就是這個 Chart 部署後的名稱囉（在 Helm 中稱為 `release`）。我們可以再透過指令

```
helm list
```

列出我們目前所有的 `releases`。接下來我們可以用 `kubectl get all` 來看到我們目前的 kubernetes 狀況

```
NAME                                            READY   STATUS    RESTARTS   AGE
pod/gilded-peacock-helm-demo-5fc5964759-thcbz   1/1     Running   0          8m51s
pod/gilded-peacock-helm-demo-5fc5964759-wrb2w   1/1     Running   0          8m51s

NAME                               TYPE        CLUSTER-IP      EXTERNAL-IP   PORT(S)        AGE
service/gilded-peacock-helm-demo   NodePort    10.106.164.53   <none>        80:30333/TCP   8m51s

NAME                                       READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/gilded-peacock-helm-demo   2/2     2            2           8m51s

NAME                                                  DESIRED   CURRENT   READY   AGE
replicaset.apps/gilded-peacock-helm-demo-5fc5964759   2         2         2       8m51s
```

這邊就可以看到我們所指定的資源都有按照 chart 的配置建立起來囉，所以打開 `blue.demo.com` 就可以看到一隻我們透過 Helm 實際部署出的小鯨魚。

而其他常用的 Helm 指令還有：

```
helm delete --purge RELEASE_NAME
```

刪除一個 release（`--purge` 這個 flag 可以把該 `RELEASE_NAME` 釋放出來讓之後可以重複使用）。

```
helm upgrade RELEASE_NAME CHART_PATH
```

如果有更新 Chart 的檔案時，可以透過 upgrade 去更新他對應的 Release。

```
helm lint CHART_PATH
```

檢查你的 Chart 檔案有沒有錯誤的語法。

```
helm package CHART_PATH
```

打包並壓縮整個 Chart 資料夾的檔案。

## kubectl 額外補充

### 簡寫

覺得每次下指令都要打 `kubectl` 很花時間的話，可以透過 alias 來節省時間，例如設定 `alias kbs=kubectl` 。

kubectl 中的各項資源的名稱其實也都有內建的簡寫，可以透過指令

```
kubectl api-resources
```

去看到各個資源的簡寫，例如 deployments 可以簡寫成 `deploy`、services 簡寫成 `svc` 等。

### auto-complete

覺得 kubectl 的指令都沒有 auto-complete 的話可以參考[官網](https://kubernetes.io/docs/reference/kubectl/cheatsheet/#kubectl-autocomplete)的教學。像是如果使用 zsh 的話，就可以透過指令

```
echo "if [ $commands[kubectl] ]; then source <(kubectl completion zsh); fi" >> ~/.zshrc
```

來啟用 kubectl 的 auto-complete

### create vs apply

在之前提到透過 `yaml` 建立資源時，我們都用了 `kubectl create -f`。但其實也可以使用 `kubectl apply -f` 達成建立與更新資源，雖然在單純建立的使用情景上沒有差別，但其它用法上的差別可見 [kubectl apply vs kubectl create](https://stackoverflow.com/questions/47369351/kubectl-apply-vs-kubectl-create)。
