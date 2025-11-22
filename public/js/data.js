const CONFIG = {
    ELIXIR_RATE: 0.02, // 聖水回復速度
    MAX_ELIXIR: 10,
    GAME_TIME: 180,
    DBL_ELIXIR: 60,
    RIVER_OFF: 0.5,
    COLORS: { P: '#3498db', E: '#e74c3c', GRASS: '#27ae60', WATER: '#48dbfb' }
};

const CARDS = {
    knight: { name: '騎士', price: 100, cost: 3, count: 1, hp: 1400, dmg: 130, speed: 0.35, range: 0, atkSpd: 65, type: 'ground', target: 'any', icon: '⚔️', radius: 16, mass: 6.0, deployTime: 60, rarity: 'common' },
    archer: { name: '弓箭手', price: 100, cost: 3, count: 2, hp: 350, dmg: 80, speed: 0.4, range: 110, atkSpd: 50, type: 'ground', target: 'any', icon: '🏹', radius: 12, mass: 1.5, deployTime: 60, rarity: 'common' },
    musketeer: { name: '火槍手', price: 200, cost: 4, count: 1, hp: 600, dmg: 180, speed: 0.35, range: 140, atkSpd: 60, type: 'ground', target: 'any', icon: '👒', radius: 14, mass: 2.0, deployTime: 60, rarity: 'rare' },
    giant: { name: '巨人', price: 200, cost: 5, count: 1, hp: 3500, dmg: 250, speed: 0.2, range: 0, atkSpd: 120, type: 'ground', target: 'building', icon: '🦍', radius: 28, mass: 30.0, deployTime: 120, rarity: 'rare' },
    prince: { name: '王子', price: 500, cost: 5, count: 1, hp: 1600, dmg: 325, speed: 0.35, range: 0, atkSpd: 80, type: 'ground', target: 'any', icon: '🐎', radius: 18, mass: 8.0, deployTime: 60, chargeSpeed: 0.75, chargeDmgMult: 2.0, rarity: 'epic' },
    skarmy: { name: '骷髏海', price: 500, cost: 3, count: 5, hp: 60, dmg: 40, speed: 0.55, range: 0, atkSpd: 30, type: 'ground', target: 'any', icon: '💀', radius: 8, mass: 0.5, deployTime: 30, rarity: 'epic' },
    bats: { name: '蝙蝠', price: 100, cost: 2, count: 4, hp: 50, dmg: 50, speed: 0.7, range: 0, atkSpd: 25, type: 'air', target: 'any', icon: '🦇', radius: 8, mass: 0.5, deployTime: 30, rarity: 'common' },
    minipekka: { name: '小皮卡', price: 200, cost: 4, count: 1, hp: 1100, dmg: 550, speed: 0.55, range: 0, atkSpd: 95, type: 'ground', target: 'any', icon: '🤖', radius: 16, mass: 5.0, deployTime: 60, rarity: 'rare' },
    babydragon: { name: '飛龍', price: 500, cost: 4, count: 1, hp: 1000, dmg: 130, speed: 0.45, range: 90, atkSpd: 80, type: 'air', target: 'any', icon: '🐲', aoe: 50, radius: 16, mass: 4.0, deployTime: 60, rarity: 'epic' },
    fireball: { name: '火球', price: 200, cost: 4, count: 1, hp: 0, dmg: 350, speed: 0, range: 0, atkSpd: 0, type: 'spell', target: 'any', icon: '🔥', aoe: 110, knockback: 8, rarity: 'rare' },
    golem: { name: '石頭人', price: 1000, cost: 8, count: 1, hp: 4500, dmg: 280, speed: 0.15, range: 0, atkSpd: 140, type: 'ground', target: 'building', icon: '🗿', radius: 32, mass: 50.0, deployTime: 180, deathDmg: 300, rarity: 'legendary' }
};
const ALL_CARDS_KEYS = Object.keys(CARDS);