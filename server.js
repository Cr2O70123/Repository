const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);

// 允許所有來源連線 (CORS)，這對手機 APP 很重要
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// 讓 Render 可以直接讀取 index.html (如果你是用網頁版測試)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 配對隊列
let waitingSocket = null;

io.on('connection', (socket) => {
    console.log('新玩家連線:', socket.id);

    // --- 1. 配對邏輯 ---
    socket.on('find_match', () => {
        // 如果這個人已經在排隊，不要重複排
        if (waitingSocket && waitingSocket.id === socket.id) return;

        if (waitingSocket) {
            // --- 配對成功 ---
            const roomID = waitingSocket.id + '#' + socket.id;
            const opponent = waitingSocket;

            // 讓兩人加入同一房間
            socket.join(roomID);
            opponent.join(roomID);

            // 通知雙方遊戲開始
            // role: 'host' (通常在左/下), 'guest' (通常在右/上，但在這遊戲中透過座標翻轉解決了)
            io.to(opponent.id).emit('game_start', { roomID: roomID, role: 'host' });
            io.to(socket.id).emit('game_start', { roomID: roomID, role: 'guest' });

            console.log(`配對成功! 房間: ${roomID}`);
            
            // 清空隊列
            waitingSocket = null;
        } else {
            // --- 無人等待，加入隊列 ---
            waitingSocket = socket;
            socket.emit('waiting', '正在尋找對手...');
            console.log('玩家加入等待隊列:', socket.id);
        }
    });

    // --- 2. 遊戲指令轉發 (關鍵) ---
    // HTML 中發送的是 'action'，包含 type: 'spawn' | 'emote' | 'name_sync'
    socket.on('action', (data) => {
        if (!data.roomID) return;

        // 將指令轉發給房間內「除了自己以外」的人
        // 事件名稱轉為 'remote_action' 以便前端區分是「接收到的」
        socket.to(data.roomID).emit('remote_action', data);
    });

    // --- 3. 斷線處理 ---
    socket.on('disconnect', () => {
        console.log('玩家斷線:', socket.id);
        
        // 如果他在排隊中，把他移除
        if (waitingSocket === socket) {
            waitingSocket = null;
        }

        // 通知房間內的人對手離開了 (這會觸發前端的勝利畫面)
        // 這裡需要遍歷 socket 所在的房間通知對手
        // 簡單做法：Socket.io 會自動處理 leave room，
        // 但我們需要手動通知對手「贏了」
        // (進階做法需記錄玩家所在的房間，這裡為了簡單，依賴前端的 socket 斷線偵測或對手邏輯)
        
        // 這裡發送一個廣播給他所在的房間(如果還在裡面的話)
        // 注意：disconnect 時 socket 已經離開房間，所以這段通常要在 disconnecting 處理
        // 但為了簡單，我們依賴前端的 io 連線錯誤處理，或者在上面 action 邏輯中加入 'leave' 事件
    });
    
    // 補充：更精確的對手斷線通知
    socket.on('disconnecting', () => {
        const rooms = socket.rooms;
        rooms.forEach((room) => {
            // 通知房間裡的其他人
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