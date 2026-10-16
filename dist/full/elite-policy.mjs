// Approved Stage3 trial policy. Source species definitions remain unchanged.
import {monsterDefinition} from './silver-monsters.mjs';
import {random} from './rules.mjs';
import {ensureFormProgress} from './form-progress.mjs';
export function applyMonsterBirth(s,monster){
  monster.birthPolicy=1;
  monster.elite=!monsterDefinition(monster).boss&&random(s)<.02;
  if(monster.elite){monster.hp*=2;monster.maxHp*=2}
  return monster;
}
export const elitePower=monster=>monster?.elite===true?1.25:1;
export const monsterExperience=monster=>monsterDefinition(monster).exp*(monster.elite===true?2:1);
export function blessedDropChance(monster){return monsterDefinition(monster).boss?.05:monster.elite?.02:.005}
export function unlockEliteForm(s,monster,won){
  if(!monster.elite)return false;
  const success=won??random(s)<.02,ledger=ensureFormProgress(s);
  if(!success||ledger.earned.includes(monster.type))return false;
  ledger.earned.push(monster.type);return true;
}
