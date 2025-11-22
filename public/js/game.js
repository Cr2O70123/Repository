// public/js/game.js

// 實體與繪圖 (完全還原 V1)
class Entity {
    constructor(x, y, team, radius) { this.pos=new Vector2(x,y); this.team=team; this.radius=radius; this.dead=false; this.hp=100; this.maxHp=100; this.flash=0; this.shakeX=0; this.shakeY=0; this.knockbackVel=new Vector2(0,0); this.stunTimer=0; }
    takeDamage(amt, isCrit=false) {
        this.hp-=amt; this.flash=5; this.shakeX=(Math.random()-0.5)*6; this.shakeY=(Math.random()-0.5)*6;
        Game.particles.get(this.pos.x, this.pos.y-30, '#fff', isCrit?'crit':'text', Math.floor(amt));
        if(this.hp<=0) { this.dead=true; if(this.deathDmg) Game.projectiles.push(new Projectile(this.pos, new Vector2(0,0), this.deathDmg, 100, 'explosion', this.team)); for(let i=0;i<3;i++) Game.particles.get(this.pos.x,this.pos.y,'#a55eea','soul',0); }
    }
    drawHp(ctx, offset) {
        if(this.hp<this.maxHp && this.hp>0) {
            const w=32; ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(this.pos.x-w/2-2+this.shakeX, this.pos.y-this.radius-offset-2+this.shakeY, w+4, 8);
            ctx.fillStyle=this.team==='player'?CONFIG.COLORS.P:CONFIG.COLORS.E; ctx.fillRect(this.pos.x-w/2+this.shakeX, this.pos.y-this.radius-offset+this.shakeY, w*(this.hp/this.maxHp), 4);
        }
    }
    drawShadow(ctx) {
        ctx.fillStyle = this.type==='air' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(this.pos.x, this.pos.y+(this.type==='air'?40:0), this.radius, this.radius*0.6, 0, 0, Math.PI*2); ctx.fill();
    }
}

class Unit extends Entity {
    constructor(x, y, team, key) {
        const d = CARDS[key]; super(x, y, team, d.radius);
        this.key=key; this.hp=d.hp; this.maxHp=d.hp; this.dmg=d.dmg; this.speed=d.speed; this.range=d.range; this.atkSpd=d.atkSpd; this.type=d.type||'ground'; this.targetType=d.target; this.mass=d.mass;
        this.deployTimer=d.deployTime; this.maxDeploy=d.deployTime; this.atkTimer=0; this.facing=1; this.frame=Math.random()*100;
        this.chargeSpeed=d.chargeSpeed||0; this.chargeDmgMult=d.chargeDmgMult||1; this.isCharging=false; this.moveTime=0;
    }
    update() {
        if(this.dead) return;
        this.shakeX*=0.8; this.shakeY*=0.8;
        if(this.knockbackVel.mag()>0.1) { this.pos.add(this.knockbackVel); this.knockbackVel.mult(0.85); this.collide(); return; }
        if(this.deployTimer>0) { this.deployTimer--; return; }
        if(this.stunTimer>0) { this.stunTimer--; return; }
        this.frame++; if(this.flash>0) this.flash--; if(this.atkTimer>0) this.atkTimer--;
        
        const target = this.findTarget();
        if(target) {
            const dist = this.pos.dist(target.pos);
            if(dist <= this.range + this.radius + target.radius) {
                this.state='attack'; if(this.atkTimer <= 0) this.attack(target);
                this.moveTime=0; this.isCharging=false;
            } else if(this.speed > 0) {
                this.state='move'; this.moveTowards(target.pos); this.moveTime++;
                if(this.chargeSpeed>0 && this.moveTime>120) this.isCharging=true;
            }
        } else if(this.speed > 0) {
            this.state='move'; const goalY = this.team==='player' ? -100 : Game.height+100;
            this.moveTowards(new Vector2(this.pos.x, goalY)); this.moveTime++;
        }
        if(this.speed>0) this.collide();
    }
    moveTowards(dest) {
        let target = dest.copy();
        const riverY = Game.height * CONFIG.RIVER_OFF;
        if(this.type!=='air' && Math.abs(this.pos.y-riverY)>20 && ((this.pos.y<riverY && dest.y>riverY)||(this.pos.y>riverY && dest.y<riverY))) {
            const bL = Game.width*0.25, bR = Game.width*0.75;
            const bridgeX = Math.abs(this.pos.x-bL)<Math.abs(this.pos.x-bR) ? bL : bR;
            target = new Vector2(bridgeX + (this.pos.x%30-15), riverY);
        }
        let spd = this.isCharging ? this.chargeSpeed : this.speed;
        const dir = target.sub(this.pos).normalize();
        this.pos.add(dir.mult(spd));
        if(dir.x>0.1) this.facing=1; else if(dir.x<-0.1) this.facing=-1;
    }
    collide() {
        if(this.type==='air') return;
        const force = new Vector2(0,0);
        Game.units.forEach(u => {
            if(u===this || u.dead || u.deployTimer>0 || u.type==='air') return;
            const d = this.pos.dist(u.pos), minD = this.radius+u.radius;
            if(d<minD) force.add(this.pos.copy().sub(u.pos).normalize().mult((minD-d)*0.15 * Math.min(2, u.mass/this.mass)));
        });
        this.pos.add(force);
        this.pos.x = Math.max(15, Math.min(Game.width-15, this.pos.x));
    }
    findTarget() {
        const list = this.targetType==='building' ? [...Game.towers, ...Game.units.filter(u=>u.type==='building')] : [...Game.towers, ...Game.units];
        let best = null, minD = Infinity;
        list.forEach(t => {
            if(t.team!==this.team && !t.dead && t.deployTimer<=0) {
                if(t instanceof Tower && t.isKing && !t.active && t.team!==this.team) {
                    // 修正：優先打公主塔，除非只剩國王
                    if(Game.towers.some(pt => pt.team===t.team && !pt.isKing && !pt.dead)) return;
                }
                const d = this.pos.dist(t.pos); if(d<minD) { minD=d; best=t; }
            }
        });
        if(!best && this.targetType!=='building') best = Game.towers.find(t=>t.team!==this.team && t.isKing);
        return best;
    }
    attack(target) {
        const dmg = this.isCharging ? this.dmg * this.chargeDmgMult : this.dmg;
        if(this.range>50) Game.projectiles.push(new Projectile(this.pos, target, dmg, this.aoe, this.key, this.team));
        else {
            const isCrit = (this.key==='minipekka' || this.isCharging);
            target.takeDamage(dmg, isCrit);
            AudioSys.play(this.isCharging?'charge_hit':(isCrit?'heavy_hit':'attack'));
            Game.particles.get((this.pos.x+target.pos.x)/2, (this.pos.y+target.pos.y)/2, '#fff', 'spark', 0);
        }
        this.atkTimer = this.atkSpd;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.pos.x+this.shakeX, this.pos.y+this.shakeY); if(this.type==='air') ctx.translate(0,-40);
        if(this.deployTimer>0) {
            ctx.globalAlpha=0.6; ctx.fillStyle='rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0,0,this.radius+5,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(0,0); ctx.fillStyle='#ecf0f1'; ctx.arc(0,0,this.radius+5,-Math.PI/2,-Math.PI/2+(Math.PI*2*(1-this.deployTimer/this.maxDeploy))); ctx.lineTo(0,0); ctx.fill(); ctx.restore(); return;
        }
        if(this.flash>0) ctx.filter='brightness(3)';
        
        const col = this.team==='player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
        const bob = Math.sin(this.frame*0.2)*2;
        ctx.translate(0, -bob); ctx.scale(this.facing, 1);

        if (this.key === 'giant') {
            ctx.fillStyle = '#d35400'; ctx.fillRect(-14, -28, 28, 28);
            ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(0, -34, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = col; ctx.fillRect(-14,-22,28,12);
        } else if (this.key === 'golem') {
            ctx.fillStyle = '#636e72'; ctx.beginPath(); ctx.arc(0, -15, 22, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#b2bec3'; ctx.beginPath(); ctx.arc(-8, -20, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8, -20, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -10, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ff7675'; ctx.beginPath(); ctx.arc(0, -15, 3, 0, Math.PI*2); ctx.fill();
        } else if (this.key === 'knight') {
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -8, 12, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
            ctx.save(); ctx.translate(10, -5);
            const swing = this.state === 'attack' ? Math.sin(this.frame*0.6)*1.5 : -0.5; ctx.rotate(swing);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(0, -12, 4, 24); ctx.fillRect(-3, 8, 10, 3); ctx.restore();
        } else if (this.key === 'archer') {
            ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(-8,-5); ctx.lineTo(8,-5); ctx.fill();
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, 0, 8, -Math.PI/2, Math.PI/2); ctx.stroke();
        } else if (this.key === 'prince') {
            ctx.fillStyle = col; ctx.fillRect(-8, -15, 16, 15);
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, -22, 8, 0, Math.PI*2); ctx.fill();
            ctx.save(); ctx.translate(8, -10);
            const angle = this.state === 'move' ? Math.PI/4 : 0; ctx.rotate(angle);
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(25, -2); ctx.lineTo(25, 2); ctx.fill();
            if (this.isCharging) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(0,-1,30,2); } ctx.restore();
        } else if (this.key === 'minipekka') {
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(-10,-20,20,20); ctx.fillStyle = col; ctx.fillRect(-10,-15,20,5);
            ctx.fillStyle = '#00ffff'; ctx.shadowBlur=5; ctx.shadowColor='#00ffff'; ctx.beginPath(); ctx.arc(0,-12,4,0,Math.PI*2); ctx.fill(); ctx.shadowBlur=0;
            ctx.fillStyle = '#7f8c8d'; ctx.beginPath(); ctx.moveTo(-10,-20); ctx.lineTo(-14,-28); ctx.lineTo(-6,-20); ctx.fill(); ctx.beginPath(); ctx.moveTo(10,-20); ctx.lineTo(14,-28); ctx.lineTo(6,-20); ctx.fill();
        } else if (this.key === 'hogrider') {
            ctx.fillStyle = '#8d6e63'; ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(0, -20, 8, Math.PI, 0); ctx.fill();
            ctx.fillStyle = '#ff7675'; ctx.fillRect(-10, -15, 20, 15);
            ctx.fillStyle = '#634200'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#dfe6e9'; ctx.lineWidth=3; ctx.beginPath(); ctx.moveTo(10,-15); ctx.lineTo(10,-25); ctx.stroke();
        } else if (this.key === 'babydragon') {
            ctx.fillStyle = '#00b894'; ctx.beginPath(); ctx.ellipse(0, 0, 12, 10, 0, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#fdcb6e'; ctx.beginPath(); ctx.moveTo(-5, -5); ctx.lineTo(-15, -15); ctx.lineTo(-5, 5); ctx.fill(); ctx.beginPath(); ctx.moveTo(5, -5); ctx.lineTo(15, -15); ctx.lineTo(5, 5); ctx.fill();
            ctx.fillStyle = '#00b894'; ctx.beginPath(); ctx.arc(0, -12, 8, 0, Math.PI*2); ctx.fill();
        } else if (this.key === 'musketeer') {
            ctx.fillStyle = '#9b59b6'; ctx.fillRect(-6, -18, 12, 18);
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#333'; ctx.fillRect(6, -14, 14, 4);
        } else if (this.key === 'bats') {
            ctx.fillStyle = '#6c5ce7'; ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.moveTo(-5,-5); ctx.lineTo(-12,-12); ctx.lineTo(-5,0); ctx.fill(); ctx.beginPath(); ctx.moveTo(5,-5); ctx.lineTo(12,-12); ctx.lineTo(5,0); ctx.fill();
        } else if (this.key === 'goblins') {
            ctx.fillStyle = '#55efc4'; ctx.beginPath(); ctx.arc(0,-5,8,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-6,-10); ctx.lineTo(-12,-18); ctx.lineTo(0,-10); ctx.fill(); ctx.beginPath(); ctx.moveTo(6,-10); ctx.lineTo(12,-18); ctx.lineTo(0,-10); ctx.fill();
        } else if (this.key === 'cannon') {
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(-15, -15, 30, 30); ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
            const t = this.findTarget(); const angle = t ? Math.atan2(t.pos.y - this.pos.y, t.pos.x - this.pos.x) : -Math.PI/2; ctx.rotate(angle);
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(0,-6,24,12);
        } else {
            ctx.fillStyle = (this.key==='skarmy'?'#fff':col); ctx.beginPath(); ctx.arc(0, -5, this.radius-2, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.restore(); this.drawHp(ctx, this.radius+(this.type==='air'?45:5));
    }
}

class Tower extends Entity {
    constructor(x, y, team, isKing) {
        super(x, y, team, isKing?32:24);
        this.isKing = isKing; this.active = !isKing;
        this.maxHp = isKing?4000:2500; this.hp = this.maxHp; this.range = 160; this.atkTimer = 0; this.deployTimer = 0; this.name = "";
    }
    update() {
        this.shakeX*=0.8; this.shakeY*=0.8; if(this.flash>0) this.flash--;
        if(this.isKing && !this.active) { if(this.hp<this.maxHp || Game.towers.some(t=>t.team===this.team && !t.isKing && t.dead)) this.active=true; }
        if(!this.active) return;
        if(this.atkTimer>0) this.atkTimer--;
        let target = null, minD = this.range;
        Game.units.forEach(u => { if(u.team!==this.team && !u.dead && u.deployTimer<=0) { const d=this.pos.dist(u.pos); if(d<minD){minD=d; target=u;} } });
        if(target && this.atkTimer<=0) {
            Game.projectiles.push(new Projectile(new Vector2(this.pos.x, this.pos.y-(this.isKing?40:30)), target, this.isKing?120:90, 0, 'arrow', this.team));
            this.atkTimer = 45;
        }
    }
    draw(ctx) {
        const x = this.pos.x + this.shakeX, y = this.pos.y + this.shakeY;
        const col = this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
        ctx.save(); if(this.flash>0) ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4);
        
        ctx.fillStyle = '#95a5a6'; const w = this.radius * 1.8; const h = this.isKing ? 40 : 30;
        ctx.fillRect(x - w/2, y - 10, w, 20);
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(x - w/2 + 4, y - 10 - h, w - 8, h);
        ctx.fillStyle = col; ctx.fillRect(x - w/2 + 4, y - 10 - h + 5, w - 8, 6);
        
        const topY = y - 10 - h;
        if(this.isKing) {
            if(this.active) {
                ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x - w/2 - 2, topY - 6); ctx.lineTo(x + w/2 + 2, topY - 6); ctx.lineTo(x, topY - 30); ctx.fill();
                ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, topY-30); ctx.lineTo(x, topY-45); ctx.stroke();
            } else {
                ctx.fillStyle = col; ctx.fillRect(x - 15, topY - 20, 30, 20);
                ctx.font = "20px sans-serif"; ctx.textAlign="center"; ctx.fillText("💤", x, topY - 25 + (Math.sin(Date.now()/300)*5));
            }
        } else {
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(x - w/2, topY - 6); ctx.lineTo(x + w/2, topY - 6); ctx.lineTo(x, topY - 20); ctx.fill();
        }
        ctx.restore(); this.drawHp(ctx, this.isKing?65:45);
    }
}

class Projectile {
    constructor(pos, target, dmg, aoe, key, team) {
        this.pos = pos.copy(); this.startPos = pos.copy(); this.target = target; this.dmg = dmg; this.aoe = aoe; this.key = key; this.team = team;
        this.isSpell = (key==='fireball'||key==='barrel'||key==='zap');
        this.dest = this.isSpell ? target.copy() : target.pos.copy();
        this.speed = key==='barrel'?Math.max(3,this.pos.dist(this.dest)/60) : (key==='fireball'?6:7);
        this.height = 0; this.dead = false; this.tail=[];
    }
    update() {
        if(!this.isSpell && !this.target.dead) this.dest = this.target.pos.copy();
        const dToT = this.pos.dist(this.dest), travelled = this.pos.dist(this.startPos);
        if(this.isSpell) this.height = Math.sin((travelled/(travelled+dToT))*Math.PI) * 120;
        
        if(dToT < this.speed+5 && this.height<15) {
            this.dead = true;
            if(this.key==='barrel') { for(let i=0;i<3;i++) Game.units.push(new Unit(this.dest.x+(i-1)*10, this.dest.y, this.team, 'goblins')); AudioSys.play('boom'); return; }
            let targets = (this.aoe>0 || this.isSpell) ? [...Game.units, ...Game.towers].filter(e=>e.pos.dist(this.dest)<=this.aoe) : [this.target];
            if(this.aoe>0) AudioSys.play(this.key==='zap'?'zap':'boom');
            targets.forEach(t => { if(t.team!==this.team){ t.takeDamage(this.dmg); if(this.key==='fireball') t.knockbackVel.add(t.pos.copy().sub(this.pos).normalize().mult(8)); } });
        } else {
            this.pos.add(this.dest.copy().sub(this.pos).normalize().mult(this.speed));
        }
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.pos.x, this.pos.y-this.height);
        if(this.key === 'arrow') {
            const angle = Math.atan2(this.dest.y - this.pos.y, this.dest.x - this.pos.x);
            ctx.rotate(angle);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(-10, -1, 20, 2);
            ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.moveTo(-10, 0); ctx.lineTo(-15, -3); ctx.lineTo(-15, 3); ctx.fill();
            ctx.fillStyle = (this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.fill();
        } else {
            ctx.fillStyle = this.team==='player'?CONFIG.COLORS.P:CONFIG.COLORS.E;
            if(this.key==='fireball') ctx.fillStyle='#e74c3c';
            ctx.beginPath(); ctx.arc(0,0,5,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
}

// --- Main Game Logic ---
let socket;
const Game = {
    canvas: null, ctx: null, width: 0, height: 0, running: false,
    units: [], towers: [], projectiles: [], particles: new ParticlePool(),
    elixir: 5, hand: [], nextCard: null, selIdx: null, dragIdx: null, dragPos: {x:0,y:0}, isDragging: false,
    roomID: null, playerName: "", enemyName: "對手",

    init() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.resize(); window.onresize = () => this.resize();
        
        const c = document.getElementById('game-container');
        c.onpointerdown = e => this.onDown(e); c.onpointermove = e => this.onMove(e); c.onpointerup = e => this.onUp(e);
        
        App.init(); // Initialize App Logic
        this.renderElixir();
    },
    resize(){ const w=document.getElementById('canvas-wrapper'); this.width=w.clientWidth; this.height=w.clientHeight; this.canvas.width=this.width; this.canvas.height=this.height; },

    findMatch() {
        this.playerName = App.userData.name;
        document.getElementById('find-btn').disabled = true;
        document.getElementById('match-status-txt').innerText = "連線中...";
        document.getElementById('wait-spinner').style.display = 'block';
        
        if(!socket) socket = io();
        socket.on('connect', () => { document.getElementById('match-status-txt').innerText = "尋找對手..."; socket.emit('find_match'); });
        socket.on('game_start', (data) => {
            this.roomID = data.roomID;
            App.nav('game');
            this.start(data.role);
            socket.emit('action', { roomID: this.roomID, type: 'name_sync', name: this.playerName });
        });
        socket.on('remote_action', (data) => {
            if(data.type === 'spawn') {
                const rx = (1 - data.nx) * this.width; const ry = (1 - data.ny) * this.height;
                this.spawn(data.card, rx, ry, 'enemy');
            } else if(data.type === 'name_sync') {
                this.enemyName = data.name; document.getElementById('enemy-name-txt').innerText = this.enemyName;
            } else if(data.type === 'emote') {
                this.showEmote(data.val, 'enemy');
            }
        });
        socket.on('opponent_surrender', () => this.endGame(true));
        socket.on('opponent_left', () => this.endGame(true));
    },

    start(role) {
        this.reset(); this.running = true; let time = CONFIG.GAME_TIME;
        this.timerInt = setInterval(() => {
            if(!this.running) return; time--;
            const m = Math.floor(time/60), s = time%60; document.getElementById('timer').innerText = `0${m}:${s<10?'0'+s:s}`;
            if(time===CONFIG.DBL_ELIXIR) { document.getElementById('elixir-mode-txt').className='show'; setTimeout(()=>document.getElementById('elixir-mode-txt').className='',2000); }
            if(time<=0) this.endGame(null);
        }, 1000);
        this.loop();
    },

    reset() {
        this.units=[]; this.projectiles=[]; this.particles.clear(); this.elixir=5; this.hand=[];
        let deck = [...App.userData.deck, ...App.userData.deck].sort(()=>Math.random()-0.5);
        for(let i=0;i<4;i++) this.hand.push(deck.pop()); this.nextCard = deck.pop();
        
        // 塔位修正: 玩家塔往後移 (Y更大)
        const pY = this.height - 100; const eY = 100; 
        const bL = this.width*0.25, bR = this.width*0.75;
        this.towers = [
            new Tower(bL, pY, 'player', false), new Tower(bR, pY, 'player', false), new Tower(this.width/2, pY+50, 'player', true),
            new Tower(bL, eY, 'enemy', false), new Tower(bR, eY, 'enemy', false), new Tower(this.width/2, eY-50, 'enemy', true)
        ];
        document.getElementById('enemy-name-txt').innerText = "等待對手...";
        this.renderHand();
    },

    surrender() { if(confirm("確定投降?")) { socket.emit('surrender', this.roomID); this.endGame(false); } },

    // Loop & Draw
    loop() {
        if(!this.running) return;
        requestAnimationFrame(() => this.loop());
        this.ctx.clearRect(0,0,this.width,this.height);
        
        // Map (Original)
        this.ctx.fillStyle = CONFIG.COLORS.GRASS; this.ctx.fillRect(0,0,this.width,this.height);
        this.ctx.fillStyle = 'rgba(0,0,0,0.03)'; for(let i=0;i<this.width;i+=40) for(let j=0;j<this.height;j+=40) if((i/40+j/40)%2===0) this.ctx.fillRect(i,j,40,40);
        const ry = this.height * CONFIG.RIVER_OFF;
        this.ctx.fillStyle = CONFIG.COLORS.WATER; this.ctx.fillRect(0, ry-30, this.width, 60);
        
        // Red Zone
        if (this.isDragging) {
            const d = CARDS[this.hand[this.dragIdx]];
            if (d.type !== 'spell') {
                this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)'; this.ctx.fillRect(0, 0, this.width, ry);
            }
        }

        const drawBridge = (bx) => {
            this.ctx.fillStyle = '#636e72'; this.ctx.fillRect(bx-30, ry-35, 60, 70);
            this.ctx.fillStyle = '#b2bec3'; this.ctx.fillRect(bx-26, ry-35, 52, 70);
            this.ctx.fillStyle = '#dfe6e9'; for(let i=0; i<6; i++) this.ctx.fillRect(bx-24, ry-30 + i*11, 48, 4);
            this.ctx.fillStyle = 'rgba(0,0,0,0.2)'; this.ctx.fillRect(bx-26, ry+35, 52, 5);
        };
        drawBridge(this.width*0.25); drawBridge(this.width*0.75);

        this.elixir = Math.min(10, this.elixir + CONFIG.ELIXIR_RATE); this.renderElixir();

        [...this.units, ...this.towers, ...this.projectiles].forEach(e => e.update());
        this.particles.updateAndDraw(this.ctx);
        this.units = this.units.filter(u=>!u.dead); this.towers = this.towers.filter(t=>!t.dead); this.projectiles = this.projectiles.filter(p=>!p.dead);

        [...this.towers, ...this.units].sort((a,b)=>a.pos.y-b.pos.y).forEach(e => e.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));
    },

    // Input (Tap to place included)
    onDown(e) {
        if(!this.running) return;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const cards = document.querySelectorAll('#hand-cards .card');
        let clickedCard = false;
        cards.forEach((el, i) => {
            const box = el.getBoundingClientRect();
            if(e.clientX>=box.left && e.clientX<=box.right && e.clientY>=box.top && e.clientY<=box.bottom) {
                if(this.elixir >= CARDS[this.hand[i]].cost) {
                    this.selIdx = i; this.dragIdx = i; this.isDragging = true;
                    this.dragPos = {x, y}; clickedCard = true; this.renderHand();
                }
            }
        });
        // Tap to Place
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
            if(y < this.height - 100) this.trySpawn(this.dragIdx, this.dragPos.x, this.dragPos.y);
            this.isDragging = false; this.dragIdx = null; this.selIdx = null; this.renderHand();
        }
    },

    trySpawn(idx, x, y) {
        const key = this.hand[idx]; const d = CARDS[key];
        if (d.type !== 'spell' && y < this.height * CONFIG.RIVER_OFF) { 
            const m=document.getElementById('message'); m.innerText="無法部署"; m.className='show'; setTimeout(()=>m.className='',1000);
            return; 
        }
        this.elixir -= d.cost;
        this.spawn(key, x, y, 'player');
        socket.emit('action', { roomID: this.roomID, type: 'spawn', card: key, nx: x/this.width, ny: y/this.height });
        this.hand[idx] = this.nextCard; this.nextCard = App.userData.deck[Math.floor(Math.random()*6)];
        this.renderHand();
    },

    spawn(key, x, y, team) {
        const d = CARDS[key];
        AudioSys.play('spawn');
        if(d.type==='spell') {
            Game.projectiles.push(new Projectile(new Vector2(this.width/2, team==='player'?this.height:0), new Vector2(x,y), d.dmg, d.aoe, key, team));
        } else {
            const count = d.count || 1;
            for(let i=0; i<count; i++) {
                let ox = (i-(count-1)/2)*15;
                this.units.push(new Unit(x+ox, y, team, key));
            }
            Game.particles.get(x, y, '#fff', 'spawn_flash', 0);
        }
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
            el.innerHTML=`<div class="cost">${d.cost}</div><div class="card-inner"><div class="emoji">${d.icon}</div><div class="name">${d.name}</div></div>`;
            c.appendChild(el);
        });
        document.getElementById('next-icon').innerText = CARDS[this.nextCard].icon;
        this.renderElixir();
    },
    
    triggerEmote(val) { this.showEmote(val, 'player'); socket.emit('action', { roomID: this.roomID, type: 'emote', val: val }); document.getElementById('emote-menu').classList.remove('open'); },
    showEmote(val, team) { const t = this.towers.find(t => t.team === team && t.isKing); if(t) Game.particles.get(t.pos.x, t.pos.y-60, null, 'emote', val); },
    
    endGame(win) {
        this.running = false; clearInterval(this.timerInt); if(socket) socket.disconnect();
        if(win === null) {
            const p = this.towers.filter(t=>t.team==='player').reduce((a,b)=>a+b.hp,0);
            const e = this.towers.filter(t=>t.team==='enemy').reduce((a,b)=>a+b.hp,0);
            win = p >= e;
        }
        document.getElementById('end-title').innerText = win ? "勝利" : "失敗";
        document.getElementById('end-title').style.color = win ? "#f1c40f" : "#e74c3c";
        const reward = win ? 50 : 10;
        App.userData.gold += reward; App.userData.wins += win?1:0; App.userData.loss += win?0:1; App.saveData();
        document.getElementById('reward-gold').innerText = reward;
        App.nav('end-screen');
    },

    // Editor Helpers
    openDeckEditor(){ document.getElementById('deck-editor').classList.remove('hidden'); this.renderEditor(); },
    closeDeckEditor(){ if(App.userData.deck.length===6) document.getElementById('deck-editor').classList.add('hidden'); else alert("需6張卡"); },
    renderEditor(){
        const g=document.getElementById('editor-grid'); g.innerHTML='';
        ALL_CARDS.forEach(k=>{
            const d=CARDS[k], el=document.createElement('div');
            const owned = App.userData.inventory.includes(k);
            const inDeck = App.userData.deck.includes(k);
            el.className=`card editor-card ${d.rarity} ${inDeck?'picked':''} ${!owned?'disabled':''}`;
            const rec = RECOMMENDED_CARDS.includes(k) ? `<div class="rec-tag">推薦</div>` : '';
            el.innerHTML=`${rec}<div class="cost">${d.cost}</div><div class="card-inner"><div class="emoji">${d.icon}</div></div>`;
            el.onclick=()=>{
                if(!owned) return;
                if(inDeck){ if(App.userData.deck.length>1) App.userData.deck=App.userData.deck.filter(c=>c!==k); }
                else{ if(App.userData.deck.length<6) App.userData.deck.push(k); }
                document.getElementById('editor-desc').innerText = `${d.name}: ${d.desc}`;
                this.renderEditor();
            };
            g.appendChild(el);
        });
    }
};