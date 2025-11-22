// ... (接續原本的 initAndStart) ...

    reset(userDeck) {
        // 1. 修正原本斷掉的地方
        this.units = []; 
        this.projectiles = []; // 修正這裡
        this.towers = [];
        this.particles.clear();
        this.elixir = 5;
        
        // 2. 初始化雙方塔 (國王塔與公主塔)
        // 玩家 (下方)
        this.towers.push(new Tower(this.width * 0.5, this.height - 80, 'player', true)); // 國王
        this.towers.push(new Tower(this.width * 0.2, this.height - 140, 'player', false)); // 左公主
        this.towers.push(new Tower(this.width * 0.8, this.height - 140, 'player', false)); // 右公主
        
        // 敵人 (上方)
        this.towers.push(new Tower(this.width * 0.5, 80, 'enemy', true));
        this.towers.push(new Tower(this.width * 0.2, 140, 'enemy', false));
        this.towers.push(new Tower(this.width * 0.8, 140, 'enemy', false));

        // 3. 初始化手牌
        this.deck = [...userDeck]; 
        // 簡單洗牌
        this.deck.sort(() => Math.random() - 0.5);
        this.hand = this.deck.slice(0, 4);
        this.nextCard = this.deck[4] || this.deck[0];
    },

    loop() {
        if (!this.running) return;
        
        // 清空畫布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 繪製背景 (河流與橋)
        this.drawBackground(this.ctx);

        // 更新邏輯
        this.update();

        // 繪製所有物件 (塔、單位、特效、介面)
        this.draw(this.ctx);

        requestAnimationFrame(() => this.loop());
    },

    update() {
        // 聖水回復 (假設每秒回復 0.35 左右，這裡簡化)
        if (this.elixir < 10) this.elixir += 0.015; 

        // 更新單位、塔、投射物
        this.towers.forEach(t => t.update());
        
        // 過濾死亡單位
        this.units = this.units.filter(u => !u.dead);
        this.units.forEach(u => u.update());
        
        this.projectiles = this.projectiles.filter(p => !p.dead);
        this.projectiles.forEach(p => p.update());

        // 粒子特效更新
        this.particles.updateAndDraw(this.ctx);

        // 檢查遊戲結束條件 (國王塔倒塌)
        const pKing = this.towers.find(t => t.team === 'player' && t.isKing);
        const eKing = this.towers.find(t => t.team === 'enemy' && t.isKing);
        
        if (pKing && pKing.dead) this.endGame('loss');
        else if (eKing && eKing.dead) this.endGame('win');
    },

    drawBackground(ctx) {
        // 草地
        ctx.fillStyle = '#2ecc71';
        ctx.fillRect(0, 0, this.width, this.height);
        
        // 河流
        const riverY = this.height * 0.5; // 假設 CONFIG.RIVER_OFF 是 0.5
        ctx.fillStyle = '#3498db';
        ctx.fillRect(0, riverY - 20, this.width, 40);
        
        // 橋樑
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(this.width * 0.25 - 20, riverY - 22, 40, 44); // 左橋
        ctx.fillRect(this.width * 0.75 - 20, riverY - 22, 40, 44); // 右橋
    },

    draw(ctx) {
        // 繪製順序：塔 -> 單位 -> 投射物 -> UI
        this.towers.forEach(t => t.draw(ctx));
        this.units.sort((a, b) => a.pos.y - b.pos.y).forEach(u => u.draw(ctx)); // 簡單的深度排序
        this.projectiles.forEach(p => p.draw(ctx));

        // 繪製 UI (聖水與手牌)
        this.drawUI(ctx);
    },

    drawUI(ctx) {
        // 底部黑色背景
        const h = 120; 
        const y = this.height - h;
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(0, y, this.width, h);

        // 聖水條
        ctx.fillStyle = '#e74c3c';
        ctx.font = '16px Arial';
        ctx.fillText(`聖水: ${Math.floor(this.elixir)}`, 10, y - 10);
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(0, y - 5, this.width * (this.elixir / 10), 5);

        // 手牌
        const cardW = 60, cardH = 80, gap = 10;
        const startX = (this.width - (4 * cardW + 3 * gap)) / 2;

        this.hand.forEach((key, i) => {
            const cx = startX + i * (cardW + gap);
            const cy = y + 20;
            const card = CARDS[key];

            // 判斷是否正在拖曳這張牌
            if (this.isDragging && this.dragIdx === i) {
                ctx.globalAlpha = 0.5; // 原本位置半透明
            }

            // 聖水足夠則亮起，否則變暗
            const canAfford = this.elixir >= card.price / 100; // 假設 price 100 = 1 聖水 (需根據你的邏輯調整)
            ctx.fillStyle = canAfford ? '#fff' : '#7f8c8d';
            ctx.fillRect(cx, cy, cardW, cardH);
            
            // 卡片內容
            ctx.fillStyle = '#000';
            ctx.textAlign = 'center';
            ctx.fillText(card.icon, cx + cardW/2, cy + cardH/2);
            ctx.fillText(card.price/100 || "?", cx + 10, cy + 20); // 顯示費用

            ctx.globalAlpha = 1.0;
        });

        // 顯示 "下張牌"
        ctx.fillStyle = '#95a5a6';
        ctx.fillText("Next:", 40, y + 50);
        ctx.fillText(CARDS[this.nextCard].icon, 40, y + 80);

        // 繪製拖曳中的卡片
        if (this.isDragging && this.dragIdx !== null) {
            const card = CARDS[this.hand[this.dragIdx]];
            ctx.save();
            ctx.translate(this.dragPos.x, this.dragPos.y);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(0, 0, card.radius || 20, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000';
            ctx.fillText(card.icon, 0, 5);
            ctx.restore();
            
            // 範圍指示圈
            ctx.strokeStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.dragPos.x, this.dragPos.y, card.range || 50, 0, Math.PI*2);
            ctx.stroke();
        }
    },

    // --- 輸入事件處理 ---
    onDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 檢查是否點擊了手牌區域
        if (y > this.height - 120) {
            const cardW = 60, gap = 10;
            const startX = (this.width - (4 * cardW + 3 * gap)) / 2;
            // 簡單判斷點擊了哪張牌
            for(let i=0; i<4; i++) {
                const cx = startX + i * (cardW + gap);
                if (x >= cx && x <= cx + cardW) {
                    this.isDragging = true;
                    this.dragIdx = i;
                    this.dragPos = {x, y};
                    AudioSys.play('ui');
                    break;
                }
            }
        }
    },

    onMove(e) {
        if (!this.isDragging) return;
        const rect = this.canvas.getBoundingClientRect();
        this.dragPos.x = e.clientX - rect.left;
        this.dragPos.y = e.clientY - rect.top;
    },

    onUp(e) {
        if (!this.isDragging) return;
        
        // 檢查放置位置是否合法 (不能放在 UI 區，且要在己方區域 - 這裡簡化為 y > 河流)
        const riverY = this.height * 0.5; 
        const cardKey = this.hand[this.dragIdx];
        const cardData = CARDS[cardKey];
        const cost = (cardData.price / 100) || 3; // 假設轉換公式

        if (this.dragPos.y < this.height - 120 && this.elixir >= cost) {
            // 1. 判斷放置區域 (簡化：不能放在河對岸，除非是法術)
            if (cardData.type !== 'spell' && this.dragPos.y < riverY) {
                // 無效放置
                alert("不能放在敵方區域！");
            } else {
                // 2. 成功召喚
                this.spawn(cardKey, this.dragPos.x, this.dragPos.y, 'player');
                this.elixir -= cost;
                
                // 通知伺服器
                if(socket) {
                    socket.emit('deploy', { 
                        card: cardKey, 
                        nx: this.dragPos.x / this.width, // 正規化座標傳給對手
                        ny: this.dragPos.y / this.height 
                    });
                }

                // 循環手牌
                this.hand[this.dragIdx] = this.nextCard;
                // 簡單隨機抽下一張 (實際應從 deck 抽)
                this.nextCard = this.deck[Math.floor(Math.random() * this.deck.length)];
            }
        }

        this.isDragging = false;
        this.dragIdx = null;
    },

    spawn(key, x, y, team) {
        // 建立單位
        if (CARDS[key].type === 'spell') {
            // 法術直接產生效果 (或是生成一個 Projectile 飛過去)
            Game.projectiles.push(new Projectile(
                new Vector2(x, y - 300), // 從天而降
                new Vector2(x, y), // 目標點 (法術需要稍微修改 Projectile 類別以支援座標目標)
                CARDS[key].dmg, 
                100, // AOE 範圍
                key, 
                team
            ));
        } else {
            this.units.push(new Unit(x, y, team, key));
            AudioSys.play('spawn');
            this.particles.get(x, y, '#fff', 'spawn_flash', 0);
        }
    },

    endGame(result) {
        this.running = false;
        clearInterval(this.timerInt);
        alert(result === 'win' ? "勝利！" : result === 'loss' ? "失敗..." : "時間到！");
        if(socket) socket.emit('game_over', result);
        App.nav('lobby');
    }
};
