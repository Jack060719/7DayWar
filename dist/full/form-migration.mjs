import {ensureFormProgress} from './form-progress.mjs';
// Pure preview: GameSession archives the original envelope before saving this copy.
export function prepareFormMigration(state){
 if(!state||state.formProgress!==undefined)return null;
 const next=structuredClone(state);ensureFormProgress(next,{migrateLegacy:true});
 return{state:next,notice:'已封存升級前快照，保留原本已達等級的四種變身權限；不補算歷史擊殺或收藏獎勵。'};
}
