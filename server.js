const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

// --- 修正點 1: 設定靜態檔案目錄 ---
// 告訴 Express：所有的 CSS, JS, HTML 都在 'public' 資料夾裡面找
app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- 修正點 2: 首頁路徑指向 public/index.html ---
app.get('/', (req, res) => {
    // 原本你是寫 path.join(__dirname, 'index.html') -> 這是錯的
    // 正確要指向 public 資料夾
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ... (原本的 Socket.io 邏輯保持不變) ...

// 配對隊列
let waitingSocket = null;

io.on('connection', (socket) => {
    console.log('新玩家連線:', socket.id);

    socket.on('find_match', () => {
        if (waitingSocket && waitingSocket.id === socket.id) return;

        if (waitingSocket) {
            const roomID = waitingSocket.id + '#' + socket.id;
            const opponent = waitingSocket;

            socket.join(roomID);
            opponent.join(roomID);

            io.to(opponent.id).emit('game_start', { roomID: roomID, role: 'host' });
            io.to(socket.id).emit('game_start', { roomID: roomID, role: 'guest' });

            console.log(`配對成功! 房間: ${roomID}`);
            waitingSocket = null;
        } else {
            waitingSocket = socket;
            socket.emit('waiting', '正在尋找對手...');
            console.log('玩家加入等待隊列:', socket.id);
        }
    });

    socket.on('action', (data) => {
        if (!data.roomID) return;
        socket.to(data.roomID).emit('remote_action', data);
    });

    socket.on('disconnect', () => {
        console.log('玩家斷線:', socket.id);
        if (waitingSocket === socket) {
            waitingSocket = null;
        }
    });
    
    socket.on('disconnecting', () => {
        const rooms = socket.rooms;
        rooms.forEach((room) => {
            if (room !== socket.id) {
                socket.to(room).emit('opponent_left');
            }
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`伺服器運行中 Port: ${PORT}`);
});
                                     
