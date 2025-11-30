import { connect } from 'cloudflare:sockets';

const TOKEN = 'gslege';
const encoder = new TextEncoder();

export default {
    async fetch(request) {
        try {
            const upgradeHeader = request.headers.get('Upgrade');
            if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
                return new URL(request.url).pathname === '/'
                    ? new Response('WebSocket Proxy Server', { status: 200 })
                    : new Response('Expected WebSocket', { status: 426 });
            }
            if (TOKEN && request.headers.get('Sec-WebSocket-Protocol') !== TOKEN) {
                return new Response('Unauthorized', { status: 401 });
            }
            const [client, server] = Object.values(new WebSocketPair());
            server.accept();
            handleSession(server).catch(() => safeCloseWebSocket(server));
            const responseInit = {
                status: 101,
                webSocket: client
            };
            if (TOKEN) {
                responseInit.headers = { 'Sec-WebSocket-Protocol': TOKEN };
            }
            return new Response(null, responseInit);
        } catch (err) {
            return new Response(err.toString(), { status: 500 });
        }
    },
};

async function handleSession(webSocket) {
    let remoteSocket, remoteWriter, remoteReader;
    let isClosed = false;
    const cleanup = () => {
        if (isClosed) return;
        isClosed = true;
        try { remoteWriter?.releaseLock(); } catch { }
        try { remoteReader?.releaseLock(); } catch { }
        try { remoteSocket?.close(); } catch { }
        remoteWriter = remoteReader = remoteSocket = null;
        safeCloseWebSocket(webSocket);
    };
    const pumpRemoteToWebSocket = async () => {
        try {
            while (!isClosed && remoteReader) {
                const { done, value } = await remoteReader.read();
                if (done) break;
                if (webSocket.readyState !== 1) break;
                if (value?.byteLength > 0) webSocket.send(value);
            }
        } catch { }

        if (!isClosed) {
            try { webSocket.send('CLOSE'); } catch { }
            cleanup();
        }
    };
    const parseAddress = (addr) => {
        if (addr[0] === '[') {
            const end = addr.indexOf(']');
            return {
                host: addr.substring(1, end),
                port: parseInt(addr.substring(end + 2), 10)
            };
        }
        const sep = addr.lastIndexOf(':');
        return {
            host: addr.substring(0, sep),
            port: parseInt(addr.substring(sep + 1), 10)
        };
    };
    const isCFError = (err) => {
        const msg = err?.message?.toLowerCase() || '';
        return msg.includes('proxy request') ||
            msg.includes('cannot connect') ||
            msg.includes('cloudflare');
    };
    const connectToRemote = async (targetAddr, firstFrameData, proxyIP) => {
        const original = parseAddress(targetAddr);
        
        // 构建回退 IP 列表
        const fallbackIPs = [];
        if (proxyIP) {
            // 如果客户端提供了代理 IP，添加到回退列表
            fallbackIPs.push(proxyIP);
        }
        
        const attempts = [null, ...fallbackIPs];
        
        for (let i = 0; i < attempts.length; i++) {
            let attemptHost = original.host;
            let attemptPort = original.port;
            
            if (attempts[i] !== null) {
                const fallback = attempts[i];
                try {
                    const parsed = parseAddress(fallback);
                    if (!isNaN(parsed.port)) {
                        attemptHost = parsed.host;
                        attemptPort = parsed.port;
                    } else {
                        attemptHost = fallback;
                        attemptPort = 443;
                    }
                } catch {
                    attemptHost = fallback;
                    attemptPort = 443;
                }
            }
            
            try {
                remoteSocket = connect({
                    hostname: attemptHost,
                    port: attemptPort
                });
                if (remoteSocket.opened) await remoteSocket.opened;
                remoteWriter = remoteSocket.writable.getWriter();
                remoteReader = remoteSocket.readable.getReader();
                if (firstFrameData) {
                    await remoteWriter.write(encoder.encode(firstFrameData));
                }
                webSocket.send('CONNECTED');
                pumpRemoteToWebSocket();
                return;
            } catch (err) {
                try { remoteWriter?.releaseLock(); } catch { }
                try { remoteReader?.releaseLock(); } catch { }
                try { remoteSocket?.close(); } catch { }
                remoteWriter = remoteReader = remoteSocket = null;
                if (!isCFError(err) || i === attempts.length - 1) {
                    throw err;
                }
            }
        }
    };
    webSocket.addEventListener('message', async (event) => {
        if (isClosed) return;
        try {
            const data = event.data;
            if (typeof data === 'string') {
                if (data.startsWith('CONNECT:')) {
                    const parts = data.split('|');
                    const targetAddr = parts[0].substring(8); // 去掉 "CONNECT:"
                    const firstFrameData = parts[1] || '';
                    const proxyIP = parts[2] || ''; // 第三个部分是可选的代理 IP
                    
                    await connectToRemote(targetAddr, firstFrameData, proxyIP);
                }
                else if (data.startsWith('DATA:')) {
                    if (remoteWriter) {
                        await remoteWriter.write(encoder.encode(data.substring(5)));
                    }
                }
                else if (data === 'CLOSE') {
                    cleanup();
                }
            }
            else if (data instanceof ArrayBuffer && remoteWriter) {
                await remoteWriter.write(new Uint8Array(data));
            }
        } catch (err) {
            try { webSocket.send('ERROR:' + err.message); } catch { }
            cleanup();
        }
    });
    webSocket.addEventListener('close', cleanup);
    webSocket.addEventListener('error', cleanup);
}

function safeCloseWebSocket(ws) {
    try {
        if (ws.readyState === 1 || ws.readyState === 2) {
            ws.close(1000, 'Server closed');
        }
    } catch { }
}