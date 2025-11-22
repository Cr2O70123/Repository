const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 設定靜態檔案資料夾
app.use(express.static(path.join(__dirname, 'public')));

let waitingSocket = null;

io.on('connection', (socket) => {
    console.log('玩家連線:', socket.id);

    socket.on('find_match', () => {
        if (waitingSocket && waitingSocket.id !== socket.id) {
            const roomID = waitingSocket.id + '#' + socket.id;
            const opponent = waitingSocket;
            
            socket.join(roomID);
            opponent.join(roomID);

            io.to(opponent.id).emit('game_start', { roomID, role: 'host' });
            io.to(socket.id).emit('game_start', { roomID, role: 'guest' });
            
            waitingSocket = null;
        } else {
            waitingSocket = socket;
            socket.emit('waiting', '正在尋找對手...');
        }
    });

    socket.on('action', (data) => {
        if (data.roomID) socket.to(data.roomID).emit('remote_action', data);
    });

    // 新增：投降功能
    socket.on('surrender', (roomID) => {
        socket.to(roomID).emit('opponent_surrender');
    });

    socket.on('disconnecting', () => {
        if (waitingSocket === socket) waitingSocket = null;
        const rooms = socket.rooms;
        rooms.forEach((room) => {
            if (room !== socket.id) socket.to(room).emit('opponent_left');
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));