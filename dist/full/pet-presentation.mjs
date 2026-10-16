import {ITEMS} from './data.mjs';
import {PET_ATTRIBUTES,petAttributes,petStatsV4,natureModifiers,petBagWeight,loyaltyBonuses} from './pets-v4.mjs';
export const PET_EFFECT_LABELS=Object.freeze({meleeAttack:'近戰傷害',rangedAttack:'遠程傷害',magicAttack:'魔法傷害',meleeHit:'近戰命中',rangedHit:'遠程命中',dg:'閃避',ac:'AC',mr:'魔防',attackSpeed:'攻擊速度',moveSpeed:'移動速度',hpRegen:'HP 回復',mpRegen:'MP 回復',hpGrowth:'每級 HP 成長',mpGrowth:'每級 MP 成長'});
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const color={white:'#eee',blue:'#8cc4ff',orange:'#ffb25c'},qualityName={white:'白',blue:'藍',orange:'橘'},typeName={common:'常見',single:'進階單型',compound:'進階複合'},attributeNames={STR:'力量',DEX:'敏捷',INT:'智力',MND:'精神',VIT:'體質'};
const number=value=>Number(value).toFixed(2).replace(/\.00$/,'').replace(/(\.\d)0$/,'$1');
const percentEffects=new Set(['meleeAttack','rangedAttack','magicAttack','attackSpeed','moveSpeed','hpGrowth','mpGrowth']);
function delta(key,value){const amount=percentEffects.has(key)?value*100:value,unit=percentEffects.has(key)?'%':['meleeHit','rangedHit','dg','mr'].includes(key)?' 個百分點':['hpRegen','mpRegen'].includes(key)?'／秒':'';return(amount>0?'+':'')+number(amount)+unit}
export function petNatureText(nature){const modifiers=natureModifiers({nature,ancestorNature:null});return Object.entries(modifiers).filter(([,value])=>value!==0).map(([key,value])=>PET_EFFECT_LABELS[key]+' '+delta(key,value)).join('、')}
export function petDetailsHTML(pet,{escape=escapeHTML}={}){
 if(!pet.v4)return '<p>舊版寵物：保留原有資質與進度。可先預覽新版規則，確認後才升級。</p>';
 const v4=pet.v4,attributes=petAttributes(pet),stats=petStatsV4(pet),base=petStatsV4({...pet,v4:{...v4,loyalty:0}}),loyalty=loyaltyBonuses(v4),used=v4.breedingUsed,available=Math.max(0,(pet.level>=30?1:0)+(pet.level>=45?1:0)-used);
 const natureHTML=(nature,label)=>'<p>'+label+'：<strong style="color:'+color[nature.quality]+'">'+escape(qualityName[nature.quality]+'・'+typeName[nature.type])+'</strong><br>'+escape(petNatureText(nature))+'</p>';
 let html='<p>'+escape(v4.sex==='male'?'雄性':'雌性')+(v4.shiny?' · <strong style="color:#ffe28a">異色</strong>':'')+(v4.ancestorNature?' · <strong style="color:#ffe28a">先祖血脈</strong>':'')+'</p>';
 html+='<table class="pet-attributes"><thead><tr><th>屬性</th><th>出生</th><th>目前</th><th>品質</th></tr></thead><tbody>'+PET_ATTRIBUTES.map(key=>{const a=attributes[key];return'<tr style="color:'+color[a.quality]+'"><th>'+escape(attributeNames[key]+' '+key)+'</th><td>'+number(a.birth)+'</td><td>'+number(a.value)+'</td><td>'+qualityName[a.quality]+(a.quality==='orange'?'・光環':'')+'</td></tr>'}).join('')+'</tbody></table>';
 html+=natureHTML(v4.nature,'主個性');if(v4.ancestorNature)html+=natureHTML(v4.ancestorNature,'先祖副個性');
 html+='<p>忠誠 '+v4.loyalty+'／1000<br>生命 '+base.maxHp+'<span style="color:#8cc4ff">（+'+(stats.maxHp-base.maxHp)+'）</span> · 物攻 '+base.attack+'<span style="color:#8cc4ff">（+'+(stats.attack-base.attack)+'）</span>';
 if(loyalty.damage)html+=' · <span style="color:#8cc4ff">魔法伤害（+'+number(loyalty.damage*100)+'%）</span>';
 html+='<br><small>食物至少 20 才累積忠誠；飢餓、死亡或寄放時暫停。</small></p>';
 html+='<p>繁殖已用 '+used+'／2；目前可用 '+available+' 次。<br><small>LV30、LV45 各一次。同物種異性，禁止親子及兄弟姊妹。</small></p>';
 html+='<p>寵物背包 '+number(petBagWeight(pet))+'／'+stats.carry+'</p>';
 const bag=v4.bag,rows=[...bag.equipment.map(item=>{const name=item.identified?ITEMS[item.itemId]?.name_zh||item.itemId:'未鑑定裝備';return '+'+item.plus+' '+name}),...bag.scrolls.map(item=>(item.identified?'':'未鑑定 ')+(ITEMS[item.itemId]?.name_zh||item.itemId)),...Object.entries(bag.stacks).map(([id,count])=>(ITEMS[id]?.name_zh||id)+' ×'+count)];
 html+=rows.length?'<ul>'+rows.map(text=>'<li>'+escape(text)+'</li>').join('')+'</ul>':'<p class="muted">背包空間尚未使用。</p>';
 if(v4.legacy)html+='<p class="muted">已保留舊版能力校準差；沒有重抽出生資質。</p>';return html;
}
export function legacyPreviewHTML(preview,{escape=escapeHTML}={}){if(!preview?.ok)return'<p>'+escape(preview?.error||'尚未選擇升級方式')+'</p>';const names={maxHp:'最大 HP',maxMp:'最大 MP',attack:'物攻',ac:'AC',mr:'魔防',attackInterval:'攻擊間隔（毫秒）',moveInterval:'移動間隔（毫秒）'};return'<p>這是預覽。確認後會保留原項圈、經驗與校準差，並固定所選性別及個性；不會重新抽取。</p><table><thead><tr><th>能力</th><th>原本</th><th>升級後</th></tr></thead><tbody>'+Object.entries(names).map(([key,name])=>'<tr><th>'+name+'</th><td>'+number(preview.before[key])+'</td><td>'+number(preview.after[key])+'</td></tr>').join('')+'</tbody></table>'+petDetailsHTML(preview.pet,{escape});}
