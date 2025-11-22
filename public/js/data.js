// public/js/data.js

const CONFIG = {
    ELIXIR_RATE: 0.018, MAX_ELIXIR: 10, GAME_TIME: 180, DBL_ELIXIR: 60,
    RIVER_OFF: 0.5, BRIDGE_W: 60,
    COLORS: { P: '#3498db', E: '#e74c3c', GRASS: '#27ae60', WATER: '#48dbfb' }
};

const CARDS = {
    knight: { id: 'knight', name: '騎士', desc: '近戰坦克，攻守兼備', cost: 3, count: 1, hp: 1400, dmg: 130, speed: 0.35, range: 0, atkSpd: 65, type: 'ground', target: 'any', icon: '⚔️', radius: 16, mass: 6.0, deployTime: 60, rarity: 'common' },
    archer: { id: 'archer', name: '弓箭手', desc: '遠程輸出，雙人組', cost: 3, count: 2, hp: 350, dmg: 80, speed: 0.4, range: 110, atkSpd: 50, type: 'ground', target: 'any', icon: '🏹', radius: 12, mass: 1.5, deployTime: 60, rarity: 'common' },
    musketeer: { id: 'musketeer', name: '火槍手', desc: '超遠射程，單體高傷', cost: 4, count: 1, hp: 600, dmg: 180, speed: 0.35, range: 140, atkSpd: 60, type: 'ground', target: 'any', icon: '👒', radius: 14, mass: 2.0, deployTime: 60, rarity: 'rare' },
    giant: { id: 'giant', name: '巨人', desc: '只打建築，超厚肉盾', cost: 5, count: 1, hp: 3500, dmg: 250, speed: 0.2, range: 0, atkSpd: 120, type: 'ground', target: 'building', icon: '🦍', radius: 28, mass: 30.0, deployTime: 120, rarity: 'rare' },
    prince: { id: 'prince', name: '王子', desc: '衝鋒陷陣，雙倍傷害', cost: 5, count: 1, hp: 1600, dmg: 325, speed: 0.35, range: 0, atkSpd: 80, type: 'ground', target: 'any', icon: '🐎', radius: 18, mass: 8.0, deployTime: 60, chargeSpeed: 0.75, chargeDmgMult: 2.0, rarity: 'epic' },
    skarmy: { id: 'skarmy', name: '骷髏軍團', desc: '人海戰術，脆弱高傷', cost: 3, count: 5, hp: 60, dmg: 40, speed: 0.55, range: 0, atkSpd: 30, type: 'ground', target: 'any', icon: '💀', radius: 8, mass: 0.5, deployTime: 30, rarity: 'epic' },
    wizard: { id: 'wizard', name: '法師', desc: '範圍傷害，清兵利器', cost: 5, count: 1, hp: 700, dmg: 180, speed: 0.3, range: 120, atkSpd: 90, type: 'ground', target: 'any', icon: '🧙‍♂️', aoe: 60, radius: 14, mass: 2.5, deployTime: 60, rarity: 'rare' },
    bats: { id: 'bats', name: '蝙蝠', desc: '空中群體，極速攻擊', cost: 2, count: 4, hp: 50, dmg: 50, speed: 0.7, range: 0, atkSpd: 25, type: 'air', target: 'any', icon: '🦇', radius: 8, mass: 0.5, deployTime: 30, rarity: 'common' },
    minipekka: { id: 'minipekka', name: '迷你皮卡', desc: '單體爆發，切坦神器', cost: 4, count: 1, hp: 1100, dmg: 550, speed: 0.55, range: 0, atkSpd: 95, type: 'ground', target: 'any', icon: '🤖', radius: 16, mass: 5.0, deployTime: 60, rarity: 'rare' },
    hogrider: { id: 'hogrider', name: '野豬騎士', desc: '快速突擊，直指建築', cost: 4, count: 1, hp: 1400, dmg: 260, speed: 0.8, range: 0, atkSpd: 70, type: 'ground', target: 'building', icon: '🐷', radius: 18, mass: 5.0, deployTime: 60, rarity: 'rare' },
    babydragon: { id: 'babydragon', name: '飛龍寶寶', desc: '空中範圍攻擊，有點肉', cost: 4, count: 1, hp: 1000, dmg: 130, speed: 0.45, range: 90, atkSpd: 80, type: 'air', target: 'any', icon: '🐲', aoe: 50, radius: 16, mass: 4.0, deployTime: 60, rarity: 'epic' },
    golem: { id: 'golem', name: '戈崙石人', desc: '究極肉盾，死亡爆炸', cost: 8, count: 1, hp: 4500, dmg: 280, speed: 0.15, range: 0, atkSpd: 140, type: 'ground', target: 'building', icon: '🗿', radius: 32, mass: 50.0, deployTime: 180, deathDmg: 300, rarity: 'legendary' },
    fireball: { id: 'fireball', name: '火球術', desc: '區域法術，擊退效果', cost: 4, count: 1, hp: 0, dmg: 350, speed: 0, range: 0, atkSpd: 0, type: 'spell', target: 'any', icon: '🔥', aoe: 110, knockback: 8, rarity: 'rare' },
    zap: { id: 'zap', name: '電擊法術', desc: '低費暈眩，打斷攻擊', cost: 2, count: 1, hp: 0, dmg: 70, speed: 0, range: 0, atkSpd: 0, type: 'spell', target: 'any', icon: '⚡', aoe: 80, stun: 60, rarity: 'common' },
    barrel: { id: 'barrel', name: '哥布林飛桶', desc: '全圖偷襲，落地生兵', cost: 3, count: 1, hp: 0, dmg: 50, speed: 0, range: 0, atkSpd: 0, type: 'spell', target: 'any', icon: '🛢️', spawnUnit: 'goblins', knockback: 0, rarity: 'epic' },
    cannon: { id: 'cannon', name: '加農砲', desc: '防禦建築，壽命有限', cost: 3, count: 1, hp: 800, dmg: 100, speed: 0, range: 120, atkSpd: 60, type: 'building', target: 'any', icon: '⚙️', radius: 20, mass: 100, lifeTime: 1800, deployTime: 180, rarity: 'common' },
    goblins: { id: 'goblins', name: '哥布林', cost: 2, count: 3, hp: 180, dmg: 90, speed: 0.65, range: 0, atkSpd: 35, type: 'ground', target: 'any', icon: '👺', radius: 10, mass: 0.8, deployTime: 10, rarity: 'common' }
};

const SHOP_ITEMS = [
    { id: 'emote_1', type: 'emote', val: '😎', price: 200, name: '墨鏡表情' },
    { id: 'emote_2', type: 'emote', val: '😱', price: 200, name: '驚恐表情' },
    { id: 'minipekka', type: 'card', val: 'minipekka', price: 1000, name: '小皮卡' },
    { id: 'golem', type: 'card', val: 'golem', price: 2000, name: '戈崙石人' }
];

const AudioSys={
    ctx:null,
    init:function(){window.AudioContext=window.AudioContext||window.webkitAudioContext;this.ctx=new AudioContext()},
    play:function(type){
        if(!this.ctx)return;const t=this.ctx.currentTime;const osc=this.ctx.createOscillator();const gain=this.ctx.createGain();gain.connect(this.ctx.destination);osc.connect(gain);
        if(type==='spawn'){osc.frequency.setValueAtTime(300,t);osc.frequency.exponentialRampToValueAtTime(50,t+.2);gain.gain.setValueAtTime(.1,t);gain.gain.exponentialRampToValueAtTime(.01,t+.2);osc.start();osc.stop(t+.2)}
        else if(type==='attack'){osc.type='triangle';osc.frequency.setValueAtTime(150,t);osc.frequency.linearRampToValueAtTime(100,t+.05);gain.gain.setValueAtTime(.05,t);gain.gain.linearRampToValueAtTime(0,t+.05);osc.start();osc.stop(t+.05)}
        else if(type==='charge_hit'){osc.type='sawtooth';osc.frequency.setValueAtTime(200,t);osc.frequency.exponentialRampToValueAtTime(50,t+.3);gain.gain.setValueAtTime(.15,t);gain.gain.exponentialRampToValueAtTime(.01,t+.3);osc.start();osc.stop(t+.3)}
        else if(type==='zap'){osc.type='sawtooth';osc.frequency.setValueAtTime(800,t);osc.frequency.linearRampToValueAtTime(200,t+.15);gain.gain.setValueAtTime(.1,t);gain.gain.linearRampToValueAtTime(0,t+.15);osc.start();osc.stop(t+.15)}
        else if(type==='heavy_hit'){osc.type='square';osc.frequency.setValueAtTime(80,t);osc.frequency.exponentialRampToValueAtTime(20,t+.15);gain.gain.setValueAtTime(.2,t);gain.gain.exponentialRampToValueAtTime(.01,t+.15);osc.start();osc.stop(t+.15)}
        else if(type==='double_elixir'){osc.type='sine';osc.frequency.setValueAtTime(440,t);osc.frequency.linearRampToValueAtTime(880,t+.5);gain.gain.setValueAtTime(.1,t);gain.gain.linearRampToValueAtTime(0,t+.5);osc.start();osc.stop(t+.5)}
        else if(type==='ui'){osc.frequency.setValueAtTime(800,t);gain.gain.setValueAtTime(.05,t);gain.gain.exponentialRampToValueAtTime(.01,t+.1);osc.start();osc.stop(t+.1)}
        else if(type==='boom'){osc.type='sawtooth';osc.frequency.setValueAtTime(120,t);osc.frequency.exponentialRampToValueAtTime(10,t+.4);gain.gain.setValueAtTime(.2,t);gain.gain.exponentialRampToValueAtTime(.01,t+.4);osc.start();osc.stop(t+.4)}
    }
};