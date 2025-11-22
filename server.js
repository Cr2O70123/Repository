const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// --- 簡易資料庫系統 (JSON File) ---
const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = path.join(DATA_DIR, 'db.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

let db = { users: {} };
if (fs.existsSync(DB_PATH)) {
    try { db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); } catch (e) { console.log("DB重置"); }
}

function saveDB() {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// 初始玩家模板
function createUser(name) {
    return {
        name: name,
        gold: 1000,
        wins: 0,
        loss: 0,
        lastLogin: null,
        inventory: ['knight', 'archer', 'giant', 'fireball', 'musketeer', 'bats'],
        deck: ['knight', 'archer', 'giant', 'fireball', 'musketeer', 'bats']
    };
}

// --- Socket 邏輯 ---
let matchQueue = null; // 等待中的玩家 Socket

io.on('connection', (socket) => {
    let currentUser = null;

    // 1. 登入 / 註冊
    socket.on('login', (username) => {
        if (!username) return;
        if (!db.users[username]) {
            db.users[username] = createUser(username);
            saveDB();
        }
        currentUser = db.users[username];
        socket.userData = currentUser; // 綁定到 socket
        socket.emit('login_success', currentUser);
        updateLeaderboard(socket);
    });

    // 2. 購買卡牌
    socket.on('buy_card', ({ cardId, price }) => {
        if (!currentUser) return;
        if (currentUser.inventory.includes(cardId)) return socket.emit('msg', '你已經擁有這張卡了！');
        if (currentUser.gold < price) return socket.emit('msg', '金幣不足！快去對戰賺錢吧。');

        currentUser.gold -= price;
        currentUser.inventory.push(cardId);
        saveDB();
        socket.emit('update_user', currentUser);
        socket.emit('msg', '購買成功！');
    });

    // 3. 保存牌組
    socket.on('save_deck', (newDeck) => {
        if (!currentUser || newDeck.length !== 6) return;
        currentUser.deck = newDeck;
        saveDB();
        socket.emit('update_user', currentUser);
        socket.emit('msg', '牌組已保存');
    });

    // 4. 每日簽到
    socket.on('daily_checkin', () => {
        if (!currentUser) return;
        const today = new Date().toDateString();
        if (currentUser.lastLogin === today) {
            socket.emit('msg', '今天已經簽到過了，明天再來！');
        } else {
            currentUser.lastLogin = today;
            currentUser.gold += 200;
            saveDB();
            socket.emit('update_user', currentUser);
            socket.emit('msg', '簽到成功！獲得 200 金幣');
        }
    });

    // 5. 配對系統
    socket.on('find_match', () => {
        if (!currentUser) return;
        
        // 如果佇列中有別人
        if (matchQueue && matchQueue.id !== socket.id) {
            const opponent = matchQueue;
            matchQueue = null;

            const roomID = socket.id + '#' + opponent.id;
            socket.join(roomID);
            opponent.join(roomID);

            // 開始遊戲：通知雙方 (Host = 紅方/上方, Guest = 藍方/下方)
            // 這裡為了邏輯簡單，前端一律把自己視為 Player (藍)，對方視為 Enemy (紅)
            // 所以我們只要告訴前端「對手名字」即可
            
            io.to(socket.id).emit('match_found', { roomID, role: 'host', enemyName: opponent.userData.name });
            io.to(opponent.id).emit('match_found', { roomID, role: 'guest', enemyName: socket.userData.name });
        } else {
            matchQueue = socket;
            socket.emit('waiting', '正在尋找實力相當的對手...');
        }
    });

    // 6. 遊戲內動作轉發
    socket.on('game_action', (data) => {
        // data 包含: roomID, type (spawn/emote), card, x, y...
        socket.to(data.roomID).emit('remote_action', data);
    });

    // 7. 結算
    socket.on('game_end', (result) => { // result = 'win' | 'loss'
        if (!currentUser) return;
        if (result === 'win') {
            currentUser.wins++;
            currentUser.gold += 50;
        } else {
            currentUser.loss++;
            currentUser.gold += 10;
        }
        saveDB();
        socket.emit('update_user', currentUser);
        updateLeaderboard(io); // 廣播給所有人更新排行榜
    });

    socket.on('disconnect', () => {
        if (matchQueue === socket) matchQueue = null;
    });
});

function updateLeaderboard(target) {
    const list = Object.values(db.users)
        .sort((a, b) => b.wins - a.wins)
        .slice(0, 10)
        .map(u => ({ name: u.name, wins: u.wins, gold: u.gold }));
    target.emit('leaderboard_update', list);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server Running on Port ${PORT}`));