# Hạng mục điểm cộng (tên miền, HTTPS, CI/CD)

- reboot lại VM1
  CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES
  65564a7df60b vm1-frontend-frontend "/docker-entrypoint.…" 30 minutes ago Up About a minute 0.0.0.0:80->80/tcp, [::]:80->80/tcp vm1-frontend-frontend-1

- reboot lại VM2
  CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES
  9db2022b4600 vm2-backend-backend "uvicorn app.main:ap…" 28 minutes ago Up 43 seconds (healthy) 0.0.0.0:8000->8000/tcp, [::]:8000->8000/tcp vm2-backend-backend-1 - các luật:
  - các luật:
    -N DOCKER-USER
    -A DOCKER-USER -s 192.168.64.130/32 -i ens33 -p tcp -m tcp --dport 8000 -j ACCEPT
    -A DOCKER-USER -i ens33 -p tcp -m tcp --dport 8000 -j DROP

- reboot lại VM3
  CONTAINER ID IMAGE COMMAND CREATED STATUS PORTS NAMES
  b659ea449d30 postgres:16 "docker-entrypoint.s…" 42 minutes ago Up 52 seconds (healthy) 0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp vm3-db-storage-db-1
  khoa@vm3-database:~$ sudo iptables -S DOCKER-USER
  - các luật:
    -N DOCKER-USER
    -A DOCKER-USER -s 192.168.64.132/32 -i ens33 -p tcp -m tcp --dport 5432 -j ACCEPT
    -A DOCKER-USER -i ens33 -p tcp -m tcp --dport 5432 -j DROP

- Test từ máy ngoài "Test-Connecttion" cổng 8000
  WARNING: TCP connect to (192.168.64.132 : 8000) failed

  ComputerName : 192.168.64.132
  RemoteAddress : 192.168.64.132
  RemotePort : 8000
  InterfaceAlias : VMware Network Adapter VMnet8
  SourceAddress : 192.168.64.1
  PingSucceeded : True
  PingReplyDetails (RTT) : 4 ms
  TcpTestSucceeded : False
  -> Sau khi test, mở lại trình duyệt vẫn đăng nhập hai tài khoản "bao.truong" và "canbo_dk01" vẫn bình thường

- Test từ máy ngoài "Test-Connection" cổng 5432
  WARNING: TCP connect to (192.168.64.132 : 5432) failed

  ComputerName : 192.168.64.132
  RemoteAddress : 192.168.64.132
  RemotePort : 5432
  InterfaceAlias : VMware Network Adapter VMnet8
  SourceAddress : 192.168.64.1
  PingSucceeded : True
  PingReplyDetails (RTT) : 1 ms
  TcpTestSucceeded : False
  -> Sau khi test, mở lại trình duyệt vẫn đăng nhập hai tài khoản "bao.truong" và "canbo_dk01" vẫn bình thường
