/* Ashen Covenant approved v1.0.0 semantic adapter. Data only; no execution fallback.
 * All numbers below are explicit transcriptions of the approved designed baseline.
 * Metadata is embedded, not loaded from an environment-specific file at runtime. */
const SOURCE_METADATA = {
  "SKILL-G01-01": {
    "name": "初級治癒術",
    "sourceEffect": "治療1d12+8+INT；對不死怪改為同量神聖傷害。",
    "target": "ally",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 4,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 4,
      "elf": 8,
      "knight": 50,
      "darkelf": 12
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G01-02": {
    "name": "日光術",
    "sourceEffect": "自身照明半徑8格；不揭露隱形。",
    "target": "self",
    "range": 0,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 4,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 4,
      "elf": 8,
      "knight": 50,
      "darkelf": 12
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G01-03": {
    "name": "保護罩",
    "sourceEffect": "AC-2；防護罩群組。",
    "target": "self",
    "range": 0,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 3,
      "hp": 5,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 4,
      "elf": 8,
      "knight": 50,
      "darkelf": 12
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G01-04": {
    "name": "光箭",
    "sourceEffect": "無屬性傷害1d6+4。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 3,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 4,
      "elf": 8,
      "knight": 50,
      "darkelf": 12
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G01-05": {
    "name": "傳送術",
    "sourceEffect": "合法地圖內隨機落點；裝備傳送控制戒指可選合法記憶點；遵守地圖禁傳。",
    "target": "self",
    "range": 0,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 4,
      "elf": 8,
      "knight": 50,
      "darkelf": 12
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G01-06": {
    "name": "冰箭",
    "sourceEffect": "水屬性傷害1d8+4。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 4,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 4,
      "elf": 8,
      "knight": 50,
      "darkelf": 12
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G01-07": {
    "name": "風刃",
    "sourceEffect": "風屬性傷害1d8+4。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 4,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 4,
      "elf": 8,
      "knight": 50,
      "darkelf": 12
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G01-08": {
    "name": "神聖武器",
    "sourceEffect": "對不死怪追加1d6；神聖武器群組。",
    "target": "own_weapon",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 4,
      "elf": 8,
      "knight": 50,
      "darkelf": 12
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G02-01": {
    "name": "解毒術",
    "sourceEffect": "解除一切毒狀態；不解除麻痺。",
    "target": "ally",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 8,
      "elf": 16,
      "darkelf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G02-02": {
    "name": "寒冷戰慄",
    "sourceEffect": "水屬性傷害2d8+8。",
    "target": "enemy",
    "range": 3,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 8,
      "elf": 16,
      "darkelf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G02-03": {
    "name": "毒咒",
    "sourceEffect": "狀態命中後每3秒造成3HP毒傷，共10次；毒群組。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 30,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 10,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 8,
      "elf": 16,
      "darkelf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G02-04": {
    "name": "擬似魔法武器",
    "sourceEffect": "近戰武器傷害+2；與祝福魔法武器同群組取較強。",
    "target": "own_weapon",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 8,
      "elf": 16,
      "darkelf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G02-05": {
    "name": "無所遁形術",
    "sourceEffect": "揭露半徑8格隱形單位；不造成傷害。",
    "target": "self_area",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 8,
      "elf": 16,
      "darkelf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G02-06": {
    "name": "負重強化",
    "sourceEffect": "負重容量乘1.5；到期立刻重算負重限制。",
    "target": "self",
    "range": 0,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 50,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 8,
      "elf": 16,
      "darkelf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G02-07": {
    "name": "火箭",
    "sourceEffect": "火屬性傷害2d6+6。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 8,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 8,
      "elf": 16,
      "darkelf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G02-08": {
    "name": "地獄之牙",
    "sourceEffect": "地屬性傷害2d6+6。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 8,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 8,
      "elf": 16,
      "darkelf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G03-01": {
    "name": "極光雷電",
    "sourceEffect": "直線6格內所有敵人受風屬性3d10+12；牆壁阻斷。",
    "target": "enemy_line",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 1.5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 12,
      "elf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G03-02": {
    "name": "起死回生術",
    "sourceEffect": "僅一般不死怪依狀態命中公式即死；首領免疫；成功仍照正常掉落結算。",
    "target": "undead_enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 12,
      "elf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G03-03": {
    "name": "中級治癒術",
    "sourceEffect": "治療2d12+25+2*INT；不死怪受神聖傷害。",
    "target": "ally",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 12,
      "elf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G03-04": {
    "name": "闇盲咒術",
    "sourceEffect": "狀態命中後視野限2格，命中-4。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 10,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 12,
      "elf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G03-05": {
    "name": "鎧甲護持",
    "sourceEffect": "胸甲AC-3；與自身防護罩可並存。",
    "target": "own_armor",
    "range": 0,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 12,
      "elf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G03-06": {
    "name": "寒冰氣息",
    "sourceEffect": "目標半徑2格水屬性3d8+10。",
    "target": "enemy_area",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 12,
      "elf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G03-07": {
    "name": "能量感測",
    "sourceEffect": "顯示目標四屬性抗性最低者；同值全部列出。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 8,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 12,
      "elf": 24
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G04-01": {
    "name": "燃燒的火球",
    "sourceEffect": "目標半徑2格火屬性4d8+12。",
    "target": "enemy_area",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 16,
      "elf": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G04-02": {
    "name": "通暢氣脈術",
    "sourceEffect": "DEX+5；與敏捷提升群組取較強。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 1200,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 16,
      "elf": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G04-03": {
    "name": "壞物術",
    "sourceEffect": "狀態命中後目標裝備武器耐久-10；不降低+N，不刪除物品。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 32,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 16,
      "elf": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G04-04": {
    "name": "吸血鬼之吻",
    "sourceEffect": "無屬性傷害3d8+10；恢復實際傷害50%HP。",
    "target": "enemy",
    "range": 3,
    "durationSeconds": 0,
    "cooldownSeconds": 1.5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 16,
      "elf": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G04-05": {
    "name": "緩速術",
    "sourceEffect": "狀態命中後移動及攻擊間隔乘1.5；緩速群組。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 30,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 16,
      "elf": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G04-06": {
    "name": "岩牢",
    "sourceEffect": "地屬性4d8+10。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 1.5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 24,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 16,
      "elf": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G04-07": {
    "name": "魔法屏障",
    "sourceEffect": "抵銷下一次指向性傷害魔法後結束；不擋範圍魔法。",
    "target": "self",
    "range": 0,
    "durationSeconds": 10,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 16,
      "elf": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G04-08": {
    "name": "冥想術",
    "sourceEffect": "靜止且未攻擊時每8秒自然MP回復額外+5；移動／攻擊後暫停8秒；套RULE-PROGRESSION飽食／負重閘門。",
    "target": "self",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 5,
      "hp": 30,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 16,
      "elf": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G05-01": {
    "name": "木乃伊的詛咒",
    "sourceEffect": "狀態命中後先4秒預警，再麻痺8秒；首領免疫。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 12,
    "cooldownSeconds": 5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 80,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 20,
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G05-02": {
    "name": "極道落雷",
    "sourceEffect": "風屬性5d8+16。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1.5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 24,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 20,
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G05-03": {
    "name": "高級治癒術",
    "sourceEffect": "治療3d12+50+3*INT；不死怪受神聖傷害。",
    "target": "ally",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 20,
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G05-04": {
    "name": "迷魅術",
    "sourceEffect": "僅等級<=施法者-5且非首領怪可依狀態公式迷魅；占1召喚名額；最多1。",
    "target": "monster",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 20,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 20,
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G05-05": {
    "name": "聖潔之光",
    "sourceEffect": "解除毒、盲目、緩速、麻痺；不清除增益。",
    "target": "ally",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 20,
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G05-06": {
    "name": "冰錐",
    "sourceEffect": "水屬性5d8+16。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 1.5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 24,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 20,
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G05-07": {
    "name": "黑闇之影",
    "sourceEffect": "狀態命中後物理命中-6；與盲目不同群組可並存。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 30,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 20,
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G05-08": {
    "name": "魔力奪取",
    "sourceEffect": "狀態命中後偷取min(20,目標MP)；施法者增加等量MP。",
    "target": "enemy",
    "range": 4,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 0,
      "hp": 50,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 20,
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G06-01": {
    "name": "造屍術",
    "sourceEffect": "消耗一般怪屍體召喚MON-ZOMBIE；等級=min(30,施法者等級)，HP=100+10*等級；占1召喚名額。",
    "target": "monster_corpse",
    "range": 4,
    "durationSeconds": 600,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 5,
      "hp": 80,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 24,
      "elf": 48
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G06-02": {
    "name": "體魄強健術",
    "sourceEffect": "STR+5；與力量提升群組取較強。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 40,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 24,
      "elf": 48
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G06-03": {
    "name": "加速術",
    "sourceEffect": "移動與動作間隔除1.33；加速群組。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 24,
      "elf": 48
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G06-04": {
    "name": "魔法相消術",
    "sourceEffect": "依狀態命中移除可驅散增益及減益；不刪永久學習、裝備、捕獲寵物。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 40,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "mage": 24,
      "elf": 48
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G06-05": {
    "name": "地裂術",
    "sourceEffect": "地屬性6d8+20。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 32,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 24,
      "elf": 48
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G06-06": {
    "name": "烈炎術",
    "sourceEffect": "火屬性7d8+22。",
    "target": "enemy",
    "range": 3,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 32,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 24,
      "elf": 48
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G06-07": {
    "name": "弱化術",
    "sourceEffect": "狀態命中後近戰傷害-5，STR-3。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 30,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 24,
      "elf": 48
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G06-08": {
    "name": "祝福魔法武器",
    "sourceEffect": "武器傷害+3、命中+2；與擬似魔法武器取較強。",
    "target": "ally_weapon",
    "range": 6,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 24,
      "elf": 48
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G07-01": {
    "name": "體力回復術",
    "sourceEffect": "視線內隊友各治療2d12+35+2*INT；不含自己。",
    "target": "party_area",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 30,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 28
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G07-02": {
    "name": "冰矛圍籬",
    "sourceEffect": "設6格冰牆；每2秒對占格敵人造成2d8水傷；不阻擋單位。",
    "target": "ground_line",
    "range": 6,
    "durationSeconds": 10,
    "cooldownSeconds": 4,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 36,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 28
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G07-03": {
    "name": "召喚術",
    "sourceEffect": "召喚1隻MON-BUGBEAR；40級可選MON-CERBERUS，48級可選MON-MINOTAUR；控制戒指才可選；同時一般召喚最多3隻，仍受與捕獲寵物共享的RULE-PET-LIFECYCLE總容量限制。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 30,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 3
        }
      ]
    },
    "classMinLevels": {
      "mage": 28
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G07-04": {
    "name": "神聖疾走",
    "sourceEffect": "移動間隔額外除1.5，僅移動；可與加速並存。",
    "target": "self",
    "range": 0,
    "durationSeconds": 30,
    "cooldownSeconds": 1,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 28
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G07-05": {
    "name": "龍捲風",
    "sourceEffect": "半徑4格敵人風屬性6d8+20。",
    "target": "self_area",
    "range": 4,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 40,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 28
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G07-06": {
    "name": "強力加速術",
    "sourceEffect": "加速群組，間隔除1.33；只是較長時效，不加倍疊加。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 60,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 28
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G07-07": {
    "name": "魔法陷阱",
    "sourceEffect": "指定合法格設陷阱，首位敵人踏入受8d8地傷；一人最多3個；不堵路。",
    "target": "ground",
    "range": 6,
    "durationSeconds": 300,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 40,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 28
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G07-08": {
    "name": "疾病術",
    "sourceEffect": "狀態命中後AC+8，命中-4。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 30,
    "cooldownSeconds": 3,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 28
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G08-01": {
    "name": "全部治癒術",
    "sourceEffect": "目標HP回滿；對不死怪造成min(250,目標最大HP/2)神聖傷害。",
    "target": "ally",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 48,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G08-02": {
    "name": "火牢",
    "sourceEffect": "指定方向6格火牆；每秒對占格敵人造成2d8火傷。",
    "target": "ground_line",
    "range": 6,
    "durationSeconds": 10,
    "cooldownSeconds": 4,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 60,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G08-03": {
    "name": "冰雪暴",
    "sourceEffect": "半徑6格敵人水屬性7d8+24。",
    "target": "self_area",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 60,
      "hp": 10,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G08-04": {
    "name": "隱身術",
    "sourceEffect": "隱形；攻擊、施法、拾取會解除；可移動；可被偵測。",
    "target": "self",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 3,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G08-05": {
    "name": "返生術",
    "sourceEffect": "復活自己死寵至100%HP及0MP；不返EXP；召喚物死後消失不能復活。",
    "target": "corpse",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G08-06": {
    "name": "震裂術",
    "sourceEffect": "半徑3格敵人地屬性7d8+25。",
    "target": "self_area",
    "range": 3,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 40,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G08-07": {
    "name": "魔法封印",
    "sourceEffect": "狀態命中後不能施法；物理攻擊及使用物品不受影響。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 10,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G08-08": {
    "name": "治療能量風暴",
    "sourceEffect": "每5秒恢復10HP；自然回復以外的持續治療，不受負重禁自然回復影響。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 300,
    "cooldownSeconds": 2,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 32,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 32
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G09-01": {
    "name": "閃電風暴",
    "sourceEffect": "目標半徑3格風屬性8d8+28。",
    "target": "enemy_area",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 52,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 36
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G09-02": {
    "name": "沉睡之霧",
    "sourceEffect": "半徑2格各依狀態公式睡眠；受到傷害醒來；首領免疫。",
    "target": "enemy_area",
    "range": 6,
    "durationSeconds": 30,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 5,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 36
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G09-03": {
    "name": "變形術",
    "sourceEffect": "敵怪依狀態公式變為FORM-SHEEP羊外觀、物理傷害減20%，首領免疫；自己可選符合等級的visual_form_registry外觀，無數值加成。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 1200,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 80,
      "hp": 1,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 36
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G09-04": {
    "name": "聖結界",
    "sourceEffect": "最終受到傷害乘0.5；同群組不疊。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 60,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "mage": 36
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G09-05": {
    "name": "集體傳送術",
    "sourceEffect": "自己與半徑2格內自己出戰寵物／召喚物傳送；各落在目的點相鄰最近合法格；禁傳地圖無效；控制戒指可選合法記憶點。",
    "target": "party_area",
    "range": 2,
    "durationSeconds": 0,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 80,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 36
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G09-06": {
    "name": "火風暴",
    "sourceEffect": "半徑3格敵人火屬性9d8+30。",
    "target": "self_area",
    "range": 3,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 52,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 36
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G09-07": {
    "name": "藥水霜化術",
    "sourceEffect": "狀態命中後無法使用治癒藥水；不阻止魔法治療。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 10,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "mage": 36
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G09-08": {
    "name": "偵測隱形",
    "sourceEffect": "揭露半徑8格隱形敵人並造成10無屬性傷害。",
    "target": "self_area",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 36
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G10-01": {
    "name": "創造魔法武器",
    "sourceEffect": "僅接受背包內兩件同一ID且均+0的可融合武器；完整呼叫既有融合交易；成功+1、失敗兩件消失；不提供單件強化捷徑。",
    "target": "own_weapon_pair",
    "range": 0,
    "durationSeconds": 0,
    "cooldownSeconds": 10,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 200,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 10
        }
      ]
    },
    "classMinLevels": {
      "mage": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G10-02": {
    "name": "流星雨",
    "sourceEffect": "目標半徑3格敵人火屬性12d8+40。",
    "target": "enemy_area",
    "range": 10,
    "durationSeconds": 0,
    "cooldownSeconds": 4,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 60,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G10-03": {
    "name": "終極返生術",
    "sourceEffect": "單機適配：復活自己死寵至100%HP及100%MP；不返EXP。歷史玩家EXP返還機制在此不啟用；與返生術差異是回滿MP。",
    "target": "corpse",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 10,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 100,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G10-04": {
    "name": "集體緩速術",
    "sourceEffect": "目標半徑3格敵人各依狀態公式緩速；間隔乘1.5。",
    "target": "enemy_area",
    "range": 8,
    "durationSeconds": 64,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "mage": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G10-05": {
    "name": "究極光裂術",
    "sourceEffect": "單體無屬性16d8+60；本單機基準人物性向固定0，符合歷史正向施放條件；不實作PK／善惡變動。",
    "target": "enemy",
    "range": 10,
    "durationSeconds": 0,
    "cooldownSeconds": 4,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 70,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G10-06": {
    "name": "絕對屏障",
    "sourceEffect": "免疫傷害；自然回血回魔暫停；除移動外任何主動行為解除。",
    "target": "self",
    "range": 0,
    "durationSeconds": 10,
    "cooldownSeconds": 15,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "mage": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G10-07": {
    "name": "靈魂昇華",
    "sourceEffect": "最大HP及MP乘1.2；不補當前值；結束時裁到原上限。",
    "target": "self",
    "range": 0,
    "durationSeconds": 1200,
    "cooldownSeconds": 2,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 40,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-G10-08": {
    "name": "冰雪颶風",
    "sourceEffect": "半徑6格敵人水屬性12d8+40；另20%機率冰凍2秒，首領免疫控制。",
    "target": "self_area",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 4,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 80,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "mage": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-KNIGHT-01": {
    "name": "衝擊之暈",
    "sourceEffect": "需雙手劍；依狀態公式暈眩2秒；首領僅受正常一擊不暈。",
    "target": "enemy",
    "range": 1,
    "durationSeconds": 2,
    "cooldownSeconds": 6,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "knight": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-KNIGHT-02": {
    "name": "尖刺盔甲",
    "sourceEffect": "受到近戰命中時反射固定5物理傷害；每名攻擊者每秒最多一次；反射不再反射。",
    "target": "self",
    "range": 0,
    "durationSeconds": 180,
    "cooldownSeconds": 5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 50,
      "reagents": []
    },
    "classMinLevels": {
      "knight": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-KNIGHT-03": {
    "name": "增幅防禦",
    "sourceEffect": "固定傷害減免5；先減免再乘聖結界。",
    "target": "self",
    "range": 0,
    "durationSeconds": 180,
    "cooldownSeconds": 5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "knight": 50
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-KNIGHT-04": {
    "name": "反擊屏障",
    "sourceEffect": "需雙手劍；20%機率格擋近戰並反擊武器最大傷害；每秒最多1次；自訂採入較後期技能。",
    "target": "self",
    "range": 0,
    "durationSeconds": 64,
    "cooldownSeconds": 10,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 100,
      "reagents": [
        {
          "item_id": "ITEM-MAGIC-GEM",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "knight": 50
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-01": {
    "name": "魔法防禦",
    "sourceEffect": "MR+10。",
    "target": "self",
    "range": 0,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 5,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 10
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-02": {
    "name": "心靈轉換",
    "sourceEffect": "HP成本5換MP2；必須留下1HP；不受智力折扣。",
    "target": "self",
    "range": 0,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 0,
      "hp": 5,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 10
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-03": {
    "name": "世界樹的呼喚",
    "sourceEffect": "回到妖精森林安全落點；地圖禁傳時不可用。",
    "target": "self",
    "range": 0,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 5,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 10
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-04": {
    "name": "淨化精神",
    "sourceEffect": "WIS+3。",
    "target": "self",
    "range": 0,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 20
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-05": {
    "name": "屬性防禦",
    "sourceEffect": "四屬性抗性各+10。",
    "target": "self",
    "range": 0,
    "durationSeconds": 1800,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 20
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-06": {
    "name": "釋放元素",
    "sourceEffect": "解除一隻自己召喚或迷魅的怪物；不影響捕獲寵物。",
    "target": "summon",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "elf": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-07": {
    "name": "魂體轉換",
    "sourceEffect": "HP成本50換MP20；不受任何成本折扣。",
    "target": "self",
    "range": 0,
    "durationSeconds": 0,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 0,
      "hp": 50,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-08": {
    "name": "魔法消除",
    "sourceEffect": "依狀態公式移除一個最高剩餘時間可驅散增益；相同時按技能ID排序。",
    "target": "enemy",
    "range": 8,
    "durationSeconds": 0,
    "cooldownSeconds": 5,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-09": {
    "name": "封印禁地",
    "sourceEffect": "半徑6格敵人依狀態公式沉默10秒。",
    "target": "self_area",
    "range": 6,
    "durationSeconds": 10,
    "cooldownSeconds": 30,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 100,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 5
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-10": {
    "name": "三重矢",
    "sourceEffect": "需弓與3支箭；連續3次各自命中與傷害判定，不對自己施放。",
    "target": "enemy",
    "range": 10,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 15,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-11": {
    "name": "火焰武器",
    "sourceEffect": "火系限定；近戰傷害+3；火武器群組。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 30
    },
    "elementRequirement": "火",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-12": {
    "name": "烈炎氣息",
    "sourceEffect": "火系限定；隊員近戰傷害+4；火武器群組。",
    "target": "party_area",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "火",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-13": {
    "name": "烈炎武器",
    "sourceEffect": "火系限定；近戰傷害+5；火武器群組。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "火",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-14": {
    "name": "風之神射",
    "sourceEffect": "風系限定；遠距傷害+2；風武器群組。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 30
    },
    "elementRequirement": "風",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-15": {
    "name": "暴風之眼",
    "sourceEffect": "風系限定；隊員遠距命中+3；風命中群組。",
    "target": "party_area",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "風",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-16": {
    "name": "暴風神射",
    "sourceEffect": "風系限定；遠距傷害+5；風武器群組。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "風",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-17": {
    "name": "風之疾走",
    "sourceEffect": "風系限定；勇敢群組動作間隔除1.33；不與精靈餅乾疊加。",
    "target": "self",
    "range": 0,
    "durationSeconds": 300,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "風",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-18": {
    "name": "水之防護",
    "sourceEffect": "水系限定；ER+5；ER每點使受到遠程命中機率-1百分點。",
    "target": "self",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 30
    },
    "elementRequirement": "水",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-19": {
    "name": "生命之泉",
    "sourceEffect": "水系限定；每8秒自然HP回復額外+5；套RULE-PROGRESSION狀態倍率與飽食／負重閘門。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "水",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-20": {
    "name": "水之元氣",
    "sourceEffect": "水系限定；收到治療量乘1.2；與其他治療增幅取最大。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 300,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "水",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-21": {
    "name": "生命的祝福",
    "sourceEffect": "水系限定；隊員各恢復3d12+50HP。",
    "target": "party_area",
    "range": 6,
    "durationSeconds": 0,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "水",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-22": {
    "name": "大地防護",
    "sourceEffect": "地系限定；AC-3；大地防護群組。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 30
    },
    "elementRequirement": "地",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-23": {
    "name": "大地屏障",
    "sourceEffect": "地系限定；隊員AC-4；大地防護群組。",
    "target": "party_area",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "地",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-24": {
    "name": "鋼鐵防護",
    "sourceEffect": "地系限定；AC-6；大地防護群組。",
    "target": "ally",
    "range": 6,
    "durationSeconds": 600,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "地",
    "requiresLineOfSight": true
  },
  "SKILL-ELF-25": {
    "name": "大地之屏障",
    "sourceEffect": "地系限定；依狀態公式束縛，期間目標不能移動攻擊施法但免傷；首領免疫。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 6,
    "cooldownSeconds": 10,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "地",
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-01": {
    "name": "暗隱術",
    "sourceEffect": "隱形；移動可維持；攻擊、施法、拾取解除。",
    "target": "self",
    "range": 0,
    "durationSeconds": 32,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 15
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-02": {
    "name": "附加劇毒",
    "sourceEffect": "成功物理命中20%機率施毒，每3秒3HP，18秒；毒群組。",
    "target": "own_weapon",
    "range": 0,
    "durationSeconds": 300,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-DARK-STONE",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "darkelf": 15
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-03": {
    "name": "影之防護",
    "sourceEffect": "AC-3；與保護罩群組取較強。",
    "target": "self",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 15
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-04": {
    "name": "力量提升",
    "sourceEffect": "STR+2；與體魄強健取較強。",
    "target": "self",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 15
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-05": {
    "name": "提煉魔石",
    "sourceEffect": "消耗ITEM-COAL一個，25%成功產生ITEM-DARK-STONE一個；失敗材料消失；不改裝備+N。",
    "target": "own_item",
    "range": 0,
    "durationSeconds": 0,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 15
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-06": {
    "name": "行走加速",
    "sourceEffect": "勇敢移動群組：移動間隔除1.33；不加速攻擊，可與一般加速並存。",
    "target": "self",
    "range": 0,
    "durationSeconds": 300,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-07": {
    "name": "燃燒鬥志",
    "sourceEffect": "每次成功近戰命中33%機率傷害乘1.5；與雙重破壞可乘算，但不觸發額外攻擊。",
    "target": "self",
    "range": 0,
    "durationSeconds": 300,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-DARK-STONE",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "darkelf": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-08": {
    "name": "敏捷提升",
    "sourceEffect": "DEX+2；與通暢氣脈取較強。",
    "target": "self",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 1,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 10,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-09": {
    "name": "毒性抵抗",
    "sourceEffect": "免疫新毒效果，不解除現有毒。",
    "target": "self",
    "range": 0,
    "durationSeconds": 300,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-10": {
    "name": "暗黑盲咒",
    "sourceEffect": "依狀態公式盲目，視野2格且命中-4；盲目群組。",
    "target": "enemy",
    "range": 6,
    "durationSeconds": 16,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 30
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-11": {
    "name": "雙重破壞",
    "sourceEffect": "僅雙刀／鋼爪；每次成功命中25%機率傷害乘2；無額外命中擲骰。",
    "target": "self",
    "range": 0,
    "durationSeconds": 192,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-DARK-STONE",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "darkelf": 45
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-12": {
    "name": "暗影閃避",
    "sourceEffect": "受到近戰命中機率-10百分點；受最終5%至95%界限。",
    "target": "self",
    "range": 0,
    "durationSeconds": 192,
    "cooldownSeconds": 3,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 20,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 45
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-13": {
    "name": "暗影之牙",
    "sourceEffect": "武器傷害+3；與擬似／祝福魔法武器同群組取較強。",
    "target": "own_weapon",
    "range": 0,
    "durationSeconds": 600,
    "cooldownSeconds": 2,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-DARK-STONE",
          "count": 1
        }
      ]
    },
    "classMinLevels": {
      "darkelf": 45
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-DARKELF-14": {
    "name": "會心一擊",
    "sourceEffect": "消耗當前MP全部及HP至1；造成消耗HP*0.5+消耗MP*2的基礎物理傷害，仍須命中，再套一般減傷；對首領無額外傷害上限、無即死。",
    "target": "enemy",
    "range": 1,
    "durationSeconds": 0,
    "cooldownSeconds": 30,
    "castSeconds": 0.5,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 0,
      "hp": 0,
      "reagents": []
    },
    "classMinLevels": {
      "darkelf": 45
    },
    "elementRequirement": null,
    "requiresLineOfSight": true
  },
  "SKILL-ELF-SUMMON-FIRE": {
    "name": "召喚屬性精靈（火）",
    "sourceEffect": "召喚火精靈；HP=400，MP=200，AC=-30，MR=40，攻擊間隔1.5秒，攻擊距離6格，每擊同屬性傷害18；同時僅1屬性精靈，占一般召喚名額；替換舊精靈。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "火",
    "requiresLineOfSight": false
  },
  "SKILL-ELF-SUMMON-FIRE-GREATER": {
    "name": "召喚強力屬性精靈（火）",
    "sourceEffect": "召喚火精靈；HP=800，MP=200，AC=-30，MR=40，攻擊間隔1.5秒，攻擊距離6格，每擊同屬性傷害30；同時僅1屬性精靈，占一般召喚名額；替換舊精靈。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 3
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "火",
    "requiresLineOfSight": false
  },
  "SKILL-ELF-SUMMON-WATER": {
    "name": "召喚屬性精靈（水）",
    "sourceEffect": "召喚水精靈；HP=400，MP=200，AC=-30，MR=40，攻擊間隔1.5秒，攻擊距離6格，每擊同屬性傷害18；同時僅1屬性精靈，占一般召喚名額；替換舊精靈。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "水",
    "requiresLineOfSight": false
  },
  "SKILL-ELF-SUMMON-WATER-GREATER": {
    "name": "召喚強力屬性精靈（水）",
    "sourceEffect": "召喚水精靈；HP=800，MP=200，AC=-30，MR=40，攻擊間隔1.5秒，攻擊距離6格，每擊同屬性傷害30；同時僅1屬性精靈，占一般召喚名額；替換舊精靈。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 3
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "水",
    "requiresLineOfSight": false
  },
  "SKILL-ELF-SUMMON-WIND": {
    "name": "召喚屬性精靈（風）",
    "sourceEffect": "召喚風精靈；HP=400，MP=200，AC=-30，MR=40，攻擊間隔1.5秒，攻擊距離6格，每擊同屬性傷害18；同時僅1屬性精靈，占一般召喚名額；替換舊精靈。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "風",
    "requiresLineOfSight": false
  },
  "SKILL-ELF-SUMMON-WIND-GREATER": {
    "name": "召喚強力屬性精靈（風）",
    "sourceEffect": "召喚風精靈；HP=800，MP=200，AC=-30，MR=40，攻擊間隔1.5秒，攻擊距離6格，每擊同屬性傷害30；同時僅1屬性精靈，占一般召喚名額；替換舊精靈。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 3
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "風",
    "requiresLineOfSight": false
  },
  "SKILL-ELF-SUMMON-EARTH": {
    "name": "召喚屬性精靈（地）",
    "sourceEffect": "召喚地精靈；HP=400，MP=200，AC=-30，MR=40，攻擊間隔1.5秒，攻擊距離6格，每擊同屬性傷害18；同時僅1屬性精靈，占一般召喚名額；替換舊精靈。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 30,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 2
        }
      ]
    },
    "classMinLevels": {
      "elf": 40
    },
    "elementRequirement": "地",
    "requiresLineOfSight": false
  },
  "SKILL-ELF-SUMMON-EARTH-GREATER": {
    "name": "召喚強力屬性精靈（地）",
    "sourceEffect": "召喚地精靈；HP=800，MP=200，AC=-30，MR=40，攻擊間隔1.5秒，攻擊距離6格，每擊同屬性傷害30；同時僅1屬性精靈，占一般召喚名額；替換舊精靈。",
    "target": "self",
    "range": 0,
    "durationSeconds": 3600,
    "cooldownSeconds": 5,
    "castSeconds": 1,
    "globalCooldownSeconds": 0.5,
    "costs": {
      "mp": 50,
      "hp": 0,
      "reagents": [
        {
          "item_id": "ITEM-ELF-JADE",
          "count": 3
        }
      ]
    },
    "classMinLevels": {
      "elf": 50
    },
    "elementRequirement": "地",
    "requiresLineOfSight": false
  }
};

const rows = Object.create(null);
const definitionOrder = [];
const roll = (count, sides, constant = 0, intCoefficient = 0, spCoefficient = 0) => ({dice:[count,sides],constant,intCoefficient,spCoefficient});
const op = (type, data={}) => ({op:type,...data});
const effect = (group, strength, values, extra={}) => ({group,strength,values,stacking:'refresh_same_take_stronger_in_group',...extra});
const magicalDamage = (element,count,sides,constant,radius=0,targetOverride=null) => ({kind:'damage',element,radius,targetOverride,damage:roll(count,sides,constant,0,2),operations:[op('damage',{formula:'FORMULA-MAGIC',element,amount:roll(count,sides,constant,0,2)})]});
const healing = (count,sides,constant,intCoefficient,radius=0,extra={}) => ({kind:'heal',radius,heal:roll(count,sides,constant,intCoefficient,0),operations:[op('heal',{amount:roll(count,sides,constant,intCoefficient,0),clampToMax:true,...extra})]});
const buff = (group,strength,values,extra={}) => ({kind:'buff',operations:[op('apply_buff',effect(group,strength,values,extra))]});
const status = (group,strength,values,extra={}) => ({kind:'status',operations:[op('apply_status',effect(group,strength,values,{saveFormula:'FORMULA-STATUS',...extra}))]});
const special = (kind,data,operations) => ({kind:'special',special:{kind,...data},operations});
function define(id, behavior) {
 if (!SOURCE_METADATA[id]) throw new Error(`Unknown canonical skill ${id}`);
 if (rows[id]) throw new Error(`Duplicate skill ${id}`);
 const meta = SOURCE_METADATA[id];
 rows[id]={id,...meta,kind:null,element:'none',radius:0,targetOverride:null,damage:null,heal:null,special:null,
  restrictions:[],immuneFlags:[],...behavior};
 for (const operation of rows[id].operations) if (['apply_buff','apply_status'].includes(operation.op) && operation.durationSeconds===undefined) operation.durationSeconds=meta.durationSeconds;
 definitionOrder.push(id);
}

// General tier 1: every identity is deliberately enumerated.
define('SKILL-G01-01',healing(1,12,8,1,0,{undeadConversion:{element:'holy',sameRolledAmount:true,additionalSp:false,formula:'FORMULA-MAGIC',targetOverride:'ally_or_undead_enemy'}}));
define('SKILL-G01-02',{...buff('light',8,{lightRadius:8}),special:{kind:'illumination',revealsInvisible:false}});
define('SKILL-G01-03',buff('shield',2,{ac:-2}));
define('SKILL-G01-04',magicalDamage('none',1,6,4));
define('SKILL-G01-05',special('random_or_remembered_teleport',{mapPermission:'teleport',controlRing:'EQ-TELEPORT-RING',rememberedDestinationRequiresRing:true},[op('teleport',{subject:'self',mode:'random_legal_tile_or_ring_memory',cannotBypassLockedBarriers:true})]));
define('SKILL-G01-06',magicalDamage('water',1,8,4));
define('SKILL-G01-07',magicalDamage('wind',1,8,4));
define('SKILL-G01-08',buff('holy_weapon',6,{undeadBonusDice:[1,6]},{scope:'equipped_weapon',trigger:'successful_physical_hit',targetPredicate:'undead'}));

// General tier 2.
define('SKILL-G02-01',{kind:'dispel',operations:[op('remove_status',{groups:['poison'],allMatching:true})]});
define('SKILL-G02-02',magicalDamage('water',2,8,8));
define('SKILL-G02-03',status('poison',3,{dotHp:3},{tickSeconds:3,tickCount:10,firstTick:'after_interval',damageMode:'fixed_hp_loss',immuneFlags:['poison_immunity']}));
define('SKILL-G02-04',buff('magic_weapon',2,{meleeDamage:2},{scope:'equipped_weapon'}));
define('SKILL-G02-05',{kind:'reveal',radius:8,targetOverride:'all_invisible_units_in_self_radius',operations:[op('reveal',{radius:8,damage:0,removeInvisibility:true})]});
define('SKILL-G02-06',{...buff('weight_enhance',1.5,{carryMultiplier:1.5}),special:{kind:'capacity_buff',recomputeCapacityOnApply:true,recomputeCapacityOnExpire:true}});
define('SKILL-G02-07',magicalDamage('fire',2,6,6));
define('SKILL-G02-08',magicalDamage('earth',2,6,6));

// General tier 3 (the approved roster intentionally has seven entries).
define('SKILL-G03-01',{...magicalDamage('wind',3,10,12,0,'enemies_in_directional_line'),special:{kind:'line_attack',lengthCells:6,blockedByWalls:true}});
define('SKILL-G03-02',{...special('turn_undead',{saveFormula:'FORMULA-STATUS',requiresUndead:true,excludeBoss:true,normalKillRewards:true},[op('instant_kill',{saveFormula:'FORMULA-STATUS',targetPredicate:'normal_undead_monster',normalKillRewards:true})]),immuneFlags:['boss','instant_death'],restrictions:['target_normal_undead']});
define('SKILL-G03-03',healing(2,12,25,2,0,{undeadConversion:{element:'holy',sameRolledAmount:true,additionalSp:false,formula:'FORMULA-MAGIC',targetOverride:'ally_or_undead_enemy'}}));
define('SKILL-G03-04',status('blind',4,{visionRadius:2,hit:-4}));
define('SKILL-G03-05',buff('armor_enchant',3,{ac:-3},{scope:'equipped_chest_armor'}));
define('SKILL-G03-06',magicalDamage('water',3,8,10,2,'enemies_in_target_radius'));
define('SKILL-G03-07',special('inspect_weakest_resistance',{elements:['fire','water','wind','earth'],includeAllTies:true},[op('inspect_resistance',{selection:'minimum',includeAllTies:true})]));

// General tier 4.
define('SKILL-G04-01',magicalDamage('fire',4,8,12,2,'enemies_in_target_radius'));
define('SKILL-G04-02',buff('dexterity',5,{DEX:5}));
define('SKILL-G04-03',special('damage_weapon_durability',{saveFormula:'FORMULA-STATUS',amount:10,minimum:0,enchantUnaffected:true,itemNeverDeleted:true},[op('modify_durability',{delta:-10,minimum:0,saveFormula:'FORMULA-STATUS',target:'target_equipped_weapon'})]));
define('SKILL-G04-04',{...magicalDamage('none',3,8,10),special:{kind:'life_steal',ratio:0.5,basis:'actual_damage_dealt_after_defenses'},operations:[op('damage',{formula:'FORMULA-MAGIC',element:'none',amount:roll(3,8,10,0,2)}),op('heal_from_damage',{target:'self',ratio:0.5,basis:'previous_operation_actual_hp_lost',clampToMax:true})]});
define('SKILL-G04-05',status('slow',1.5,{moveIntervalMultiplier:1.5,attackIntervalMultiplier:1.5}));
define('SKILL-G04-06',magicalDamage('earth',4,8,10));
define('SKILL-G04-07',{...buff('counter_magic',1,{negateDirectedDamageSpellCharges:1}),special:{kind:'consume_on_directed_spell',charges:1,excludesArea:true,expiresAfterTrigger:true}});
define('SKILL-G04-08',{...buff('meditation',5,{mpr:5},{naturalRegen:true,tickSeconds:8,requiresStationary:true,attackOrMovementSuppressSeconds:8,ruleRef:'RULE-PROGRESSION'}),special:{kind:'conditional_regen',requiresFoodAndWeightGates:true}});

// General tier 5.
define('SKILL-G05-01',{kind:'status',immuneFlags:['boss','paralysis'],operations:[op('apply_status',effect('curse_paralysis',1,{movementDisabled:true,attackDisabled:true,castingDisabled:true},{saveFormula:'FORMULA-STATUS',delaySeconds:4,warningSeconds:4,durationSeconds:8,totalLifecycleSeconds:12,excludeBoss:true}))]});
define('SKILL-G05-02',magicalDamage('wind',5,8,16));
define('SKILL-G05-03',healing(3,12,50,3,0,{undeadConversion:{element:'holy',sameRolledAmount:true,additionalSp:false,formula:'FORMULA-MAGIC',targetOverride:'ally_or_undead_enemy'}}));
define('SKILL-G05-04',{...special('charm_monster',{maxLevelRelativeToCaster:-5,maxCharmed:1,sharedCompanionSlots:1,retainHpMp:true,excludeBoss:true,saveFormula:'FORMULA-STATUS'},[op('charm',{saveFormula:'FORMULA-STATUS',excludeBoss:true,maxTargetLevelOffset:-5,slotCost:1,maxActive:1,restoreHostilityOnExpire:true,noRewardsOnCharmedDeath:true})]),immuneFlags:['boss','charm']});
define('SKILL-G05-05',{kind:'dispel',operations:[op('remove_status',{groups:['poison','blind','slow','paralysis','curse_paralysis'],allMatching:true,preserveBuffs:true})]});
define('SKILL-G05-06',magicalDamage('water',5,8,16));
define('SKILL-G05-07',status('darkness',6,{hit:-6}));
define('SKILL-G05-08',special('mana_steal',{saveFormula:'FORMULA-STATUS',maxAmount:20,preserveResourceConservation:true},[op('transfer_mp',{source:'target',destination:'self',maxAmount:20,saveFormula:'FORMULA-STATUS',clampDestinationToMax:true})]));

// General tier 6.
define('SKILL-G06-01',special('animate_corpse',{consumeNormalMonsterCorpse:true,monsterId:'MON-ZOMBIE',levelExpression:{kind:'min',constant:30,variable:'casterLevel'},hpExpression:{constant:100,levelCoefficient:10},sharedCompanionSlots:1},[op('summon_from_corpse',{monsterId:'MON-ZOMBIE',slotCost:1,consumeCorpse:true,levelCap:30,hpConstant:100,hpPerLevel:10,remainingStatsFromMonster:true})]));
define('SKILL-G06-02',buff('strength',5,{STR:5}));
define('SKILL-G06-03',buff('haste',1.33,{haste:1.33,moveIntervalDivisor:1.33,actionIntervalDivisor:1.33}));
define('SKILL-G06-04',{kind:'dispel',operations:[op('remove_effects',{saveFormula:'FORMULA-STATUS',selection:'all_dispellable_buffs_and_debuffs',preserve:['learned_skills','equipment','captured_pets','summons']})]});
define('SKILL-G06-05',magicalDamage('earth',6,8,20));
define('SKILL-G06-06',magicalDamage('fire',7,8,22));
define('SKILL-G06-07',status('weakness',5,{meleeDamage:-5,STR:-3}));
define('SKILL-G06-08',buff('magic_weapon',3,{damage:3,hit:2},{scope:'equipped_weapon'}));

// General tier 7.
define('SKILL-G07-01',{...healing(2,12,35,2,8),targetOverride:'owned_companions_in_self_radius_excluding_caster',operations:[op('heal',{amount:roll(2,12,35,2,0),clampToMax:true,excludeCaster:true,requiresLineOfSightPerTarget:true})]});
define('SKILL-G07-02',{kind:'ground_effect',element:'water',damage:roll(2,8,0,0,2),special:{kind:'periodic_damage_wall',lengthCells:6,tickSeconds:2,blocksMovement:false},operations:[op('create_wall',{lengthCells:6,durationSeconds:10,tickSeconds:2,firstTick:'after_interval',blocksMovement:false,targetPredicate:'enemy_occupying_cell',damage:{element:'water',formula:'FORMULA-MAGIC',amount:roll(2,8,0,0,2)}})]});
define('SKILL-G07-03',special('summon_monster',{defaultMonster:'MON-BUGBEAR',choices:[{monsterId:'MON-BUGBEAR',minLevel:28},{monsterId:'MON-CERBERUS',minLevel:40},{monsterId:'MON-MINOTAUR',minLevel:48}],choiceRequiresEquipment:'EQ-SUMMON-RING',maxGeneralSummons:3,sharedCompanionSlots:1},[op('summon_monster',{defaultMonster:'MON-BUGBEAR',choices:[{monsterId:'MON-BUGBEAR',minLevel:28},{monsterId:'MON-CERBERUS',minLevel:40},{monsterId:'MON-MINOTAUR',minLevel:48}],choiceRing:'EQ-SUMMON-RING',maxActive:3,slotCost:1,useMonsterStats:true})]));
define('SKILL-G07-04',buff('holy_walk',1.5,{moveBoost:1.5,moveIntervalDivisor:1.5},{attackSpeedUnaffected:true}));
define('SKILL-G07-05',magicalDamage('wind',6,8,20,4,'enemies_in_self_radius'));
define('SKILL-G07-06',buff('haste',1.33,{haste:1.33,moveIntervalDivisor:1.33,actionIntervalDivisor:1.33}));
define('SKILL-G07-07',{kind:'ground_effect',element:'earth',damage:roll(8,8,0,0,2),special:{kind:'single_trigger_trap',maxActive:3,blocksMovement:false},operations:[op('create_trap',{maxActive:3,requiresLegalTile:true,trigger:'first_enemy_enters_cell',oneShot:true,blocksMovement:false,damage:{element:'earth',formula:'FORMULA-MAGIC',amount:roll(8,8,0,0,2)}})]});
define('SKILL-G07-08',status('disease',8,{ac:8,hit:-4}));

// General tier 8.
define('SKILL-G08-01',{kind:'heal',heal:{mode:'full_hp'},operations:[op('heal',{mode:'full_hp',undeadConversion:{element:'holy',amount:{mode:'min',constant:250,targetMaxHpCoefficient:0.5},additionalSp:false,formula:'FORMULA-MAGIC',targetOverride:'ally_or_undead_enemy'}})]});
define('SKILL-G08-02',{kind:'ground_effect',element:'fire',damage:roll(2,8,0,0,2),special:{kind:'periodic_damage_wall',lengthCells:6,tickSeconds:1,blocksMovement:false},operations:[op('create_wall',{lengthCells:6,durationSeconds:10,tickSeconds:1,firstTick:'after_interval',blocksMovement:false,targetPredicate:'enemy_occupying_cell',damage:{element:'fire',formula:'FORMULA-MAGIC',amount:roll(2,8,0,0,2)}})]});
define('SKILL-G08-03',magicalDamage('water',7,8,24,6,'enemies_in_self_radius'));
define('SKILL-G08-04',{...buff('invisibility',1,{invisible:true},{breakOn:['attack','cast','pickup'],movementAllowed:true,detectable:true}),special:{kind:'invisibility'}});
define('SKILL-G08-05',special('resurrect_owned_pet',{hpRatio:1,mpRatio:0,xpRefund:0,excludeSummons:true},[op('resurrect',{target:'owned_pet_corpse',hpRatio:1,mpRatio:0,xpRefund:0,minimumHp:1,uniqueCollarIdentity:true})]));
define('SKILL-G08-06',magicalDamage('earth',7,8,25,3,'enemies_in_self_radius'));
define('SKILL-G08-07',status('silence',1,{castingDisabled:true},{physicalAttacksAllowed:true,itemsAllowed:true}));
define('SKILL-G08-08',{kind:'heal_over_time',heal:roll(0,0,10),operations:[op('apply_buff',effect('healing_storm',10,{periodicHeal:10},{tickSeconds:5,firstTick:'after_interval',naturalRegen:false,ignoresWeightRegenGate:true,healAmount:roll(0,0,10)}))]});

// General tier 9.
define('SKILL-G09-01',magicalDamage('wind',8,8,28,3,'enemies_in_target_radius'));
define('SKILL-G09-02',{...status('sleep',1,{movementDisabled:true,attackDisabled:true,castingDisabled:true},{breakOn:['damage'],excludeBoss:true,savePerTarget:true}),radius:2,targetOverride:'enemies_in_target_radius',immuneFlags:['boss','sleep']});
define('SKILL-G09-03',special('polymorph',{playerOnly:true,selfFormsFromRegistry:true,selfNoStatChange:true},[op('polymorph',{self:{registry:'visual_forms',requireLevelEligibility:true,noStatChange:true}})]));
define('SKILL-G09-04',buff('immune_to_harm',0.5,{finalDamageMultiplier:0.5},{damagePipelineStage:'after_flat_reduction'}));
define('SKILL-G09-05',special('party_teleport',{mapPermission:'teleport',controlRing:'EQ-TELEPORT-RING',radius:2,includeCaster:true,companionsOnly:true,placeCompanionsNearestLegalAdjacent:true},[op('teleport',{subject:'caster_and_owned_companions_in_radius',radius:2,mode:'random_legal_tile_or_ring_memory',companionPlacement:'nearest_legal_adjacent',cannotBypassLockedBarriers:true})]));
define('SKILL-G09-06',magicalDamage('fire',9,8,30,3,'enemies_in_self_radius'));
define('SKILL-G09-07',status('potion_freeze',1,{healingPotionsDisabled:true},{magicalHealingAllowed:true}));
define('SKILL-G09-08',{kind:'reveal',radius:8,targetOverride:'invisible_enemies_in_self_radius',damage:roll(0,0,10),operations:[op('snapshot_targets',{predicate:'invisible_enemy'}),op('reveal',{radius:8,removeInvisibility:true}),op('damage',{element:'none',formula:'FORMULA-MAGIC',amount:roll(0,0,10),targetSet:'snapshot_invisible_enemies'})]});

// General tier 10.
define('SKILL-G10-01',special('two_weapon_fusion',{requiredCount:2,requiredEnchant:0,requiredSameCanonicalId:true,requiresBackpack:true,requiresEnchantableWeapon:true,transactionRule:'RULE-FUSION',successEnchant:1,failureDestroysBoth:true},[op('fusion_transaction',{count:2,sameCanonicalId:true,sameEnchant:0,weaponOnly:true,ruleRef:'RULE-FUSION',noSingleItemAlternative:true})]));
define('SKILL-G10-02',magicalDamage('fire',12,8,40,3,'enemies_in_target_radius'));
define('SKILL-G10-03',special('resurrect_owned_pet',{hpRatio:1,mpRatio:1,xpRefund:0,excludeSummons:true},[op('resurrect',{target:'owned_pet_corpse',hpRatio:1,mpRatio:1,xpRefund:0,minimumHp:1,uniqueCollarIdentity:true})]));
define('SKILL-G10-04',{...status('slow',1.5,{moveIntervalMultiplier:1.5,attackIntervalMultiplier:1.5},{savePerTarget:true}),radius:3,targetOverride:'enemies_in_target_radius'});
define('SKILL-G10-05',{...magicalDamage('none',16,8,60),restrictions:['alignment_nonnegative'],special:{kind:'alignment_gate',baselineAlignment:0,noKarmaSubsystem:true}});
define('SKILL-G10-06',{...buff('absolute_barrier',1,{damageImmune:true,naturalHpRegenDisabled:true,naturalMpRegenDisabled:true},{breakOn:['any_active_action_except_move'],movementAllowed:true}),special:{kind:'absolute_barrier'}});
define('SKILL-G10-07',{...buff('soul_expansion',1.2,{maxRatio:1.2,maxHpMultiplier:1.2,maxMpMultiplier:1.2}),special:{kind:'max_resource_buff',fillOnApply:false,clampOnExpire:true}});
define('SKILL-G10-08',{...magicalDamage('water',12,8,40,6,'enemies_in_self_radius'),operations:[op('damage',{formula:'FORMULA-MAGIC',element:'water',amount:roll(12,8,40,0,2)}),op('apply_status',effect('freeze',1,{movementDisabled:true,attackDisabled:true,castingDisabled:true},{durationSeconds:2,chance:0.2,saveFormula:null,excludeBoss:true,rollPerTarget:true}))]});

// Knight techniques.
define('SKILL-KNIGHT-01',{kind:'attack_and_status',restrictions:['equipped_twohand_sword'],operations:[op('weapon_attack',{count:1,formula:'FORMULA-PHYS-HIT+FORMULA-PHYS-DAMAGE'}),op('apply_status',effect('stun',1,{movementDisabled:true,attackDisabled:true,castingDisabled:true},{saveFormula:'FORMULA-STATUS',durationSeconds:2,excludeBoss:true,requiresPreviousHit:true}))],designDecisions:[{field:'requiresPreviousHit',reason:'原文未明示暈眩與武器命中先後；此執行適配採先命中再判定暈眩，需父執行器確認。'}]});
define('SKILL-KNIGHT-02',{...buff('spiked_armor',5,{reflectPhysical:5}),special:{kind:'reflect_melee',trigger:'received_successful_melee_hit',fixedDamage:5,perAttackerCooldownSeconds:1,cannotReflectReflections:true},operations:[op('apply_buff',effect('spiked_armor',5,{reflectPhysical:5},{trigger:'received_successful_melee_hit',perAttackerCooldownSeconds:1,reflectDamage:roll(0,0,5),reflectedDamageCannotTriggerReflection:true}))]});
define('SKILL-KNIGHT-03',buff('damage_reduction',5,{flatDamageReduction:5},{damagePipelineStage:'before_final_multiplier'}));
define('SKILL-KNIGHT-04',{...buff('counter_barrier',1,{meleeBlockChance:0.2}),restrictions:['equipped_twohand_sword'],special:{kind:'block_and_counter',chance:0.2,cooldownSeconds:1,counterAmount:'weapon_maximum_damage'},operations:[op('apply_buff',effect('counter_barrier',1,{meleeBlockChance:0.2},{trigger:'incoming_melee_hit',chance:0.2,cooldownSeconds:1,negateIncomingHit:true,counterDamageMode:'weapon_maximum_damage',requiresWeaponFamily:'twohand_sword'}))]});

// Elf common and elemental spells, no inference by localized name.
define('SKILL-ELF-01',buff('elf_magic_defense',10,{mr:10}));
define('SKILL-ELF-02',special('hp_to_mp',{hpCost:5,mpGain:2,minimumRemainingHp:1,noCostDiscount:true},[op('restore_mp',{amount:2,clampToMax:true,hpAlreadyChargedByCastCosts:true})]));
define('SKILL-ELF-03',special('world_tree_return',{destinationMapId:'MAP-TOWN-ELF',destinationKind:'safe_respawn',mapPermission:'teleport'},[op('teleport',{subject:'self',mode:'world_tree_safe_spawn',destinationMapId:'MAP-TOWN-ELF',respectMapNoTeleport:true})]));
define('SKILL-ELF-04',buff('wisdom',3,{WIS:3}));
define('SKILL-ELF-05',buff('elemental_defense',10,{fire_resistance:10,water_resistance:10,wind_resistance:10,earth_resistance:10}));
define('SKILL-ELF-06',special('release_owned_summon',{allowedTypes:['summon','charmed_monster'],excludeCapturedPets:true},[op('release_summon',{allowOwnedOnly:true,allowCharm:true,excludeCapturedPets:true,restoreCharmedHostility:true})]));
define('SKILL-ELF-07',special('hp_to_mp',{hpCost:50,mpGain:20,minimumRemainingHp:1,noCostDiscount:true},[op('restore_mp',{amount:20,clampToMax:true,hpAlreadyChargedByCastCosts:true})]));
define('SKILL-ELF-08',{kind:'dispel',operations:[op('remove_effects',{saveFormula:'FORMULA-STATUS',selection:'one_dispellable_buff',sort:[{field:'remainingSeconds',direction:'desc'},{field:'skillId',direction:'asc'}],count:1,preserveDebuffs:true})]});
define('SKILL-ELF-09',{...status('silence',1,{castingDisabled:true},{durationSeconds:10,savePerTarget:true}),radius:6,targetOverride:'enemies_in_self_radius'});
define('SKILL-ELF-10',{kind:'multi_attack',restrictions:['equipped_bow','ammo_at_least_3','enemy_not_self'],special:{kind:'triple_arrow',attackCount:3,independentHitRolls:true,independentDamageRolls:true,ammoCount:3},operations:[op('reserve_ammo',{count:3,ammoFromEquippedBow:true}),op('weapon_attack',{count:3,attackType:'ranged',independentHitRolls:true,independentDamageRolls:true,consumeReservedAmmoPerAttack:1,formula:'FORMULA-PHYS-HIT+FORMULA-PHYS-DAMAGE'})]});
define('SKILL-ELF-11',buff('fire_weapon',3,{meleeDamage:3}));
define('SKILL-ELF-12',{...buff('fire_weapon',4,{meleeDamage:4}),radius:6,targetOverride:'caster_and_owned_companions_in_self_radius'});
define('SKILL-ELF-13',buff('fire_weapon',5,{meleeDamage:5}));
define('SKILL-ELF-14',buff('wind_weapon',2,{rangedDamage:2}));
define('SKILL-ELF-15',{...buff('wind_accuracy',3,{rangedHit:3}),radius:6,targetOverride:'caster_and_owned_companions_in_self_radius'});
define('SKILL-ELF-16',buff('wind_weapon',5,{rangedDamage:5}));
define('SKILL-ELF-17',buff('bravery',1.33,{brave:1.33,actionIntervalDivisor:1.33},{mutuallyExclusiveWithItems:['ITEM-ELVEN-WAFER','ITEM-BRAVERY-POTION']}));
define('SKILL-ELF-18',buff('water_guard',5,{er:5},{erMeaning:'one_percentage_point_reduction_to_incoming_ranged_hit_per_er'}));
define('SKILL-ELF-19',buff('nature_regen',5,{hpr:5},{naturalRegen:true,tickSeconds:8,ruleRef:'RULE-PROGRESSION',requiresFoodAndWeightGates:true,applyActivityMultiplier:true}));
define('SKILL-ELF-20',buff('healing_received',1.2,{healingReceivedMultiplier:1.2},{stacking:'take_maximum_healing_amplification_across_all_sources'}));
define('SKILL-ELF-21',{...healing(3,12,50,0,6),targetOverride:'caster_and_owned_companions_in_self_radius'});
define('SKILL-ELF-22',buff('earth_defense',3,{ac:-3}));
define('SKILL-ELF-23',{...buff('earth_defense',4,{ac:-4}),radius:6,targetOverride:'caster_and_owned_companions_in_self_radius'});
define('SKILL-ELF-24',buff('earth_defense',6,{ac:-6}));
define('SKILL-ELF-25',{...status('earth_bind',1,{movementDisabled:true,attackDisabled:true,castingDisabled:true,damageImmune:true},{excludeBoss:true}),immuneFlags:['boss','root']});

// Dark Elf abilities.
define('SKILL-DARKELF-01',{...buff('invisibility',1,{invisible:true},{breakOn:['attack','cast','pickup'],movementAllowed:true,detectable:true}),special:{kind:'invisibility'}});
define('SKILL-DARKELF-02',{...buff('venom_weapon',1,{poisonOnHitChance:0.2}),special:{kind:'poison_on_hit',chance:0.2,trigger:'successful_physical_hit'},operations:[op('apply_buff',effect('venom_weapon',1,{poisonOnHitChance:0.2},{trigger:'successful_physical_hit',chance:0.2,secondaryEffect:effect('poison',3,{dotHp:3},{tickSeconds:3,tickCount:6,durationSeconds:18,firstTick:'after_interval',damageMode:'fixed_hp_loss',saveFormula:null,immuneFlags:['poison_immunity']})}))]});
define('SKILL-DARKELF-03',buff('shield',3,{ac:-3}));
define('SKILL-DARKELF-04',buff('strength',2,{STR:2}));
define('SKILL-DARKELF-05',special('refine_dark_stone',{input:{itemId:'ITEM-COAL',quantity:1},successChance:0.25,successOutput:{itemId:'ITEM-DARK-STONE',quantity:1},consumeInputOnFailure:true,enchantUnaffected:true},[op('item_conversion',{input:{itemId:'ITEM-COAL',quantity:1},chance:0.25,output:{itemId:'ITEM-DARK-STONE',quantity:1},consumeOnFailure:true,atomic:true})]));
define('SKILL-DARKELF-06',buff('bravery_movement',1.33,{moveBoost:1.33,moveIntervalDivisor:1.33},{attackSpeedUnaffected:true,stacksWithGroups:['haste']}));
define('SKILL-DARKELF-07',{...buff('burning_spirit',1.5,{physicalProcMultiplier:1.5}),special:{kind:'damage_multiplier_proc',chance:0.33,multiplier:1.5,requiresMelee:true,extraAttack:false},operations:[op('apply_buff',effect('burning_spirit',1.5,{physicalProcMultiplier:1.5},{trigger:'successful_melee_hit',chance:0.33,multiplier:1.5,stacksMultiplicativelyWith:['double_break'],extraAttack:false}))]});
define('SKILL-DARKELF-08',buff('dexterity',2,{DEX:2}));
define('SKILL-DARKELF-09',buff('poison_immunity',1,{poisonImmune:true},{doesNotCureExistingPoison:true}));
define('SKILL-DARKELF-10',status('blind',4,{visionRadius:2,hit:-4}));
define('SKILL-DARKELF-11',{...buff('double_break',2,{physicalProcMultiplier:2}),restrictions:['equipped_dual_blade_or_claw'],special:{kind:'damage_multiplier_proc',chance:0.25,multiplier:2,weaponFamilies:['dual_blade','claw'],extraAttack:false},operations:[op('apply_buff',effect('double_break',2,{physicalProcMultiplier:2},{trigger:'successful_physical_hit',chance:0.25,multiplier:2,requiresWeaponFamilies:['dual_blade','claw'],stacksMultiplicativelyWith:['burning_spirit'],extraAttack:false}))]});
define('SKILL-DARKELF-12',buff('uncanny_dodge',10,{incomingMeleeHitPercentagePoints:-10},{finalHitClampPercent:[5,95]}));
define('SKILL-DARKELF-13',buff('magic_weapon',3,{damage:3},{scope:'equipped_weapon'}));
define('SKILL-DARKELF-14',{kind:'resource_burst',damage:{mode:'resources_spent',hpSpentCoefficient:0.5,mpSpentCoefficient:2},special:{kind:'all_resources_physical_burst',remainingHp:1,remainingMp:0,noInstantKill:true,noBossExtraCap:true},operations:[op('spend_dynamic_resources',{hp:'current_hp_minus_1',mp:'all_current_mp',saveSpentAmounts:true,minimumPrecastHp:2}),op('damage',{formula:'FORMULA-PHYS-HIT+PHYSICAL_DEFENSES_ONLY',damageMode:'explicit_base_no_weapon_or_stat_additions',addWeaponStatBonuses:false,applyWeaponDamageProcs:false,amount:{mode:'resources_spent',hpSpentCoefficient:0.5,mpSpentCoefficient:2},requiresPhysicalHit:true,applyOrdinaryDefenses:true,noBossExtraCap:true})]});

// Eight separate summon records; numeric profiles are explicitly enumerated, not inferred from ID.
const elementalSummons = [
 ['SKILL-ELF-SUMMON-FIRE','fire','SUMMON-FIRE',400,18],
 ['SKILL-ELF-SUMMON-FIRE-GREATER','fire','SUMMON-FIRE-GREATER',800,30],
 ['SKILL-ELF-SUMMON-WATER','water','SUMMON-WATER',400,18],
 ['SKILL-ELF-SUMMON-WATER-GREATER','water','SUMMON-WATER-GREATER',800,30],
 ['SKILL-ELF-SUMMON-WIND','wind','SUMMON-WIND',400,18],
 ['SKILL-ELF-SUMMON-WIND-GREATER','wind','SUMMON-WIND-GREATER',800,30],
 ['SKILL-ELF-SUMMON-EARTH','earth','SUMMON-EARTH',400,18],
 ['SKILL-ELF-SUMMON-EARTH-GREATER','earth','SUMMON-EARTH-GREATER',800,30]
];
for (const [id,element,assetId,hp,damage] of elementalSummons) define(id,{
 kind:'summon',element,special:{kind:'summon_elemental',assetId,replaceExistingElementalAtomically:true,maxActiveElementals:1,sharedCompanionSlots:1},
 operations:[op('summon_elemental',{assetId,element,stats:{hp,mp:200,ac:-30,mr:40,attackIntervalSeconds:1.5,rangeCells:6,attackDamage:damage,attackDamageElement:element},slotCost:1,maxElementals:1,replaceExistingElementalAtomically:true})],
 unspecifiedByBaseline:['elemental_move_interval','elemental_level_for_hit_or_status_formulas']
});

// Common contracts are data, not fallbacks for missing behavior.
export const SKILL_SEMANTIC_CONTRACT = Object.freeze({
 version:'AC-skill-behaviors-1.0.0',
 targetAliases:{ally:'caster_or_owned_active_pet_or_summon',party_area:'caster_and_owned_active_companions',enemy:'attackable_monster_only',corpse:'owned_pet_corpse_only'},
 distance:'Chebyshev inclusive radius; per-target supercover line of sight; no diagonal corner clipping',
 casting:'Validate learned/class/level/target/range/LOS/map/equipment/items/shared-capacity first. Rejection spends nothing. At accepted cast start charge listed costs once; interrupted casts do not refund. Extra special inputs are reserved and consumed atomically, not charged twice.',
 hpCosts:'Fixed HP costs must leave at least1HP. Dynamic final-burst cost replaces any fixed HP/MP cost (both metadata fields are0).',
 stacking:'Same skill refreshes duration; same group uses stronger effect and a weaker cast cannot overwrite a stronger one. Different groups combine. Stronger comparisons can use strengthVector. Speed divisor aliases describe the same modifier and MUST NOT be multiplied twice.',
 buffValueAliases:{haste:'same modifier as actionIntervalDivisor and moveIntervalDivisor in haste group',brave:'same modifier as actionIntervalDivisor in bravery group',moveBoost:'same modifier as moveIntervalDivisor',maxRatio:'same modifier as maxHpMultiplier and maxMpMultiplier'},
 spellPower:'Explicit spCoefficient=2 means FORMULA-MAGIC adds2*SP exactly once. Fixed heals, life-steal healing, reveal damage and healing-to-undead conversion have no extra SP.',
 damage:'Damage operations must preserve attack type, element, hit policy and mitigation order. Status saves are separately marked. No operation may silently use a generic damage default.',
 summon:'Summons/charm/animated corpses/elementals share captured-pet capacity from RULE-PET-LIFECYCLE, each costs1. Ordinary summons additionally capped3; elementals capped1, charm capped1. Summons have no growth, food need or death drops/XP. Their kills credit owner. Death/expiry removes summon, not captured pets. Charm preserves currentHP/MP and restores hostility on expiry.',
 periodic:'An explicit firstTick=after_interval means no immediate tick. Duration includes a tick on its ending timestamp before expiry. This endpoint ordering is an execution decision and is disclosed below.',
 sources:'Approved Ashen_Covenant_完整製作內容總表_v1.0.0.json; all skill effect prose retained in sourceEffect for audit.'
});

export const SKILL_SEMANTIC_NOTES = Object.freeze([
 {type:'adapter_decision',fields:['periodic.firstTick','periodic.end_timestamp_order'],note:'毒術明定十次；所有週期效果採首個完整間隔後才觸發，結束時刻先處理最後一次tick再移除。牆、持續治療原文未明示首tick順序，執行器應明示接受此適配。'},
 {type:'adapter_decision',fields:['SKILL-KNIGHT-01.requiresPreviousHit'],note:'衝擊之暈先執行正常武器一擊，命中後才擲狀態機率；首領只受普通一擊。原文未明定前後依賴。'},
 {type:'baseline_underspecified',fields:['elemental_move_interval','elemental_level_for_hit_or_status_formulas'],note:'元素精靈原文有HP/MP/AC/MR/攻速/射程/傷害，沒有移速與等級。行為資料不自行填入；執行器需另列明確設計決定。'},
 {type:'baseline_underspecified',fields:['counter_barrier.counter_weapon_maximum'],note:'反擊屏障的「武器最大傷害」未明定大小體型／+N與加值納入方式；資料使用符號模式weapon_maximum_damage，不偽造常數。'},
 {type:'integration',fields:['spellPower','buffValueAliases'],note:'amount中的SP/INT係數必須只計一次；haste/brave/moveBoost/maxRatio及其展開欄位是同一個修正，不可重複相乘。'},
 {type:'integration',fields:['special.kind','operations'],note:'special是同一套operations的執行提示，不是第二次額外施放。每技能只能執行一次操作序列。'},
 {type:'integration',fields:['failed_validation','costs'],note:'不存在行為的技能必須報錯，不能退化為傷害技能；本表包含完整130筆但不代表執行器已完成每個機制。'}
]);

// Small normalization changes with explicit semantics, never inferred localized-name matching.
rows['SKILL-G04-03'].restrictions.push('target_has_equipped_weapon');
rows['SKILL-G03-05'].restrictions.push('caster_has_equipped_chest_armor');
for (const id of ['SKILL-G01-01','SKILL-G03-03','SKILL-G05-03','SKILL-G08-01']) rows[id].targetOverride='ally_or_undead_enemy';
// Owner-confirmed FORM-05 restriction; numeric baseline remains unchanged.
rows['SKILL-G09-03'].target='self';
rows['SKILL-G09-03'].targetOverride=null;
rows['SKILL-G09-03'].sourceEffect='目前單人僅能對自己使用已解鎖或保留舊權限的變身；形態改變攻速，收藏獎勵另依暫定圖鑑表。保留原職業與武器，不獲得怪物技能。不能對怪物、寵物或召喚物施放；友方玩家施放待多角色支援。';
rows['SKILL-G09-03'].targetPolicyVersion='FORM-05-single-player-20261010';
rows['SKILL-G08-05'].targetOverride='owned_pet_corpse';
rows['SKILL-G10-03'].targetOverride='owned_pet_corpse';
rows['SKILL-G09-05'].radius=2;
rows['SKILL-G04-04'].operations[1].rounding='floor_after_mitigation';
rows['SKILL-G05-08'].operations[0].actualAmount='min(maxAmount,targetCurrentMp,casterMissingMp)';
rows['SKILL-G05-08'].operations[0].preserveResourceConservation=true;
rows['SKILL-DARKELF-14'].operations[0].minimumPrecastHp=1;
rows['SKILL-G02-04'].operations[0].strengthVector=[2,0];
rows['SKILL-G06-08'].operations[0].strengthVector=[3,2];
rows['SKILL-DARKELF-13'].operations[0].strengthVector=[3,0];

function deepFreeze(value) {
 if (value && typeof value==='object' && !Object.isFrozen(value)) {
  Object.freeze(value);for (const child of Object.values(value)) deepFreeze(child);
 }
 return value;
}
export const SKILL_BEHAVIORS = deepFreeze(rows);
export const SKILL_IDS = Object.freeze([...definitionOrder]);
export const REQUIRED_OPERATION_KINDS = Object.freeze([...new Set(Object.values(rows).flatMap(r=>r.operations.map(o=>o.op)))].sort());
export const REQUIRED_SPECIAL_KINDS = Object.freeze([...new Set(Object.values(rows).map(r=>r.special?.kind).filter(Boolean))].sort());
export const REQUIRED_BUFF_GROUPS = Object.freeze([...new Set(Object.values(rows).flatMap(r=>r.operations.filter(o=>o.group).map(o=>o.group)))].sort());

/** Fails closed. Returns a report; does not imply execution or visual QA passed. */
export function validateSkillBehaviors(catalogSkills=null) {
 const expected=(catalogSkills ?? Object.entries(SOURCE_METADATA).map(([id,m])=>({id,name_zh:m.name}))).map(s=>s.id);
 const errors=[];const assert=(condition,message)=>{if(!condition)errors.push(message);};
 assert(expected.length===130,`Expected source roster130, got${expected.length}`);
 assert(new Set(expected).size===expected.length,'Source roster contains duplicate IDs');
 assert(SKILL_IDS.length===130,`Behavior roster not130: ${SKILL_IDS.length}`);
 assert(new Set(SKILL_IDS).size===SKILL_IDS.length,'Behavior registration duplicates');
 assert(Object.keys(SKILL_BEHAVIORS).length===130,'Behavior object key count mismatch');
 for(const id of expected)assert(Boolean(SKILL_BEHAVIORS[id]),`Missing ${id}`);
 for(const id of SKILL_IDS)assert(expected.includes(id),`Unknown behavior ${id}`);
 const allowedOps=new Set(['damage','heal','apply_buff','apply_status','remove_status','remove_effects','teleport','reveal','instant_kill','inspect_resistance','modify_durability','heal_from_damage','charm','transfer_mp','summon_from_corpse','create_wall','summon_monster','create_trap','resurrect','polymorph','snapshot_targets','fusion_transaction','weapon_attack','restore_mp','release_summon','reserve_ammo','item_conversion','spend_dynamic_resources','summon_elemental']);
 const allowedKinds=new Set(['damage','heal','buff','status','special','dispel','reveal','ground_effect','heal_over_time','attack_and_status','multi_attack','resource_burst','summon']);
 for(const [id,b] of Object.entries(SKILL_BEHAVIORS)){
  assert(allowedKinds.has(b.kind),`${id}: missing/invalid effect kind`);
  assert(Array.isArray(b.operations)&&b.operations.length>0,`${id}: no operations`);
  assert(Number.isFinite(b.range)&&b.range>=0,`${id}: range missing`);
  assert(Number.isFinite(b.radius)&&b.radius>=0,`${id}: radius missing`);
  assert(Number.isFinite(b.durationSeconds)&&b.durationSeconds>=0,`${id}: duration missing`);
  for(const o of b.operations){
   assert(allowedOps.has(o.op),`${id}: unknown operation ${o.op}`);
   if(o.op==='damage')assert(Boolean(o.amount)&&Boolean(o.formula),`${id}: damage missing explicit amount/formula`);
   if(['apply_buff','apply_status'].includes(o.op))assert(Boolean(o.group)&&o.values&&Number.isFinite(o.durationSeconds),`${id}: malformed effect`);
  }
  assert(!('fallbackDamage' in b),`${id}: forbidden fallback damage`);
 }
 // Mechanism-specific regression assertions, independent of coverage count.
 const B=SKILL_BEHAVIORS;
 assert(B['SKILL-G01-01'].heal.intCoefficient===1,'Lesser heal INT mismatch');
 assert(B['SKILL-G05-03'].heal.dice[0]===3&&B['SKILL-G05-03'].heal.intCoefficient===3,'Greater heal mismatch');
 assert(B['SKILL-G03-02'].special.kind==='turn_undead'&&B['SKILL-G03-02'].special.excludeBoss,'Turn undead conflated with damage');
 assert(B['SKILL-G04-04'].operations[1].ratio===0.5,'Life steal actual-damage ratio lost');
 assert(B['SKILL-G04-07'].special.excludesArea,'Counter magic incorrectly absorbs AoE');
 assert(B['SKILL-G05-01'].operations[0].delaySeconds===4&&B['SKILL-G05-01'].operations[0].durationSeconds===8,'Curse staging lost');
 assert(B['SKILL-G05-08'].special.maxAmount===20,'Mana transfer cap lost');
 assert(B['SKILL-G07-02'].operations[0].tickSeconds===2&&B['SKILL-G08-02'].operations[0].tickSeconds===1,'Walls collapsed into same tick');
 assert(B['SKILL-G07-07'].operations[0].oneShot===true&&B['SKILL-G07-07'].special.maxActive===3,'Trap semantics lost');
 assert(B['SKILL-G08-05'].special.mpRatio===0&&B['SKILL-G10-03'].special.mpRatio===1,'Resurrection variants collapsed');
 assert(B['SKILL-G09-03'].special.playerOnly&&B['SKILL-G09-03'].target==='self'&&!B['SKILL-G09-03'].operations[0].enemy,'Polymorph must exclude nonplayer targets');
 assert(B['SKILL-G10-01'].special.requiredCount===2&&B['SKILL-G10-01'].special.requiredEnchant===0,'Fusion spell bypasses two-item rule');
 assert(B['SKILL-G10-06'].operations[0].values.damageImmune===true,'Absolute barrier missing immunity');
 assert(B['SKILL-G10-07'].special.fillOnApply===false,'Soul expansion incorrectly heals');
 assert(B['SKILL-G10-08'].operations[1].chance===0.2&&B['SKILL-G10-08'].operations[1].excludeBoss,'Blizzard independent freeze lost');
 assert(B['SKILL-ELF-10'].special.attackCount===3&&B['SKILL-ELF-10'].special.ammoCount===3,'Triple arrow lacks three attacks/ammo');
 assert(B['SKILL-ELF-25'].operations[0].values.damageImmune,'Earth bind lacks target invulnerability');
 assert(B['SKILL-DARKELF-05'].special.successChance===0.25&&B['SKILL-DARKELF-05'].special.consumeInputOnFailure,'Refine probability/material loss lost');
 assert(B['SKILL-DARKELF-07'].special.chance===0.33&&B['SKILL-DARKELF-11'].special.chance===0.25,'Damage procs conflated');
 assert(B['SKILL-DARKELF-14'].damage.hpSpentCoefficient===0.5&&B['SKILL-DARKELF-14'].damage.mpSpentCoefficient===2,'Final burst resource coefficients lost');
 assert(elementalSummons.length===8&&elementalSummons.every(([id])=>B[id].operations[0].op==='summon_elemental'),'Elemental summon variants missing');
 return {ok:errors.length===0,errors,skillCount:SKILL_IDS.length,operationKinds:REQUIRED_OPERATION_KINDS,specialKinds:REQUIRED_SPECIAL_KINDS,buffGroups:REQUIRED_BUFF_GROUPS,scope:'semantic data validation only; dispatcher and gameplay not tested'};
}
export const SKILL_BEHAVIOR_VALIDATION = deepFreeze(validateSkillBehaviors());
if(!SKILL_BEHAVIOR_VALIDATION.ok)throw new Error(SKILL_BEHAVIOR_VALIDATION.errors.join('\n'));
