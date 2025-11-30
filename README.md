  <b>简单教程：1，部署_worker.js到Cloudflare上，2，修改系统代理127.0.0.1,及端口8080，3，修改运行上网.bat文件内代码路径或其它参数，4执行运行上网.bat文件即可上网</b>
  
命令行执行如下：

ech-win -l 127.0.0.1:8080 -f cf绑定域名[pages.dev]:443 -pyip tw.william.us.ci -token ECH -ip 优选域名或者ip(ipv4或ipv6)

ech-win -f cf绑定域名:443 -pyip tw.william.us.ci -token ECH -ip 104.16.0.0

ech-win -f cf绑定域名:443 -pyip 211.48.77.114:12312 -token ECH -ip 104.16.0.0


Usage of ech-win:

  -dns string
  
        ECH 查询 DNS 服务器 (default "119.29.29.29:53")
        
  -ech string
  
        ECH 查询域名 (default "cloudflare-ech.com")
        
  -f string
  
        服务端地址 (格式: x.x.workers.dev:443)
        
  -ip string
  
        指定服务端 IP（绕过 DNS 解析）
        
  -l string
  
        代理监听地址 (支持 SOCKS5 和 HTTP) (default "127.0.0.1:30000")
        
  -pyip string
  
        代理服务器 IP（用于 Worker 连接回退）
        
  -token string
  
        身份验证令牌
