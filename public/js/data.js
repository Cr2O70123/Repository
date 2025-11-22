const CONFIG = {
    ELIXIR_RATE: 0.018, MAX_ELIXIR: 10, GAME_TIME: 180, DBL_ELIXIR: 60,
    RIVER_OFF: 0.5, BRIDGE_W: 60,
    COLORS: { P: '#3498db', E: '#e74c3c', GRASS: '#27ae60', WATER: '#48dbfb' }
};

const CARDS = {
    knight: { id: 'knight', name: '騎士', desc: '近戰坦克', cost: 3, count: 1, hp: 1400, dmg: 130, speed: 0.35, range: 0, atkSpd: 65, type: 'ground', icon: '⚔️', radius: 16, mass: 6, rarity: 'common' },
    archer: { id: 'archer', name: '弓箭手', desc: '遠程輸出', cost: 3, count: 2, hp: 350, dmg: 80, speed: 0.4, range: 110, atkSpd: 50, type: 'ground', icon: '🏹', radius: 12, mass: 1.5, rarity: 'common' },
    giant: { id: 'giant', name: '巨人', desc: '只打建築', cost: 5, count: 1, hp: 3500, dmg: 250, speed: 0.2, range: 0, atkSpd: 120, type: 'ground', target: 'building', icon: '🦍', radius: 28, mass: 30, rarity: 'rare' },
    musketeer: { id: 'musketeer', name: '火槍手', desc: '遠程單體', cost: 4, count: 1, hp: 600, dmg: 180, speed: 0.35, range: 140, atkSpd: 60, type: 'ground', icon: '👒', radius: 14, mass: 2, rarity: 'rare' },
    fireball: { id: 'fireball', name: '火球', desc: '範圍法術', cost: 4, hp: 0, dmg: 350, speed: 0, type: 'spell', icon: '🔥', aoe: 110, knockback: 8, rarity: 'rare' },
    bats: { id: 'bats', name: '蝙蝠', desc: '空中群體', cost: 2, count: 4, hp: 50, dmg: 50, speed: 0.7, range: 0, atkSpd: 25, type: 'air', icon: '🦇', radius: 8, mass: 0.5, rarity: 'common' },
    // 更多卡牌...
    minipekka: { id: 'minipekka', name: '小皮卡', desc: '高傷單體', cost: 4, hp: 1100, dmg: 550, speed: 0.55, atkSpd: 95, type: 'ground', icon: '🤖', radius: 16, mass: 5, rarity: 'rare' },
    prince: { id: 'prince', name: '王子', desc: '衝鋒雙倍傷', cost: 5, hp: 1600, dmg: 325, speed: 0.35, atkSpd: 80, type: 'ground', icon: '🐎', radius: 18, mass: 8, chargeSpeed: 0.75, chargeDmgMult: 2, rarity: 'epic' },
    goblins: { id: 'goblins', name: '哥布林', cost: 2, count: 3, hp: 180, dmg: 90, speed: 0.65, atkSpd: 35, type: 'ground', icon: '👺', radius: 10, mass: 0.8, rarity: 'common' }
};

const RECOMMENDED = ['knight', 'archer', 'giant', 'fireball', 'musketeer'];
const SHOP_ITEMS = [
    { id: 'emote_1', type: 'emote', val: '😎', price: 200, name: '墨鏡表情' },
    { id: 'emote_2', type: 'emote', val: '😱', price: 200, name: '驚恐表情' },
    { id: 'prince', type: 'card', val: 'prince', price: 1000, name: '王子卡牌' }
];