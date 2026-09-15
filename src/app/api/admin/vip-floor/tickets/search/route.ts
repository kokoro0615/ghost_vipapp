import {copyJson,requireAdminOperation} from '@/lib/server/ghostAdminProxy';
import {assertOperatorMutation} from '@/lib/server/httpBoundary';
import {readBoundedCommandBody,requireVipTicketCapability,ticketOperationsFetch,ticketOperationsJson,ticketOperationsContractFailure,ticketOperationsUpstreamFailure} from '@/lib/server/ticketOperationsProxy';
import {parseTicketSearchRequest,parseTicketSearchResponse} from '@/lib/ticketSearchContract';
export const runtime='nodejs';
export async function POST(request:Request){
 const boundary=assertOperatorMutation(request);if(!boundary.ok)return ticketOperationsJson({ok:false,error:boundary.error},boundary.status);
 const auth=await requireAdminOperation(request,{ownerOnly:true});if(!auth.ok)return ticketOperationsJson({ok:false,error:'owner_session_required'},auth.response.status);
 const gate=requireVipTicketCapability('manager');if(!gate.ok)return gate.response;
 let query;try{query=parseTicketSearchRequest(await readBoundedCommandBody(request));}catch{return ticketOperationsJson({ok:false,error:'invalid_request'},400);}
 const response=await ticketOperationsFetch('/api/admin/v2/tickets/search',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(query)},auth.token);
 const payload=await copyJson(response);if(!response.ok)return ticketOperationsUpstreamFailure(payload,response.status);
 try{return ticketOperationsJson(parseTicketSearchResponse(payload));}catch{return ticketOperationsContractFailure();}
}
