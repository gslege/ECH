<b>简单教程：
  
  1，部署_worker.js到Cloudflare上
  
  2，修改系统代理127.0.0.1,及端口8080
  
  3，修改运行上网.bat文件内代码路径或其它参数，4执行运行上网.bat文件即可上网</b>
  
命令行执行如下：

ech-win -l 127.0.0.1:8080 -f 部署域名:443 -pyip tw.william.us.ci -token ECH -ip 优选域名或者ip(ipv4或ipv6)

ech-win -f 部署域名:443 -pyip tw.william.us.ci -token ECH -ip 104.16.0.0

ech-win -f 部署域名:443 -pyip 211.48.77.114:12312 -token ECH -ip 104.16.0.0
