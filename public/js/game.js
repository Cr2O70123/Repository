// --- 基礎工具類 (音效、向量、特效) ---
const AudioSys = {
    ctx: null,
    init: function() {
        // 防止在 Node.js 環境下報錯
        if (typeof window === 'undefined') return;
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();
    },
    play: function(t) {
        if (!this.ctx) return;
        const e = this.ctx.currentTime,
            n = this.ctx.createOscillator(),
            o = this.ctx.createGain();
        o.connect(this.ctx.destination);
        n.connect(o);
        if (t === "spawn") {
            n.frequency.setValueAtTime(300, e);
            n.frequency.exponentialRampToValueAtTime(50, e + .2);
            o.gain.setValueAtTime(.1, e);
            o.gain.exponentialRampToValueAtTime(.01, e + .2);
            n.start();
            n.stop(e + .2);
        } else if (t === "attack") {
            n.type = "triangle";
            n.frequency.setValueAtTime(150, e);
            n.frequency.linearRampToValueAtTime(100, e + .05);
            o.gain.setValueAtTime(.05, e);
            o.gain.linearRampToValueAtTime(0, e + .05);
            n.start();
            n.stop(e + .05);
        } else if (t === "ui") {
            n.frequency.setValueAtTime(800, e);
            o.gain.setValueAtTime(.05, e);
            o.gain.exponentialRampToValueAtTime(.01, e + .1);
            n.start();
            n.stop(e + .1);
        }
    }
};

class Vector2 {
    constructor(x, y) { this.x = x; this.y = y; }
    add(v) { this.x += v.x; this.y += v.y; return this; }
    sub(v) { this.x -= v.x; this.y -= v.y; return this; }
    mult(n) { this.x *= n; this.y *= n; return this; }
    mag() { return Math.sqrt(this.x * this.x + this.y * this.y); }
    normalize() { let m = this.mag(); if (m > 0) this.mult(1 / m); return this; }
    dist(v) { return Math.hypot(this.x - v.x, this.y - v.y); }
    copy() { return new Vector2(this.x, this.y); }
}

class ParticlePool {
    constructor() { this.pool = []; this.maxSize = 200; }
    get(x, y, color, type, val) {
        let p = this.pool.find(p => !p.active);
        if (!p) {
            if (this.pool.length < this.maxSize) { p = new Particle(); this.pool.push(p); }
            else return null;
        }
        p.reset(x, y, color, type, val);
        return p;
    }
    updateAndDraw(ctx) { this.pool.forEach(p => { if (p.active) { p.update(); p.draw(ctx); } }); }
    clear() { this.pool.forEach(p => p.active = false); }
}

class Particle {
    constructor() { this.active = false; this.pos = new Vector2(0, 0); this.vel = new Vector2(0, 0); }
    reset(x, y, c, t, v) {
        this.active = true; this.pos.x = x; this.pos.y = y; this.type = t; this.color = c; this.life = 1.0;
        if (t === 'text' || t === 'crit') {
            this.text = v + (t === 'crit' ? "!" : "");
            this.scale = t === 'crit' ? 2.5 : Math.min(2, 0.8 + v / 200);
            this.vel = new Vector2((Math.random() - 0.5), t === 'crit' ? -3 : -2.5);
            this.decay = 0.02;
        } else if (t === 'spawn_flash') {
            this.vel = new Vector2(0, 0); this.decay = 0.08; this.size = 10;
        } else if (t === 'emote') {
            this.text = v; this.vel = new Vector2(0, -0.8); this.decay = 0.01; this.life = 2.5;
        } else {
            this.vel = new Vector2((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3);
            this.decay = 0.05; this.size = Math.random() * 4 + 2;
        }
    }
    update() {
        this.pos.add(this.vel); this.life -= this.decay;
        if (this.life <= 0) this.active = false;
        if (this.type === 'spawn_flash') this.size += 2;
    }
    draw(ctx) {
        if (!this.active) return;
        ctx.globalAlpha = Math.max(0, this.life);
        if (this.type === 'text' || this.type === 'crit' || this.type === 'emote') {
            ctx.font = this.type === 'emote' ? "30px sans-serif" : "900 16px sans-serif";
            ctx.fillStyle = this.type === 'emote' ? 'black' : this.color;
            ctx.fillText(this.text, this.pos.x, this.pos.y);
        } else {
            ctx.fillStyle = this.type === 'spawn_flash' ? '#fff' : this.color;
            ctx.beginPath(); ctx.arc(this.pos.x, this.pos.y, this.size, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;
    }
}

// --- App 邏輯 (介面與後端溝通) ---
// 判斷是否在瀏覽器環境，否則不執行 Socket 連線
const socket = (typeof io !== 'undefined') ? io() : null;
let userData = {};
let leaderboard = [];

const App = {
    login() {
        const name = document.getElementById('username').value.trim();
        if (!name) return alert("請輸入暱稱");
        AudioSys.init();
        if (socket) socket.emit('login', name);
    },
    nav(page) {
        AudioSys.play('ui');

        // 強制關閉結算視窗
        const modal = document.getElementById('result-modal');
        if (modal) modal.classList.add('hidden');

        // 切換頁面
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
            p.classList.add('hidden');
        });
        const target = document.getElementById('page-' + page);
        if (target) {
            target.classList.remove('hidden');
            setTimeout(() => target.classList.add('active'), 10);
        }

        // 頁面初始化邏輯
        if (page === 'shop') this.renderShop();
        if (page === 'deck') this.renderDeck();
        if (page === 'leaderboard') this.renderLeaderboard();
        if (page === 'profile') this.renderProfile();
    },
    updateUI(user) {
        userData = user;
        if(document.getElementById('lobby-name')) document.getElementById('lobby-name').innerText = user.name;
        if(document.getElementById('lobby-gold')) document.getElementById('lobby-gold').innerText = user.gold;
        if(document.getElementById('shop-gold')) document.getElementById('shop-gold').innerText = user.gold;
    },
    showSettings() { alert("設定功能即將推出！"); },
    dailyCheckIn() { if (socket) socket.emit('daily_checkin'); },

    // 商店
    renderShop() {
        const list = document.getElementById('shop-list');
        list.innerHTML = '';
        ALL_CARDS_KEYS.forEach(key => {
            const card = CARDS[key];
            const owned = userData.inventory.includes(key);
            const el = document.createElement('div');
            el.className = `shop-card ${owned ? 'owned' : ''}`;
            el.innerHTML = `
                <div class="shop-icon">${card.icon}</div>
                <div class="shop-name">${card.name}</div>
                <div class="shop-price">💰 ${card.price}</div>
                <button class="shop-btn" onclick="App.buy('${key}', ${card.price})">購買</button>
            `;
            list.appendChild(el);
        });
    },
    buy(key, price) { if (socket) socket.emit('buy_card', { cardId: key, price: price }); },

    // 牌組
    renderDeck() {
        const row = document.getElementById('current-deck-row');
        row.innerHTML = '';
        userData.deck.forEach(key => {
            const el = document.createElement('div');
            el.className = 'mini-deck-card';
            el.innerHTML = CARDS[key].icon;
            el.onclick = () => { userData.deck = userData.deck.filter(k => k !== key); this.renderDeck(); };
            row.appendChild(el);
        });

        const col = document.getElementById('deck-collection');
        col.innerHTML = '';
        userData.inventory.forEach(key => {
            if (userData.deck.includes(key)) return;
            const card = CARDS[key];
            const el = document.createElement('div');
            el.className = 'shop-card';
            el.innerHTML = `<div class="shop-icon">${card.icon}</div><div class="shop-name">${card.name}</div>`;
            el.onclick = () => {
                if (userData.deck.length < 6) { userData.deck.push(key); this.renderDeck(); }
            };
            col.appendChild(el);
        });
    },
    saveDeck() { if (socket) socket.emit('save_deck', userData.deck); this.nav('lobby'); },

    // 排行榜與個人
    renderLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        list.innerHTML = '';
        leaderboard.forEach((u, i) => {
            list.innerHTML += `<tr><td class="rank-${i + 1}">#${i + 1}</td><td>${u.name}</td><td>${u.wins}</td><td>${u.gold}</td></tr>`;
        });
    },
    renderProfile() {
        document.getElementById('p-name').innerText = userData.name;
        document.getElementById('p-wins').innerText = userData.wins;
        document.getElementById('p-loss').innerText = userData.loss;
        const total = userData.wins + userData.loss;
        document.getElementById('p-rate').innerText = total > 0 ? Math.round((userData.wins / total) * 100) + "%" : "0%";
    },

    // 對戰
    findMatch() {
        document.getElementById('match-status').innerText = "尋找對手中...";
        if (socket) socket.emit('find_match');
    }
};

// --- Socket Event Listeners ---
if (socket) {
    socket.on('login_success', (user) => { App.updateUI(user); App.nav('lobby'); });
    socket.on('update_user', (user) => App.updateUI(user));
    socket.on('msg', (txt) => alert(txt));
    socket.on('waiting', (msg) => document.getElementById('match-status').innerText = msg);
    socket.on('leaderboard_update', (data) => leaderboard = data);
    socket.on('match_found', (data) => {
        App.nav('game');
        Game.initAndStart(data.roomID, data.enemyName, userData.deck);
    });
    socket.on('remote_action', (data) => {
        if (data.type === 'spawn') Game.spawn(data.card, (1 - data.nx) * Game.width, (1 - data.ny) * Game.height, 'enemy');
        if (data.type === 'emote') Game.showEmote(data.val, 'enemy');
    });
}

// --- Game Engine (Canvas Logic) ---
class Entity {
    constructor(x, y, team, radius) { this.pos = new Vector2(x, y); this.team = team; this.radius = radius; this.dead = false; this.hp = 100; this.maxHp = 100; this.flash = 0; }
    takeDamage(amt, isCrit = false) {
        this.hp -= amt; this.flash = 5;
        Game.particles.get(this.pos.x, this.pos.y - 30, '#fff', isCrit ? 'crit' : 'text', Math.floor(amt));
        if (this.hp <= 0) { this.dead = true; for (let i = 0; i < 3; i++) Game.particles.get(this.pos.x, this.pos.y, '#a55eea', 'soul', 0); }
    }
    drawHp(ctx, offset) {
        if (this.hp < this.maxHp && this.hp > 0) {
            const w = 32; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(this.pos.x - w / 2, this.pos.y - this.radius - offset - 2, w + 4, 8);
            ctx.fillStyle = this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E; ctx.fillRect(this.pos.x - w / 2 + 2, this.pos.y - this.radius - offset, w * (this.hp / this.maxHp), 4);
        }
    }
    drawShadow(ctx) {
        ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(this.pos.x, this.pos.y, this.radius, this.radius * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
}

class Unit extends Entity {
    constructor(x, y, team, key) {
        const d = CARDS[key]; super(x, y, team, d.radius);
        this.key = key; this.hp = d.hp; this.maxHp = d.hp; this.dmg = d.dmg; this.speed = d.speed; this.range = d.range; this.atkSpd = d.atkSpd; this.type = d.type || 'ground'; this.targetType = d.target; this.mass = d.mass;
        this.deployTimer = d.deployTime; this.maxDeploy = d.deployTime; this.atkTimer = 0; this.facing = 1; this.frame = Math.random() * 100;
    }
    update() {
        if (this.dead) return;
        if (this.deployTimer > 0) { this.deployTimer--; return; }
        if (this.atkTimer > 0) this.atkTimer--;
        this.frame++; if (this.flash > 0) this.flash--;

        const target = this.findTarget();
        if (target) {
            const dist = this.pos.dist(target.pos);
            if (dist <= this.range + this.radius + target.radius) {
                if (this.atkTimer <= 0) this.attack(target);
            } else if (this.speed > 0) {
                this.moveTowards(target.pos);
            }
        } else if (this.speed > 0) {
            const goalY = this.team === 'player' ? -100 : Game.height + 100;
            this.moveTowards(new Vector2(this.pos.x, goalY));
        }
    }
    moveTowards(dest) {
        let target = dest.copy();
        const riverY = Game.height * CONFIG.RIVER_OFF;
        if (this.type !== 'air' && ((this.pos.y < riverY && dest.y > riverY) || (this.pos.y > riverY && dest.y < riverY))) {
            const bL = Game.width * 0.25, bR = Game.width * 0.75;
            const bridgeX = Math.abs(this.pos.x - bL) < Math.abs(this.pos.x - bR) ? bL : bR;
            target = new Vector2(bridgeX + (this.pos.x % 30 - 15), riverY);
        }
        const dir = target.sub(this.pos).normalize();
        this.pos.add(dir.mult(this.speed));
        if (dir.x > 0.1) this.facing = 1; else if (dir.x < -0.1) this.facing = -1;
    }
    findTarget() {
        const list = this.targetType === 'building' ? [...Game.towers, ...Game.units.filter(u => u.type === 'building')] : [...Game.towers, ...Game.units];
        let best = null, minD = Infinity;
        list.forEach(t => {
            if (t.team !== this.team && !t.dead && t.deployTimer <= 0) {
                if (t instanceof Tower && t.isKing && !t.active && t.team !== this.team) return;
                const d = this.pos.dist(t.pos); if (d < minD) { minD = d; best = t; }
            }
        });
        if (!best && this.targetType !== 'building') best = Game.towers.find(t => t.team !== this.team && t.isKing);
        return best;
    }
    attack(target) {
        if (this.range > 50) Game.projectiles.push(new Projectile(this.pos, target, this.dmg, this.key === 'fireball' || this.key === 'babydragon' ? 50 : 0, this.key, this.team));
        else {
            target.takeDamage(this.dmg); AudioSys.play('attack');
            Game.particles.get((this.pos.x + target.pos.x) / 2, (this.pos.y + target.pos.y) / 2, '#fff', 'spark', 0);
        }
        this.atkTimer = this.atkSpd;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.pos.x, this.pos.y); if (this.type === 'air') ctx.translate(0, -40);
        if (this.deployTimer > 0) {
            ctx.globalAlpha = 0.6; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0, 0, this.radius + 5, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.fillStyle = '#ecf0f1'; ctx.arc(0, 0, this.radius + 5, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * (1 - this.deployTimer / this.maxDeploy))); ctx.lineTo(0, 0); ctx.fill(); ctx.restore(); return;
        }
        if (this.flash > 0) ctx.filter = 'brightness(3)';
        const col = this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
        ctx.translate(0, -Math.sin(this.frame * 0.2) * 2); ctx.scale(this.facing, 1);
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -5, this.radius - 2, 0, Math.PI * 2); ctx.fill();
        ctx.font = "20px serif"; ctx.textAlign = "center"; ctx.fillText(CARDS[this.key].icon, 0, 2);
        ctx.restore(); this.drawHp(ctx, this.radius + (this.type === 'air' ? 45 : 5));
    }
}

class Tower extends Entity {
    constructor(x, y, team, isKing) {
        super(x, y, team, isKing ? 32 : 24);
        this.isKing = isKing; this.active = !isKing; this.maxHp = isKing ? 4000 : 2500; this.hp = this.maxHp; this.range = 160; this.atkTimer = 0;
    }
    update() {
        if (this.flash > 0) this.flash--;
        if (this.isKing && !this.active) { if (this.hp < this.maxHp || Game.towers.some(t => t.team === this.team && !t.isKing && t.dead)) this.active = true; }
        if (!this.active) return;
        if (this.atkTimer > 0) this.atkTimer--;
        let target = null, minD = this.range;
        Game.units.forEach(u => { if (u.team !== this.team && !u.dead && u.deployTimer <= 0) { const d = this.pos.dist(u.pos); if (d < minD) { minD = d; target = u; } } });
        if (target && this.atkTimer <= 0) { Game.projectiles.push(new Projectile(new Vector2(this.pos.x, this.pos.y - (this.isKing ? 40 : 30)), target, 90, 0, 'arrow', this.team)); this.atkTimer = 45; }
    }
    draw(ctx) {
        const x = this.pos.x, y = this.pos.y; const col = this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
        ctx.save(); if (this.flash > 0) ctx.filter = 'brightness(2)';
        ctx.fillStyle = '#95a5a6'; const w = this.radius * 1.8; const h = this.isKing ? 40 : 30;
        ctx.fillRect(x - w / 2, y - 10, w, 20); ctx.fillStyle = '#bdc3c7'; ctx.fillRect(x - w / 2 + 4, y - 10 - h, w - 8, h);
        ctx.fillStyle = col; ctx.fillRect(x - w / 2 + 4, y - 10 - h + 5, w - 8, 6);
        if (this.isKing && !this.active) ctx.fillText("💤", x, y - 35);
        ctx.restore(); this.drawHp(ctx, this.isKing ? 65 : 45);
    }
}

class Projectile {
    constructor(pos, target, dmg, aoe, key, team) {
        this.pos = pos.copy(); this.target = target; this.dmg = dmg; this.aoe = aoe; this.key = key; this.team = team;
        this.dest = (key === 'fireball') ? target.copy() : target.pos.copy();
        this.speed = key === 'fireball' ? 6 : 7; this.dead = false;
    }
    update() {
        if (this.key !== 'fireball' && !this.target.dead) this.dest = this.target.pos.copy();
        if (this.pos.dist(this.dest) < this.speed + 5) {
            this.dead = true;
            let targets = (this.aoe > 0) ? [...Game.units, ...Game.towers].filter(e => e.pos.dist(this.dest) <= this.aoe) : [this.target];
            targets.forEach(t => { if (t.team !== this.team) t.takeDamage(this.dmg); });
        } else this.pos.add(this.dest.copy().sub(this.pos).normalize().mult(this.speed));
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.pos.x, this.pos.y);
        ctx.fillStyle = this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
        if (this.key === 'fireball') ctx.fillStyle = '#e74c3c';
        ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

const Game = {
    canvas: null, ctx: null, width: 0, height: 0, running: false, roomID: null,
    units: [], towers: [], projectiles: [], particles: new ParticlePool(),
    elixir: 5, deck: [], hand: [], nextCard: null, dragIdx: null, dragPos: { x: 0, y: 0 }, isDragging: false,

    initAndStart(roomID, enemyName, userDeck) {
        this.canvas = document.getElementById('gameCanvas'); this.ctx = this.canvas.getContext('2d');
        const wrapper = document.getElementById('game-ui-wrapper');
        this.width = wrapper.clientWidth; this.height = wrapper.clientHeight;
        this.canvas.width = this.width; this.canvas.height = this.height;
        document.getElementById('enemy-name').innerText = enemyName;

        this.roomID = roomID; this.running = true;
        this.reset(userDeck);

        let time = CONFIG.GAME_TIME;
        this.timerInt = setInterval(() => {
            if (!this.running) return clearInterval(this.timerInt);
            time--; const m = Math.floor(time / 60), s = time % 60;
            document.getElementById('timer').innerText = `0${m}:${s < 10 ? '0' + s : s}`;
            if (time === 60) {
                const e = document.getElementById('elixir-mode-msg'); e.style.opacity = 1; e.style.transform = 'scale(1.2)';
                setTimeout(() => { e.style.opacity = 0; }, 2000);
            }
            if (time <= 0) this.endGame(null);
        }, 1000);

        // Events
        const c = document.getElementById('gameCanvas');
        c.onpointerdown = e => this.onDown(e); c.onpointermove = e => this.onMove(e); c.onpointerup = e => this.onUp(e);
        this.loop();
    },
    reset(userDeck) {
        this.units = []; this.projec
