// public/js/game.js

// --- 1. 基礎類別與特效 (從原版還原) ---
class Vector2 { constructor(x,y){this.x=x;this.y=y;} add(v){this.x+=v.x;this.y+=v.y;return this;} sub(v){this.x-=v.x;this.y-=v.y;return this;} mult(n){this.x*=n;this.y*=n;return this;} mag(){return Math.sqrt(this.x*this.x+this.y*this.y);} normalize(){let m=this.mag();if(m>0)this.mult(1/m);return this;} dist(v){return Math.hypot(this.x-v.x,this.y-v.y);} copy(){return new Vector2(this.x,this.y);}}

class ParticlePool {
    constructor(){this.pool=[];this.maxSize=200;}
    get(x,y,color,type,val){
        let p=this.pool.find(p=>!p.active);
        if(!p){if(this.pool.length<this.maxSize){p=new Particle();this.pool.push(p);}else return null;}
        p.reset(x,y,color,type,val); return p;
    }
    updateAndDraw(ctx){this.pool.forEach(p=>{if(p.active){p.update();p.draw(ctx);}});}
    clear(){this.pool.forEach(p=>p.active=false);}
}

class Particle {
    constructor(){this.active=false;this.pos=new Vector2(0,0);this.vel=new Vector2(0,0);}
    reset(x,y,color,type,val){
        this.active=true; this.pos.x=x; this.pos.y=y; this.type=type; this.color=color; this.life=1.0;
        if(type==='text'){this.text=val;this.scale=Math.min(2.0,0.8+(val/200));this.vel=new Vector2((Math.random()-0.5),-2.5);this.decay=0.02;}
        else if(type==='crit'){this.text=val+"!";this.scale=2.5;this.vel=new Vector2(0,-3);this.decay=0.015;this.color='#e74c3c';}
        else if(type==='shockwave'||type==='zap_wave'){this.vel=new Vector2(0,0);this.decay=0.04;this.size=10;this.maxSize=val;}
        else if(type==='soul'){this.vel=new Vector2(0,-1.5);this.pos.x+=(Math.random()-0.5)*10;this.decay=0.03;this.size=6;}
        else if(type==='spawn_flash'){this.vel=new Vector2(0,0);this.decay=0.08;this.size=10;}
        else if(type==='emote'){this.text=val;this.vel=new Vector2(0,-0.8);this.decay=0.01;this.life=2.5;}
        else if(type==='water_ripple'){this.vel=new Vector2(0.5,0);this.decay=0.01;this.size=Math.random()*5+2;}
        else{this.vel=new Vector2((Math.random()-0.5)*3,(Math.random()-0.5)*3);this.decay=0.05;this.size=Math.random()*4+2;}
    }
    update(){
        this.pos.add(this.vel); this.life-=this.decay; if(this.life<=0)this.active=false;
        if(this.type==='shockwave'||this.type==='zap_wave')this.size+=(this.maxSize-this.size)*0.2;
        if(this.type==='spawn_flash')this.size+=2; if(this.type==='soul')this.pos.x+=Math.sin(this.pos.y*0.1)*0.5;
    }
    draw(ctx){
        if(!this.active)return; ctx.globalAlpha=Math.max(0,this.life);
        if(this.type==='text'||this.type==='crit'){
            ctx.save(); ctx.translate(this.pos.x,this.pos.y); ctx.scale(this.scale,this.scale);
            ctx.font="900 16px sans-serif"; ctx.textAlign="center"; ctx.fillStyle=this.color; ctx.strokeStyle='#000'; ctx.lineWidth=3;
            ctx.strokeText(this.text,0,0); ctx.fillText(this.text,0,0); ctx.restore();
        } else if(this.type==='emote'){
            ctx.font="24px sans-serif"; ctx.textAlign="center"; ctx.fillStyle='black'; ctx.fillText(this.text,this.pos.x,this.pos.y-20);
        } else if(this.type==='shockwave'||this.type==='zap_wave'){
            ctx.strokeStyle=this.type==='zap_wave'?'#00b894':this.color; ctx.lineWidth=5*this.life;
            ctx.beginPath();ctx.arc(this.pos.x,this.pos.y,this.size,0,Math.PI*2);ctx.stroke();
        } else if(this.type==='spawn_flash'||this.type==='soul'){
            ctx.fillStyle=this.type==='soul'?'#a29bfe':'#fff'; ctx.beginPath();ctx.arc(this.pos.x,this.pos.y,this.size,0,Math.PI*2);ctx.fill();
        } else if(this.type==='water_ripple'){
            ctx.strokeStyle='rgba(255,255,255,0.4)'; ctx.lineWidth=1; ctx.beginPath();ctx.arc(this.pos.x,this.pos.y,this.size,0,Math.PI*2);ctx.stroke();
        } else {
            ctx.fillStyle=this.color; ctx.beginPath();ctx.arc(this.pos.x,this.pos.y,this.size,0,Math.PI*2);ctx.fill();
        }
        ctx.globalAlpha=1;
    }
}

// --- 2. 遊戲實體 (Unit, Tower, Projectile) 完全還原 ---
class Entity {
    constructor(x, y, team, radius) {
        this.pos = new Vector2(x, y); this.team = team; this.radius = radius;
        this.dead = false; this.flash = 0; this.maxHp = 100; this.hp = 100;
        this.knockbackVel = new Vector2(0,0); this.stunTimer = 0; this.shakeX = 0; this.shakeY = 0;
    }
    takeDamage(amt, isCrit = false) {
        this.hp -= amt; this.flash = 5; this.shakeX = (Math.random()-0.5)*6; this.shakeY = (Math.random()-0.5)*6;
        Game.particles.get(this.pos.x, this.pos.y - 30, '#fff', isCrit?'crit':'text', Math.floor(amt));
        if(this.hp <= 0) {
            this.dead = true;
            if(this.deathDmg) Game.projectiles.push(new Projectile(this.pos, new Vector2(0,0), this.deathDmg, 100, 'explosion', this.team));
            for(let i=0; i<3; i++) Game.particles.get(this.pos.x, this.pos.y, '#a55eea', 'soul', 0);
        }
    }
    drawHp(ctx, offset) {
        if(this.hp < this.maxHp && this.hp > 0) {
            const w = 32; const y = this.pos.y - this.radius - offset + this.shakeY; const x = this.pos.x + this.shakeX;
            ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - w/2 - 2, y - 2, w + 4, 8);
            ctx.fillStyle = this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
            ctx.fillRect(x - w/2, y, w * Math.max(0, this.hp/this.maxHp), 4);
        }
    }
    drawShadow(ctx) {
        ctx.fillStyle = this.type === 'air' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(this.pos.x, this.pos.y + (this.type==='air'?40:0), this.radius, this.radius*0.6, 0, 0, Math.PI*2); ctx.fill();
    }
}

class Unit extends Entity {
    constructor(x, y, team, key) {
        const d = CARDS[key]; super(x, y, team, d.radius);
        this.key = key; this.hp = d.hp; this.maxHp = d.hp; this.dmg = d.dmg; this.speed = d.speed;
        this.range = d.range; this.atkSpd = d.atkSpd; this.mass = d.mass; this.targetType = d.target;
        this.type = d.type || 'ground'; this.aoe = d.aoe || 0; this.deathDmg = d.deathDmg || 0;
        this.chargeSpeed = d.chargeSpeed || 0; this.chargeDmgMult = d.chargeDmgMult || 1; this.isCharging = false; this.moveTime = 0;
        this.atkTimer = 0; this.frame = Math.random() * 100; this.facing = 1; this.state = 'deploy';
        this.deployTimer = d.deployTime || 60; this.maxDeploy = this.deployTimer;
    }
    update() {
        if(this.dead) return; this.shakeX *= 0.8; this.shakeY *= 0.8;
        if(this.knockbackVel.mag() > 0.1) { this.pos.add(this.knockbackVel); this.knockbackVel.mult(0.85); this.collide(); return; }
        if(this.deployTimer > 0) { this.deployTimer--; return; }
        if(this.stunTimer > 0) { this.stunTimer--; return; }
        this.frame++; if(this.flash > 0) this.flash--; if(this.atkTimer > 0) this.atkTimer--;

        const target = this.findTarget();
        if(target) {
            const dist = this.pos.dist(target.pos);
            if(dist <= this.range + this.radius + target.radius) {
                this.state = 'attack'; if(this.atkTimer <= 0) this.attack(target);
                this.moveTime = 0; this.isCharging = false;
            } else if(this.speed > 0) {
                this.state = 'move'; this.moveTowards(target.pos); this.moveTime++;
                if(this.chargeSpeed > 0 && this.moveTime > 120) this.isCharging = true;
            }
        } else if (this.speed > 0) {
            this.state = 'move'; const goalY = this.team === 'player' ? -100 : Game.height + 100;
            this.moveTowards(new Vector2(this.pos.x, goalY)); this.moveTime++;
        }
        if(this.speed > 0) this.collide();
    }
    moveTowards(dest) {
        let target = dest.copy();
        const riverY = Game.height * CONFIG.RIVER_OFF;
        if(this.type !== 'air' && Math.abs(this.pos.y - riverY) > 20 && ((this.pos.y < riverY && dest.y > riverY) || (this.pos.y > riverY && dest.y < riverY))) {
            const bL = Game.width * 0.25, bR = Game.width * 0.75;
            const bridgeX = Math.abs(this.pos.x - bL) < Math.abs(this.pos.x - bR) ? bL : bR;
            target = new Vector2(bridgeX + (this.pos.x%30 - 15), riverY);
        }
        let currentSpeed = this.isCharging ? this.chargeSpeed : this.speed;
        const dir = target.sub(this.pos).normalize();
        this.pos.add(dir.mult(currentSpeed));
        if(dir.x > 0.1) this.facing = 1; else if(dir.x < -0.1) this.facing = -1;
        if(this.isCharging && this.frame % 4 === 0) Game.particles.get(this.pos.x, this.pos.y, '#f1c40f', 'spark', 0);
    }
    collide() {
        if(this.type === 'air') return;
        const force = new Vector2(0,0);
        Game.units.forEach(u => {
            if(u === this || u.dead || u.deployTimer > 0 || u.type === 'air') return;
            const d = this.pos.dist(u.pos), minD = this.radius + u.radius;
            if(d < minD) {
                const push = this.pos.copy().sub(u.pos).normalize();
                push.mult((minD - d) * 0.15 * Math.min(2, u.mass / this.mass));
                force.add(push);
            }
        });
        this.pos.add(force); this.pos.x = Math.max(15, Math.min(Game.width-15, this.pos.x));
    }
    findTarget() {
        const list = this.targetType === 'building' ? [...Game.towers, ...Game.units.filter(u=>u.type==='building')] : [...Game.towers, ...Game.units];
        let best = null, minD = Infinity;
        list.forEach(t => {
            if(t.team !== this.team && !t.dead && t.deployTimer <= 0) {
                if(t instanceof Tower && t.isKing && !t.active && t.team !== this.team) {
                    // 修正：如果公主塔還在，國王不被鎖定，除非只剩國王
                    const princess = Game.towers.filter(pt=>pt.team===t.team && !pt.isKing && !pt.dead);
                    if(princess.length > 0) return; 
                }
                const d = this.pos.dist(t.pos); if(d < minD) { minD = d; best = t; }
            }
        });
        if(!best && this.targetType !== 'building') best = Game.towers.find(t => t.team !== this.team && t.isKing);
        return best;
    }
    attack(target) {
        const finalDmg = this.isCharging ? this.dmg * this.chargeDmgMult : this.dmg;
        if(this.range > 50) Game.projectiles.push(new Projectile(this.pos, target, finalDmg, this.aoe, this.key, this.team));
        else {
            const isCrit = (this.key === 'minipekka' || this.isCharging);
            target.takeDamage(finalDmg, isCrit);
            AudioSys.play(this.isCharging ? 'charge_hit' : (isCrit ? 'heavy_hit' : 'attack'));
            Game.particles.get((this.pos.x+target.pos.x)/2, (this.pos.y+target.pos.y)/2, '#fff', 'spark', 0);
        }
        this.atkTimer = this.atkSpd;
    }
    draw(ctx) {
        ctx.save(); ctx.translate(this.pos.x + this.shakeX, this.pos.y + this.shakeY);
        if (this.type === 'air') ctx.translate(0, -40);
        if(this.deployTimer > 0) {
            ctx.globalAlpha = 0.6; ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.arc(0, 0, this.radius + 5, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ecf0f1'; ctx.beginPath(); ctx.moveTo(0,0); ctx.arc(0, 0, this.radius + 5, -Math.PI/2, -Math.PI/2 + (Math.PI*2 * (1 - this.deployTimer/this.maxDeploy))); ctx.lineTo(0,0); ctx.fill();
            ctx.restore(); return;
        }
        if(this.flash > 0) ctx.filter = 'brightness(3)';
        const colorMain = this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
        const bob = Math.sin(this.frame * 0.2) * 2; ctx.translate(0, -bob); ctx.scale(this.facing, 1);

        // --- 這裡還原了原版精緻的繪圖邏輯 ---
        if (this.key === 'giant') {
            ctx.fillStyle = '#d35400'; ctx.fillRect(-14, -28, 28, 28);
            ctx.fillStyle = '#e67e22'; ctx.beginPath(); ctx.arc(0, -34, 12, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = colorMain; ctx.fillRect(-14,-22,28,12);
        } else if (this.key === 'golem') {
            ctx.fillStyle = '#636e72'; ctx.beginPath(); ctx.arc(0, -15, 22, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#b2bec3'; ctx.beginPath(); ctx.arc(-8, -20, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(8, -20, 6, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(0, -10, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#ff7675'; ctx.beginPath(); ctx.arc(0, -15, 3, 0, Math.PI*2); ctx.fill();
        } else if (this.key === 'knight') {
            ctx.fillStyle = colorMain; ctx.beginPath(); ctx.arc(0, -8, 12, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
            ctx.save(); ctx.translate(10, -5);
            const swing = this.state === 'attack' ? Math.sin(this.frame*0.6)*1.5 : -0.5; ctx.rotate(swing);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(0, -12, 4, 24); ctx.fillRect(-3, 8, 10, 3); ctx.restore();
        } else if (this.key === 'archer') {
            ctx.fillStyle = '#2ecc71'; ctx.beginPath(); ctx.moveTo(0,-20); ctx.lineTo(-8,-5); ctx.lineTo(8,-5); ctx.fill();
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI*2); ctx.fill();
            ctx.strokeStyle = '#8e44ad'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, 0, 8, -Math.PI/2, Math.PI/2); ctx.stroke();
        } else if (this.key === 'musketeer') {
            ctx.fillStyle = '#9b59b6'; ctx.fillRect(-6, -18, 12, 18);
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#333'; ctx.fillRect(6, -14, 14, 4);
        } else if (this.key === 'prince') {
            ctx.fillStyle = colorMain; ctx.fillRect(-8, -15, 16, 15);
            ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(0, -22, 8, 0, Math.PI*2); ctx.fill();
            ctx.save(); ctx.translate(8, -10);
            const angle = this.state === 'move' ? Math.PI/4 : 0; ctx.rotate(angle);
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(25, -2); ctx.lineTo(25, 2); ctx.fill();
            if (this.isCharging) { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fillRect(0,-1,30,2); } ctx.restore();
        } else if (this.key === 'minipekka') {
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(-10,-20,20,20); ctx.fillStyle = colorMain; ctx.fillRect(-10,-15,20,5);
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
        } else if (this.key === 'bats') {
            ctx.fillStyle = '#6c5ce7'; ctx.beginPath(); ctx.arc(0, -5, 6, 0, Math.PI*2); ctx.fill();
            ctx.fillStyle = '#2d3436'; ctx.beginPath(); ctx.moveTo(-5,-5); ctx.lineTo(-12,-12); ctx.lineTo(-5,0); ctx.fill(); ctx.beginPath(); ctx.moveTo(5,-5); ctx.lineTo(12,-12); ctx.lineTo(5,0); ctx.fill();
        } else if (this.key === 'goblins') {
            ctx.fillStyle = '#55efc4'; ctx.beginPath(); ctx.arc(0,-5,8,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(-6,-10); ctx.lineTo(-12,-18); ctx.lineTo(0,-10); ctx.fill(); ctx.beginPath(); ctx.moveTo(6,-10); ctx.lineTo(12,-18); ctx.lineTo(0,-10); ctx.fill();
        } else if (this.key === 'cannon') {
            ctx.fillStyle = '#7f8c8d'; ctx.fillRect(-15, -15, 30, 30); ctx.fillStyle = '#2c3e50'; ctx.beginPath(); ctx.arc(0,0,12,0,Math.PI*2); ctx.fill();
            ctx.fillStyle = colorMain; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
            const t = this.findTarget(); const angle = t ? Math.atan2(t.pos.y - this.pos.y, t.pos.x - this.pos.x) : -Math.PI/2; ctx.rotate(angle);
            ctx.fillStyle = '#2c3e50'; ctx.fillRect(0,-6,24,12);
        } else {
            ctx.fillStyle = (this.key==='skarmy'?'#fff':colorMain); ctx.beginPath(); ctx.arc(0, -5, this.radius-2, 0, Math.PI*2); ctx.fill();
        }
        
        ctx.restore(); this.drawHp(ctx, this.radius+(this.type==='air'?45:5));
    }
}

class Tower extends Entity {
    constructor(x, y, team, isKing) {
        super(x, y, team, isKing ? 32 : 24);
        this.isKing = isKing; this.active = !isKing;
        this.maxHp = isKing ? 4000 : 2500; this.hp = this.maxHp;
        this.dmg = isKing ? 120 : 90; this.range = 160; this.atkTimer = 0; this.deployTimer = 0; this.name = "";
    }
    update() {
        if(this.dead) return; this.shakeX *= 0.8; this.shakeY *= 0.8; if(this.flash > 0) this.flash--;
        if(this.isKing && !this.active) { if(this.hp < this.maxHp || Game.towers.some(t => t.team === this.team && !t.isKing && t.dead)) this.active = true; }
        if(!this.active) return; if(this.atkTimer > 0) { this.atkTimer--; return; }
        let target = null, minD = this.range;
        Game.units.forEach(u => { if(u.team !== this.team && !u.dead && u.deployTimer <= 0) { const d = this.pos.dist(u.pos); if(d < minD) { minD = d; target = u; } } });
        if(target) {
            const spawnY = this.pos.y - (this.isKing ? 40 : 30);
            Game.projectiles.push(new Projectile(new Vector2(this.pos.x, spawnY), target, this.dmg, 0, 'arrow', this.team));
            this.atkTimer = 45;
        }
    }
    draw(ctx) {
        const x = this.pos.x + this.shakeX, y = this.pos.y + this.shakeY;
        const teamCol = this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E;
        ctx.save(); if(this.flash > 0) ctx.translate((Math.random()-0.5)*4, (Math.random()-0.5)*4);
        ctx.fillStyle = '#95a5a6'; const w = this.radius * 1.8; const h = this.isKing ? 40 : 30;
        ctx.fillRect(x - w/2, y - 10, w, 20);
        ctx.fillStyle = '#bdc3c7'; ctx.fillRect(x - w/2 + 4, y - 10 - h, w - 8, h);
        ctx.fillStyle = teamCol; ctx.fillRect(x - w/2 + 4, y - 10 - h + 5, w - 8, 6);
        const topY = y - 10 - h;
        if(this.isKing) {
            if(this.active) {
                ctx.fillStyle = teamCol; ctx.beginPath(); ctx.moveTo(x - w/2 - 2, topY - 6); ctx.lineTo(x + w/2 + 2, topY - 6); ctx.lineTo(x, topY - 30); ctx.fill();
                ctx.strokeStyle = '#f1c40f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, topY-30); ctx.lineTo(x, topY-45); ctx.stroke();
            } else {
                ctx.fillStyle = teamCol; ctx.fillRect(x - 15, topY - 20, 30, 20);
                ctx.font = "20px sans-serif"; ctx.textAlign="center"; ctx.fillText("💤", x, topY - 25 + (Math.sin(Date.now()/300)*5));
            }
        } else {
            ctx.fillStyle = '#bdc3c7'; ctx.beginPath(); ctx.moveTo(x - w/2, topY - 6); ctx.lineTo(x + w/2, topY - 6); ctx.lineTo(x, topY - 20); ctx.fill();
        }
        ctx.restore(); this.drawHp(ctx, this.isKing ? 65 : 45);
    }
}

class Projectile {
    constructor(pos, target, dmg, aoe, type, ownerTeam) {
        this.pos = pos.copy(); this.startPos = pos.copy(); this.target = target; this.dmg = dmg; this.aoe = aoe; this.type = type; this.team = ownerTeam;
        this.isSpell = (type === 'fireball' || type === 'barrel' || type === 'zap');
        this.dest = this.isSpell ? target.copy() : target.pos.copy();
        if(type === 'explosion') { this.isSpell = true; this.dest = pos.copy(); this.speed = 999; }
        else { const dist = this.pos.dist(this.dest); this.speed = type==='barrel'?Math.max(3,dist/60) : (type==='fireball'?6:7); }
        this.height = 0; this.dead = false; this.spawnOnHit = CARDS[type]?.spawnUnit || null; this.knockback = CARDS[type]?.knockback || 0; this.stun = CARDS[type]?.stun || 0;
    }
    update() {
        if(!this.isSpell && !this.target.dead) this.dest = this.target.pos.copy();
        const distToTarget = this.pos.dist(this.dest); const travelled = this.pos.dist(this.startPos);
        if (this.isSpell && this.type !== 'zap' && this.type !== 'explosion') {
            const progress = travelled / (travelled + distToTarget);
            this.height = Math.sin(progress * Math.PI) * (this.type==='barrel'?200:120);
        }
        if(distToTarget < this.speed + 5 && this.height < 15) { this.hit(); }
        else { const dir = this.dest.copy().sub(this.pos).normalize(); this.pos.add(dir.mult(this.speed)); }
    }
    hit() {
        this.dead = true;
        if (this.spawnOnHit) {
            for(let i=0; i<3; i++) Game.units.push(new Unit(this.pos.x+(i-1)*15, this.pos.y, this.team, this.spawnOnHit));
            AudioSys.play('boom'); return;
        }
        let targets = [];
        if(this.isSpell || this.aoe > 0) {
            const center = this.isSpell ? this.dest : this.pos;
            const r = this.aoe > 0 ? this.aoe : 10;
            targets = [...Game.units, ...Game.towers].filter(e => e.pos.dist(center) <= r);
            if(this.isSpell) { 
                Game.particles.get(center.x, center.y, this.type==='zap'?'#55efc4':'#e74c3c', this.type==='zap'?'zap_wave':'shockwave', r); 
                AudioSys.play(this.type==='zap'?'zap':'boom');
            }
        } else if(!this.target.dead) targets = [this.target];

        targets.forEach(t => {
            if(t.team !== this.team) {
                t.takeDamage(this.dmg);
                if(this.knockback > 0 && t instanceof Unit && t.mass < 10) t.knockbackVel.add(t.pos.copy().sub(this.pos).normalize().mult(this.knockback * (2/t.mass)));
                if(this.stun > 0) t.stunTimer = Math.max(t.stunTimer, this.stun);
            }
        });
    }
    draw(ctx) {
        if(this.type === 'zap') return; ctx.save();
        const drawY = this.pos.y - this.height; ctx.translate(this.pos.x, drawY);
        if(this.type === 'arrow') {
            const angle = Math.atan2(this.dest.y - this.pos.y, this.dest.x - this.pos.x); ctx.rotate(angle);
            ctx.fillStyle = '#bdc3c7'; ctx.fillRect(-10, -1, 20, 2);
            ctx.fillStyle = (this.team === 'player' ? CONFIG.COLORS.P : CONFIG.COLORS.E); ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(5, -3); ctx.lineTo(5, 3); ctx.fill();
        } else {
            ctx.fillStyle = (this.type === 'fireball') ? '#e74c3c' : '#f1c40f';
            if (this.type === 'barrel') { ctx.rotate(this.height * 0.1); ctx.fillStyle = '#d35400'; ctx.fillRect(-6, -8, 12, 16); }
            else ctx.beginPath(); ctx.arc(0, 0, this.type==='fireball'?8:3, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
}

// --- 3. 遊戲主控 (Game Loop & Socket) ---
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
        AudioSys.init(); this.renderElixir();
    },
    resize(){ const w=document.getElementById('canvas-wrapper'); this.width=w.clientWidth; this.height=w.clientHeight; this.canvas.width=this.width; this.canvas.height=this.height; },

    findMatch() {
        this.playerName = document.getElementById('nickname').value || "玩家";
        document.getElementById('btn-battle').disabled = true;
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
        let deck = [...App.userDeck, ...App.userDeck].sort(()=>Math.random()-0.5);
        for(let i=0;i<4;i++) this.hand.push(deck.pop()); this.nextCard = deck.pop();
        // 塔位調整 (己方後移)
        const pY = this.height - 120; const eY = 120; const bL = this.width*0.25, bR = this.width*0.75;
        this.towers = [
            new Tower(bL, pY, 'player', false), new Tower(bR, pY, 'player', false), new Tower(this.width/2, pY+60, 'player', true),
            new Tower(bL, eY, 'enemy', false), new Tower(bR, eY, 'enemy', false), new Tower(this.width/2, eY-60, 'enemy', true)
        ];
        document.getElementById('enemy-name-txt').innerText = "等待對手...";
        this.renderHand();
    },

    surrender() { if(confirm("投降？")) { socket.emit('surrender', this.roomID); this.endGame(false); } },

    // Loop & Draw
    loop() {
        if(!this.running) return;
        requestAnimationFrame(() => this.loop());
        this.ctx.clearRect(0,0,this.width,this.height);
        
        // Draw Map (Original V1)
        this.ctx.fillStyle = CONFIG.COLORS.GRASS; this.ctx.fillRect(0,0,this.width,this.height);
        this.ctx.fillStyle = 'rgba(0,0,0,0.03)'; for(let i=0;i<this.width;i+=40) for(let j=0;j<this.height;j+=40) if((i/40+j/40)%2===0) this.ctx.fillRect(i,j,40,40);
        const ry = this.height * CONFIG.RIVER_OFF;
        this.ctx.fillStyle = CONFIG.COLORS.WATER; this.ctx.fillRect(0, ry-30, this.width, 60);
        const drawBridge = (bx) => {
            this.ctx.fillStyle = '#636e72'; this.ctx.fillRect(bx-30, ry-35, 60, 70);
            this.ctx.fillStyle = '#b2bec3'; this.ctx.fillRect(bx-26, ry-35, 52, 70);
            this.ctx.fillStyle = '#dfe6e9'; for(let i=0; i<6; i++) this.ctx.fillRect(bx-24, ry-30 + i*11, 48, 4);
        };
        drawBridge(this.width*0.25); drawBridge(this.width*0.75);

        // Red Zone
        if (this.isDragging) {
            const d = CARDS[this.hand[this.dragIdx]];
            if (d.type !== 'spell') {
                this.ctx.fillStyle = 'rgba(231, 76, 60, 0.3)'; this.ctx.fillRect(0, 0, this.width, ry);
            }
        }

        this.elixir = Math.min(10, this.elixir + CONFIG.ELIXIR_RATE); this.renderElixir();

        [...this.units, ...this.towers, ...this.projectiles].forEach(e => e.update());
        this.particles.updateAndDraw(this.ctx);
        this.units = this.units.filter(u=>!u.dead); this.towers = this.towers.filter(t=>!t.dead); this.projectiles = this.projectiles.filter(p=>!p.dead);

        [...this.towers, ...this.units].sort((a,b)=>a.pos.y-b.pos.y).forEach(e => e.draw(this.ctx));
        this.projectiles.forEach(p => p.draw(this.ctx));

        if(!this.towers.some(t=>t.team==='player' && t.isKing)) this.endGame(false);
        else if(!this.towers.some(t=>t.team==='enemy' && t.isKing)) this.endGame(true);
    },

    // Inputs
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
        if (d.type !== 'spell' && y < this.height * CONFIG.RIVER_OFF) { this.msg("無法部署於此"); return; }
        this.elixir -= d.cost;
        this.spawn(key, x, y, 'player');
        socket.emit('action', { roomID: this.roomID, type: 'spawn', card: key, nx: x/this.width, ny: y/this.height });
        this.hand[idx] = this.nextCard; this.nextCard = App.userDeck[Math.floor(Math.random()*6)];
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
    
    msg(t){ const m=document.getElementById('message'); m.innerText=t; m.className='show'; setTimeout(()=>m.className='',1000); },
    
    showEmote(val, team) {
        const t = this.towers.find(t => t.team === team && t.isKing);
        if(t) Game.particles.get(t.pos.x, t.pos.y-60, null, 'emote', val);
    },
    
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
    }
};