const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// 設定靜態檔案
app.use(express.static(path.join(__dirname, 'public')));

// --- 簡易資料庫系統 ---
const DB_PATH = path.join(__dirname, 'data', 'db.json');
// 確保 data 資料夾存在
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));

// 讀取數據
let database = { users: {} };
if (fs.existsSync(DB_PATH)) {
    try { database = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch (e) { console.log("DB讀取錯誤，重置"); }
}

// 存檔函數
function saveDB() {
    fs.writeFileSync(DB_PATH, JSON.stringify(database, null, 2));
}

// 獲取或創建用戶
function getUser(username) {
    if (!database.users[username]) {
        database.users[username] = {
            name: username,
            gold: 1000,
            wins: 0,
            loss: 0,
            inventory: ['knight', 'archer', 'giant', 'fireball', 'musketeer', 'bats'], // 初始卡牌
            deck: ['knight', 'archer', 'giant', 'fireball', 'musketeer', 'bats']
        };
        saveDB();
    }
    return database.users[username];
}

// --- 路由 ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Socket.io 邏輯 ---
let waitingSocket = null;

io.on('connection', (socket) => {
    let currentUser = null;

    // 1. 登入 (獲取數據)
    socket.on('login', (username) => {
        if(!username) return;
        currentUser = getUser(username);
        socket.emit('user_data', currentUser);
        updateLeaderboard(socket); // 發送排行榜
    });

    // 2. 購買卡牌
    socket.on('buy_card', (cardId, price) => {
        if (!currentUser) return;
        const user = database.users[currentUser.name];
        
        if (user.gold >= price && !user.inventory.includes(cardId)) {
            user.gold -= price;
            user.inventory.push(cardId);
            saveDB();
            socket.emit('user_data', user); // 更新前端
            socket.emit('msg', `購買成功！剩下 ${user.gold} 金幣`);
        } else {
            socket.emit('msg', '金幣不足或已擁有該卡牌');
        }
    });

    // 3. 更新牌組
    socket.on('update_deck', (newDeck) => {
        if (!currentUser) return;
        if (newDeck.length === 6) {
            database.users[currentUser.name].deck = newDeck;
            saveDB();
            socket.emit('user_data', database.users[currentUser.name]);
        }
    });

    // 4. 配對邏輯
    socket.on('find_match', () => {
        if (!currentUser) return;
        if (waitingSocket && waitingSocket.id === socket.id) return;

        if (waitingSocket) {
            const roomID = waitingSocket.id + '#' + socket.id;
            const opponent = waitingSocket;
            waitingSocket = null;

            socket.join(roomID);
            opponent.join(roomID);

            // 分配對手資訊
            const p1Data = database.users[socket.currentUser?.name];
            const p2Data = database.users[opponent.currentUser?.name];

            io.to(opponent.id).emit('game_start', { roomID, role: 'host', enemyName: p1Data?.name || "對手" });
            io.to(socket.id).emit('game_start', { roomID, role: 'guest', enemyName: p2Data?.name || "對手" });

            console.log(`配對成功: ${roomID}`);
        } else {
            waitingSocket = socket;
            socket.currentUser = currentUser; // 暫存一下以便配對時讀取名字
            socket.emit('waiting', '正在尋找對手...');
        }
    });

    // 5. 遊戲動作轉發
    socket.on('action', (data) => {
        if (data.roomID) socket.to(data.roomID).emit('remote_action', data);
    });

    // 6. 遊戲結算 (更新戰績與金幣)
    socket.on('game_result', (result) => {
        if (!currentUser) return;
        const user = database.users[currentUser.name];
        if (result === 'win') {
            user.wins += 1;
            user.gold += 100; // 勝場獎勵
        } else {
            user.loss += 1;
            user.gold += 20;  // 敗場獎勵
        }
        saveDB();
        socket.emit('user_data', user);
        updateLeaderboard(io); // 廣播更新後的排行榜給所有人
    });

    socket.on('disconnect', () => {
        if (waitingSocket === socket) waitingSocket = null;
    });
});

// 輔助：發送排行榜
function updateLeaderboard(target) {
    const sorted = Object.values(database.users)
        .sort((a, b) => b.wins - a.wins) // 依勝場排序
        .slice(0, 10) // 取前10名
        .map(u => ({ name: u.name, wins: u.wins, rate: Math.round((u.wins/(u.wins+u.loss||1))*100) }));
    
    target.emit('leaderboard_data', sorted);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));