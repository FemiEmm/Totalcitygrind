import {transaction,read} from '../store.js';
import {ApiError} from '../auth.js';
import {createClub,clubAction} from './catalogue.js';
export function clubRequest(input){try{if(input.op==='status')return clubAction(read('club')||createClub(),input.playerId,{op:'status'});return transaction(db=>clubAction(db.club ||= createClub(),input.playerId,{...input,pose:input.serverPose,name:db.profiles[input.playerId].display_name}));}catch(e){throw new ApiError(400,e.message);}}
