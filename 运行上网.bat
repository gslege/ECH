@echo off
title ech-workers Client

cd d:\Worker\ech\ECH.exe
   ech.exe^
  -f 部署域名:443^
  -l 127.0.0.1:8080^
  -pyip proxyip.cmliussss.net^
  -token ECH^
  -ip www.shopify.com

pause

