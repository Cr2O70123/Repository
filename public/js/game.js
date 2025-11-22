let socket;
class Vec2 { constructor(x,y){this.x=x;this.y=y;} dist(v){return Math.hypot(this.x-v.x,this.y-v.y);} copy(){return new Vec2(this.x,this.y);} add(v){this.x+=v.x;this.y+=v.y;return this;} sub(v){this.x-=v.x;this.y-=v.y;return this;} normalize(){let m=Math.sqrt(this.x**2+this.y**2); if(m>0){this.x/=m;this.y/=m;} return this;} mult(n){this.x*=n;this.y*=n;return this;} }

const Game = {
    canvas: null, ctx: null, width: 0, height: 0, running: false,
    units: [], towers: [], projectiles: [], particles: [],
    elixir: 5, hand: [], nextCard: null, 
    selIdx: null, dragIdx: null, dragPos: {x:0,y:0}, isDragging: false,
    roomID: null, playerName: "", enemyName: "對手",
    
    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.onresize = () => this.resize();
        
        const c = document.getElementById('game-container');
        c.onpointerdown = e => this.onDown(e);
        c.onpointermove = e => this.onMove(e);
        c.onpointerup = e => this.onUp(e);
        
        // 載入音效 (略，使用 data.js 或 AudioSys)
        this.renderElixir();
    },
    resize(){ const w=document.getElementById('canvas-wrapper'); this.width=w.clientWidth; this.height=w.clientHeight; this.canvas.width=this.width; this.canvas.height=this.height; },

    findMatch() {
        this.playerName = document.getElementById('nickname').value || "玩家";
        const btn = document.getElementById('btn-battle');
        const status = document.getElementById('match-status-txt');
        const spinner = document.getElementById('wait-spinner');
        
        btn.disabled = true; spinner.style.display = 'block'; status.innerText = "連線中...";
        
        if(!socket) socket = io();
        
        socket.on('connect', () => { status.innerText = "尋找對手..."; socket.emit('find_match'); });
        
        socket.on('game_start', (data) => {
            this.roomID = data.roomID;
            App.nav('game');
            this.start(data.role);
            socket.emit('action', { roomID: this.roomID, type: 'name_sync', name: this.playerName });
        });

        socket.on('remote_action', (data) => {
            if(data.type === 'spawn') {
                const rx = (1 - data.nx) * this.width;
                const ry = (1 - data.ny) * this.height;
                this.spawn(data.card, rx, ry, 'enemy');
            } else if(data.type === 'name_sync') {
                this.enemyName = data.name;
                document.getElementById('enemy-name-txt').innerText = this.enemyName;
            } else if(data.type === 'emote') {
                this.showEmote(data.val, 'enemy');
            }
        });

        socket.on('opponent_surrender', () => this.endGame(true));
        socket.on('opponent_left', () => this.endGame(true));
    },

    start(role) {
        this.reset(); this.running = true;
        let time = CONFIG.GAME_TIME;
        this.timerInt = setInterval(() => {
            if(!this.running) return;
            time--;
            const m = Math.floor(time/60), s = time%60;
            document.getElementById('timer').innerText = `0${m}:${s<10?'0'+s:s}`;
            if(time===CONFIG.DBL_ELIXIR) { document.getElementById('elixir-mode-txt').className='show'; setTimeout(()=>document.getElementById('elixir-mode-txt').className='',2000); }
            if(time<=0) this.endGame(null);
        }, 1000);
        this.loop();
    },

    reset() {
        this.units=[]; this.projectiles=[]; this.particles=[]; this.elixir=5;
        this.hand=[]; 
        let deck = [...App.userDeck, ...App.userDeck].sort(()=>Math.random()-0.5);
        for(let i=0;i<4;i++) this.hand.push(deck.pop());
        this.nextCard = deck.pop();
        
        // 修正塔位置：己方往後挪 (height - 80 改為 height - 50)
        const pY = this.height - 100; 
        const eY = 100;
        const bL = this.width*0.25, bR = this.width*0.75;
        
        this.towers = [
            {pos:new Vec2(bL, pY), team:'player', hp:2500, max:2500, r:24, king:false},
            {pos:new Vec2(bR, pY), team:'player', hp:2500, max:2500, r:24, king:false},
            {pos:new Vec2(this.width/2, pY+60), team:'player', hp:4000, max:4000, r:32, king:true, active:false}, // 國王更後面
            {pos:new Vec2(bL, eY), team:'enemy', hp:2500, max:2500, r:24, king:false},
            {pos:new Vec2(bR, eY), team:'enemy', hp:2500, max:2500, r:24, king:false},
            {pos:new Vec2(this.width/2, eY-60), team:'enemy', hp:4000, max:4000, r:32, king:true, active:false}
        ];
        this.renderHand();
    },

    surrender() {
        if(confirm("確定要投降嗎？")) {
            socket.emit('surrender', this.roomID);
            this.endGame(false);
        }
    },

    endGame(win) {
        this.running = false; clearInterval(this.timerInt);
        if(socket) socket.disconnect();
        
        if(win === null) {
            const php = this.towers.filter(t=>t.team==='player').reduce((a,b)=>a+b.hp,0);
            const ehp = this.towers.filter(t=>t.team==='enemy').reduce((a,b)=>a+b.hp,0);
            win = php >= ehp;
        }
        
        document.getElementById('end-title').innerText = win ? "勝利" : "失敗";
        document.getElementById('end-title').style.color = win ? "#f1c40f" : "#e74c3c";
        
        // 結算金幣
        const reward = win ? 50 : 10;
        App.userData.gold += reward;
        App.userData.wins += win ? 1 : 0;
        App.userData.loss += win ? 0 : 1;
        App.saveData();
        document.getElementById('reward-gold').innerText = reward;
        
        App.nav('end-screen');
    },

    // --- 核心邏輯 ---
    onDown(e) {
        if(!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        
        // 檢查手牌
        const cards = document.querySelectorAll('#hand-cards .card');
        let clickedCard = false;
        cards.forEach((el, i) => {
            const box = el.getBoundingClientRect();
            if(e.clientX>=box.left && e.clientX<=box.right && e.clientY>=box.top && e.clientY<=box.bottom) {
                if(this.elixir >= CARDS[this.hand[i]].cost) {
                    this.selIdx = i; this.dragIdx = i; this.isDragging = true;
                    this.dragPos = {x, y};
                    clickedCard = true;
                    this.renderHand();
                }
            }
        });

        // 點放 (Tap to place)
        if (!clickedCard && this.selIdx !== null && !this.isDragging) {
            if (y < this.height) this.trySpawn(this.selIdx, x, y);
        }
    },
    onMove(e) {
        if(this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            this.dragPos = {x: e.clientX - rect.left, y: e.clientY - rect.top};
        }
    },
    onUp(e) {
        if(this.isDragging) {
            const rect = this.canvas.getBoundingClientRect();
            const y = e.clientY - rect.top;
            // 拖曳放開判定 (高度要在戰場內)
            if(y < this.height - 100) this.trySpawn(this.dragIdx, this.dragPos.x, this.dragPos.y);
            this.isDragging = false; this.dragIdx = null; this.selIdx = null;
            this.renderHand();
        }
    },

    trySpawn(idx, x, y) {
        const key = this.hand[idx];
        const d = CARDS[key];
        const riverY = this.height * CONFIG.RIVER_OFF;
        
        // 紅區檢查：如果不是法術且在敵方區域，不能放
        if (d.type !== 'spell' && y < riverY) {
            this.msg("無法部署於此");
            return;
        }

        this.elixir -= d.cost;
        this.spawn(key, x, y, 'player');
        
        // 傳送歸一化座標 (0~1)
        socket.emit('action', { 
            roomID: this.roomID, type: 'spawn', card: key, 
            nx: x/this.width, ny: y/this.height 
        });

        this.hand[idx] = this.nextCard;
        this.nextCard = App.userDeck[Math.floor(Math.random()*6)];
        this.renderHand();
    },

    spawn(key, x, y, team) {
        const d = CARDS[key];
        if(d.type==='spell') {
            this.projectiles.push({ pos:new Vec2(this.width/2, team==='player'?this.height:0), dest:new Vec2(x,y), type:key, dmg:d.dmg, team, aoe:d.aoe, speed:7, height:0, maxDist:0 });
        } else {
            const count = d.count || 1;
            for(let i=0; i<count; i++) {
                let ox = (i-(count-1)/2)*15;
                this.units.push({
                    pos: new Vec2(x+ox, y), team, key, hp:d.hp, maxHp:d.hp, 
                    speed:d.speed, range:d.range, dmg:d.dmg, atkSpd:d.atkSpd, 
                    type:d.type, targetType:d.target, atkTimer:0, deploy:60, 
                    facing:1, id: Math.random()
                });
            }
        }
    },

    // 簡易遊戲迴圈 (繪圖與更新)
    loop() {
        if(!this.running) return;
        requestAnimationFrame(() => this.loop());
        
        this.ctx.clearRect(0,0,this.width,this.height);
        
        // 繪製地圖
        this.ctx.fillStyle = CONFIG.COLORS.GRASS; this.ctx.fillRect(0,0,this.width,this.height);
        this.ctx.fillStyle = 'rgba(0,0,0,0.05)'; 
        for(let i=0;i<this.width;i+=40) for(let j=0;j<this.height;j+=40) if((i+j)%80===0) this.ctx.fillRect(i,j,40,40);
        const ry = this.height * CONFIG.RIVER_OFF;
        this.ctx.fillStyle = CONFIG.COLORS.WATER; this.ctx.fillRect(0, ry-30, this.width, 60);
        this.ctx.fillStyle = '#7f8c8d'; 
        this.ctx.fillRect(this.width*0.25-30, ry-35, 60, 70);
        this.ctx.fillRect(this.width*0.75-30, ry-35, 60, 70);

        // 紅區顯示 (Red Zone)
        if (this.isDragging) {
            const d = CARDS[this.hand[this.dragIdx]];
            if (d.type !== 'spell') {
                this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)';
                this.ctx.fillRect(0, 0, this.width, ry); // 敵方區域變紅
            }
        }

        this.elixir = Math.min(10, this.elixir + CONFIG.ELIXIR_RATE);
        this.renderElixir();

        // 更新單位
        this.units.forEach(u => {
            if(u.deploy>0) { u.deploy--; return; }
            if(u.atkTimer>0) u.atkTimer--;
            
            // 修正的瞄準邏輯
            let target = null, minD = Infinity;
            [...this.towers, ...this.units].forEach(t => {
                if(t.team !== u.team && (t.hp>0)) {
                    // 國王塔未激活時不鎖定，除非公主塔死光
                    if(t.king && !t.active) {
                        const pTowers = this.towers.filter(tw => tw.team===t.team && !tw.king && tw.hp>0);
                        if(pTowers.length > 0) return; 
                    }
                    if(u.targetType==='building' && !t.king && t.speed!==undefined) return; // 只打塔
                    
                    const d = u.pos.dist(t.pos);
                    if(d < minD) { minD = d; target = t; }
                }
            });

            if(target) {
                if(minD <= u.range + 20) { // 攻擊
                    if(u.atkTimer<=0) {
                        if(u.range>50) this.projectiles.push({pos:u.pos.copy(), dest:target.pos.copy(), type:'arrow', dmg:u.dmg, team:u.team, speed:8});
                        else target.hp -= u.dmg;
                        u.atkTimer = u.atkSpd;
                    }
                } else { // 移動
                    let moveT = target.pos.copy();
                    // 過橋邏輯
                    if(u.type!=='air' && Math.abs(u.pos.y-ry)>20 && ((u.pos.y<ry && moveT.y>ry)||(u.pos.y>ry && moveT.y<ry))) {
                        const bx = Math.abs(u.pos.x-this.width*0.25)<Math.abs(u.pos.x-this.width*0.75) ? this.width*0.25 : this.width*0.75;
                        moveT.x = bx + (u.pos.x%20-10); moveT.y = ry;
                    }
                    const dir = moveT.sub(u.pos).normalize().mult(u.speed);
                    u.pos.add(dir);
                }
            } else {
                // 沒目標往前走
                u.pos.y += (u.team==='player' ? -1 : 1) * u.speed;
            }
        });

        // 繪製
        this.towers = this.towers.filter(t=>t.hp>0);
        this.units = this.units.filter(u=>u.hp>0);
        
        [...this.towers, ...this.units].sort((a,b)=>a.pos.y-b.pos.y).forEach(e => {
            this.ctx.fillStyle = e.team==='player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
            if(e.speed === undefined) { // Tower
                this.ctx.fillRect(e.pos.x-20, e.pos.y-20, 40, 40);
                if(e.king) this.ctx.fillText("👑", e.pos.x-10, e.pos.y-30);
            } else { // Unit
                this.ctx.beginPath(); this.ctx.arc(e.pos.x, e.pos.y, 10, 0, Math.PI*2); this.ctx.fill();
                this.ctx.fillText(CARDS[e.key].icon, e.pos.x-10, e.pos.y+5);
            }
            // HP Bar
            this.ctx.fillStyle='red'; this.ctx.fillRect(e.pos.x-15, e.pos.y-30, 30, 4);
            this.ctx.fillStyle='green'; this.ctx.fillRect(e.pos.x-15, e.pos.y-30, 30*(e.hp/e.max), 4);
        });

        // 繪製投射物 (略為簡化)
        this.projectiles.forEach((p,i) => {
            const d = p.pos.dist(p.dest);
            if(d<10) {
                this.projectiles.splice(i,1);
                // 簡單傷害判定
                [...this.units, ...this.towers].forEach(t => {
                    if(t.team!==p.team && t.pos.dist(p.dest) < (p.aoe||20)) t.hp -= p.dmg;
                });
            } else {
                p.pos.add(p.dest.copy().sub(p.pos).normalize().mult(p.speed));
                this.ctx.fillStyle='yellow'; this.ctx.beginPath(); this.ctx.arc(p.pos.x, p.pos.y, 5, 0, Math.PI*2); this.ctx.fill();
            }
        });

        // 勝利判定
        if(!this.towers.some(t=>t.team==='player' && t.king)) this.endGame(false);
        else if(!this.towers.some(t=>t.team==='enemy' && t.king)) this.endGame(true);
    },

    renderElixir() {
        document.getElementById('elixir-fill').style.width = (this.elixir*10)+'%';
        document.getElementById('elixir-badge').innerText = Math.floor(this.elixir);
        document.querySelectorAll('#hand-cards .card').forEach((el, i)=>{
            if(this.hand[i]) el.classList.toggle('disabled', this.elixir < CARDS[this.hand[i]].cost);
        });
    },
    renderHand() {
        const c = document.getElementById('hand-cards'); c.innerHTML='';
        this.hand.forEach((k,i)=>{
            const d=CARDS[k], el=document.createElement('div');
            el.className=`card ${d.rarity}`;
            if(this.selIdx===i && !this.isDragging) el.classList.add('selected');
            if(this.dragIdx===i) el.classList.add('dragging');
            el.innerHTML=`<div class="cost">${d.cost}</div><div class="card-inner"><div class="emoji">${d.icon}</div></div>`;
            c.appendChild(el);
        });
        document.getElementById('next-icon').innerText = CARDS[this.nextCard].icon;
        this.renderElixir();
    },
    msg(t){ const m=document.getElementById('message'); m.innerText=t; m.className='show'; setTimeout(()=>m.className='',1000); },
    showEmote(v, t){ /* 略 */ }
};