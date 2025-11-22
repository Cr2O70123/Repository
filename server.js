const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

// 設定 CORS 允許跨域連線 (讓手機 APP 或不同網域可以連)
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 如果直接訪問網址，回傳 index.html (讓你可以直接在瀏覽器玩)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

let waitingSocket = null; // 正在等待配對的玩家

io.on('connection', (socket) => {
    console.log('玩家連線:', socket.id);

    // 1. 配對邏輯
    socket.on('find_match', () => {
        if (waitingSocket && waitingSocket.id !== socket.id) {
            // 配對成功
            const roomID = waitingSocket.id + '#' + socket.id;
            const opponent = waitingSocket;

            socket.join(roomID);
            opponent.join(roomID);

            // 通知雙方遊戲開始
            // player1 (房主)
            io.to(opponent.id).emit('game_start', { 
                roomID: roomID, 
                role: 'host' // 房主
            });
            // player2 (挑戰者)
            io.to(socket.id).emit('game_start', { 
                roomID: roomID, 
                role: 'guest' // 客人
            });

            console.log(`配對成功: ${roomID}`);
            waitingSocket = null; // 清空等待區
        } else {
            // 無人等待，自己加入等待區
            waitingSocket = socket;
            socket.emit('waiting', '正在搜尋對手...');
        }
    });

    // 2. 戰鬥指令轉發
    socket.on('action', (data) => {
        // data 包含: { type: 'spawn'|'emote', ...內容 }
        // 轉發給同房間的其他人 (broadcast)
        socket.to(data.roomID).emit('remote_action', data);
    });

    // 3. 斷線處理
    socket.on('disconnect', () => {
        console.log('玩家斷線:', socket.id);
        if (waitingSocket === socket) {
            waitingSocket = null;
        }
        // 通知房間內另一人對方已斷線 (這裡簡化處理，實際可做判定勝利)
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`伺服器運行於 Port: ${PORT}`);
});