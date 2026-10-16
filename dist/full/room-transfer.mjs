// A room starts its own world. Each phone retains its frozen solo world locally.
// Removing it before cloning also avoids copying exploration history per packet.
export function compactRoomState(state){
 return{personalWorlds:'local-baseline',state:structuredClone({...state,worlds:{}})};
}
export function restoreRoomState(envelope,baseline){
 if(envelope?.personalWorlds!=='local-baseline'||!envelope.state?.worlds||Array.isArray(envelope.state.worlds)||Object.keys(envelope.state.worlds).length)throw Error('個人世界傳輸標記無效');
 const state=structuredClone(envelope.state),map=state.player?.map;
 state.worlds=baseline?structuredClone(baseline.worlds):{[map]:{mapId:map,monsters:[],ground:[],hazards:[],visitedAt:state.clockMs}};
 return state;
}
