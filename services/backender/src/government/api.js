import { transaction } from '../store.js';
import { ApiError } from '../auth.js';
import { createGovernment, governmentAction, governmentAccount, advanceElection, queuePublicWage, settlePublicWages } from './rules.js';
export function governmentDb(db){const g=db.government ||= createGovernment();advanceElection(g);return g;}
export function processPublicPayroll(db,id,state){
 const g=governmentDb(db);state.receipts=state.receipts.filter(r=>{if(!r.publicEmployer)return true;queuePublicWage(g,id,r.amount,r.label);return false;});settlePublicWages(g);
}
export function governmentRequest(input){try{return transaction(db=>{
 const g=governmentDb(db),id=input.playerId;
 // Balance, income and receipt acknowledgement are supplied by the authoritative wallet.
 // Identity, parking, election dates, one-vote rule and treasury mutations are server controlled.
 return governmentAction(g,id,{...input,pose:input.serverPose,name:db.profiles[id].display_name});
});}catch(e){throw new ApiError(400,e.message);}}
export function acknowledgeGovernment(db,id,receiptId){const a=governmentAccount(governmentDb(db),id);a.receipts=a.receipts.filter(r=>r.id>(Number(receiptId)||0));}
