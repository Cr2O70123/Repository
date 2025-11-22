const App = {
    userData: {
        name: "玩家1",
        gold: 100,
        wins: 0,
        loss: 0,
        lastCheckIn: null,
        inventory: ['knight', 'archer', 'giant', 'fireball', 'musketeer', 'bats'],
        deck: ['knight', 'archer', 'giant', 'fireball', 'musketeer', 'bats']
    },
    userDeck: [], // 當前使用的牌組

    init() {
        this.loadData();
        this.userDeck = this.userData.deck;
        
        // 生成商店
        this.renderShop();
        // 生成排行榜 (假資料)
        this.renderLeaderboard();
        
        // 檢查簽到狀態
        const today = new Date().toDateString();
        if (this.userData.lastCheckIn === today) {
            // 已簽到
        }
    },

    loadData() {
        const d = localStorage.getItem('mini_clash_save');
        if(d) this.userData = JSON.parse(d);
        document.getElementById('nickname').value = this.userData.name;
        this.updateUI();
    },
    saveData() {
        this.userData.name = document.getElementById('nickname').value;
        localStorage.setItem('mini_clash_save', JSON.stringify(this.userData));
        this.updateUI();
    },
    updateUI() {
        document.getElementById('gold-display').innerText = this.userData.gold;
        document.getElementById('shop-gold').innerText = this.userData.gold;
        // Profile
        document.getElementById('p-name').innerText = this.userData.name;
        document.getElementById('p-wins').innerText = this.userData.wins;
        document.getElementById('p-loss').innerText = this.userData.loss;
        const total = this.userData.wins + this.userData.loss;
        document.getElementById('p-rate').innerText = total>0 ? Math.round((this.userData.wins/total)*100)+"%" : "0%";
    },

    nav(pageId) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            p.classList.remove('active');
        });
        const target = document.getElementById('page-' + pageId);
        if(target) {
            target.classList.remove('hidden');
            target.classList.add('active');
        }
        // 如果離開大廳，保存名字
        if(pageId !== 'lobby') this.saveData();
    },

    checkIn() {
        const today = new Date().toDateString();
        if (this.userData.lastCheckIn === today) {
            alert("今天已經簽到過了，明天再來！");
        } else {
            this.userData.gold += 100;
            this.userData.lastCheckIn = today;
            this.saveData();
            alert("簽到成功！獲得 100 金幣！");
        }
    },

    // --- 商店 ---
    renderShop() {
        const grid = document.getElementById('shop-grid');
        grid.innerHTML = '';
        SHOP_ITEMS.forEach(item => {
            const el = document.createElement('div');
            el.className = 'shop-item';
            el.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div class="shop-icon">${item.val.length<3 ? item.val : CARDS[item.val].icon}</div>
                    <div class="shop-info">
                        <div>${item.name}</div>
                        <div class="price">💰 ${item.price}</div>
                    </div>
                </div>
                <button class="btn btn-sec" onclick="App.buy('${item.id}', ${item.price}, '${item.type}', '${item.val}')">購買</button>
            `;
            grid.appendChild(el);
        });
    },
    buy(id, price, type, val) {
        if (this.userData.gold >= price) {
            if (type === 'card' && this.userData.inventory.includes(val)) {
                alert("你已經擁有這張卡了！");
                return;
            }
            this.userData.gold -= price;
            if (type === 'card') this.userData.inventory.push(val);
            // 表情購買邏輯可擴充
            this.saveData();
            alert("購買成功！");
        } else {
            alert("金幣不足！");
        }
    },

    // --- 排行榜 (模擬) ---
    renderLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        const names = ['王者無敵', '夜煞', '小可愛', '戰神', '快樂肥宅'];
        let html = '';
        names.forEach((n, i) => {
            html += `
            <div class="leader-item">
                <span style="font-weight:bold; color:${i===0?'#f1c40f':'#ccc'}">#${i+1}</span>
                <span style="flex:1; margin-left:10px;">${n}</span>
                <span>🏆 ${2000 - i*150}</span>
            </div>`;
        });
        list.innerHTML = html;
    },

    // --- 編輯器 ---
    openDeckEditor() {
        this.nav('editor');
        const grid = document.getElementById('editor-grid');
        grid.innerHTML = '';
        // 顯示所有卡牌 (標記擁有與未擁有)
        Object.keys(CARDS).forEach(k => {
            if(k === 'goblins') return;
            const d = CARDS[k];
            const owned = this.userData.inventory.includes(k);
            const inDeck = this.userData.deck.includes(k);
            
            const el = document.createElement('div');
            el.className = `card editor-card ${d.rarity} ${inDeck?'picked':''} ${!owned?'disabled':''}`;
            
            // 新手推薦標籤
            const tag = RECOMMENDED.includes(k) ? `<div class="rec-tag">推薦</div>` : '';
            
            el.innerHTML = `${tag}<div class="cost">${d.cost}</div><div class="card-inner"><div class="emoji">${d.icon}</div></div>`;
            el.onclick = () => {
                if (!owned) { alert("請先去商店購買此卡！"); return; }
                if (inDeck) {
                    if(this.userData.deck.length > 1) 
                        this.userData.deck = this.userData.deck.filter(c => c !== k);
                } else {
                    if(this.userData.deck.length < 6) this.userData.deck.push(k);
                }
                this.openDeckEditor(); // 刷新
                document.getElementById('editor-desc').innerText = `${d.name}: ${d.desc}`;
            };
            grid.appendChild(el);
        });
    },
    closeEditor() {
        if(this.userData.deck.length !== 6) { alert("牌組必須剛好 6 張！"); return; }
        this.userDeck = this.userData.deck;
        this.saveData();
        this.nav('lobby');
    }
};

window.onload = () => App.init();