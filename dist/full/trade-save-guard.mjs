// Inspect validated save views only; escrow remains in its original identity
// domain across roster and family room transitions.
function records(envelope){
 const states=envelope.roster?envelope.roster.simulation.members.map(row=>row.state):[envelope.state];
 return states.filter(Boolean).map(state=>({id:state.id,escrow:state.tradeEscrow,transactions:state.tradeCoordinator?.transactions.filter(tx=>tx.decision==='prepared'||tx.parties.some(party=>!party.done))||[]})).filter(row=>row.escrow||row.transactions.length);
}
export function hasUnresolvedTrades(envelope){return records(envelope).length>0}
export function preservesUnresolvedTrades(candidate,known){
 const states=new Map((candidate.roster?candidate.roster.simulation.members.map(row=>row.state):[candidate.state]).filter(Boolean).map(state=>[state.id,state]));
 return records(known).every(record=>{
  const state=states.get(record.id);if(!state)return false;
  if(record.escrow&&JSON.stringify(state.tradeEscrow)!==JSON.stringify(record.escrow))return false;
  return record.transactions.every(tx=>JSON.stringify(state.tradeCoordinator?.transactions.find(row=>row.id===tx.id))===JSON.stringify(tx));
 });
}
