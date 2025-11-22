const App = {
    userData: {
        name: "玩家1",
        gold: 500,
        wins: 0,
        loss: 0,
        lastCheckIn: null,
        inventory: ['knight', 'archer', 'fireball', 'musketeer', 'bats', 'giant'],
        deck: ['knight', 'archer', 'giant', 'fireball', 'musketeer', 'bats']
    },
    userDeck: [],

    init() {
        this.loadData();
        this.userDeck = this.userData.deck;
        this.renderShop();
        this.renderLeaderboard();
        document.getElementById('nickname').value = this.userData.name;
    },

    loadData() {
        const d = localStorage.getItem('mini_clash_v2');
        if(d) this.userData = JSON.parse(d);
        else {
            // 隨機名字
            this.userData.name = RANDOM_NAMES[Math.floor(Math.random()*RANDOM_NAMES.length)];
            this.saveData();
        }
        this.updateUI();
    },
    saveData() {
        this.userData.name = document.getElementById('nickname').value;
        localStorage.setItem('mini_clash_v2', JSON.stringify(this.userData));
        this.updateUI();
    },
    updateUI() {
        document.getElementById('gold-display').innerText = this.userData.gold;
        document.getElementById('shop-gold').innerText = this.userData.gold;
        document.getElementById('p-name').innerText = this.userData.name;
        document.getElementById('p-wins').innerText = this.userData.wins;
        document.getElementById('p-loss').innerText = this.userData.loss;
        const t = this.userData.wins + this.userData.loss;
        document.getElementById('p-rate').innerText = t>0 ? Math.round((this.userData.wins/t)*100)+"%" : "0%";
    },

    nav(page) {
        document.querySelectorAll('.page').forEach(p => {
            p.classList.add('hidden');
            p.classList.remove('active');
        });
        const t = document.getElementById('page-' + page);
        if(t) {
            t.classList.remove('hidden');
            t.classList.add('active');
        }
        if(page!=='lobby') this.saveData();
    },

    dailyCheckIn() {
        const today = new Date().toDateString();
        if (this.userData.lastCheckIn === today) {
            alert("今天已簽到！");
        } else {
            this.userData.gold += 100;
            this.userData.lastCheckIn = today;
            this.saveData();
            alert("簽到成功！獲得 100 金幣");
        }
    },

    renderShop() {
        const list = document.getElementById('shop-list'); list.innerHTML = '';
        SHOP_ITEMS.forEach(item => {
            const el = document.createElement('div');
            el.className = 'list-item';
            const icon = item.type==='card' ? CARDS[item.val].icon : item.val;
            el.innerHTML = `
                <div style="display:flex; align-items:center;">
                    <div style="font-size:30px; width:40px;">${icon}</div>
                    <div style="margin-left:10px;">
                        <div style="font-weight:bold;">${item.name}</div>
                        <div class="price-tag">💰 ${item.price}</div>
                    </div>
                </div>
                <button class="btn btn-secondary" style="padding:5px 15px; font-size:14px;" 
                    onclick="App.buy('${item.type}', '${item.val}', ${item.price})">購買</button>
            `;
            list.appendChild(el);
        });
    },
    buy(type, val, price) {
        if (this.userData.gold >= price) {
            if (type === 'card' && this.userData.inventory.includes(val)) { alert("已擁有此卡牌"); return; }
            this.userData.gold -= price;
            if (type === 'card') this.userData.inventory.push(val);
            this.saveData();
            alert("購買成功！");
        } else {
            alert("金幣不足！");
        }
    },

    renderLeaderboard() {
        const list = document.getElementById('leaderboard-list'); list.innerHTML='';
        const ranks = [
            {n:'王者無敵',s:2500}, {n:'夜煞',s:2300}, {n:'小可愛',s:2100}, 
            {n:'戰神',s:1950}, {n:'快樂肥宅',s:1800}
        ];
        ranks.forEach((r,i)=>{
            const el=document.createElement('div');
            el.className='list-item';
            el.innerHTML=`
                <div style="display:flex; align-items:center; width:100%;">
                    <span style="font-weight:bold; width:30px; color:${i===0?'gold':'#ccc'}">#${i+1}</span>
                    <span style="flex:1;">${r.n}</span>
                    <span>🏆 ${r.s}</span>
                </div>
            `;
            list.appendChild(el);
        });
    }
};

window.onload = () => App.init();