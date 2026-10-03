import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as businessTime from '../../src/lib/vipBusinessTime.ts';
const read = file => fs.readFile(new URL('../../'+file,import.meta.url),'utf8');
function compile(source, deps={}) {
  const exports={};const context={URL,exports,module:{exports},require:name=>{if(!(name in deps))throw Error(name);return deps[name];}};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
  return exports;
}
const deps={
  '@/lib/ghostOperatingHours':compile(await read('src/lib/ghostOperatingHours.ts'), {'./vipBusinessTime.ts':businessTime}),
  '@/lib/server/ownerCapacityOverride':compile(await read('src/lib/server/ownerCapacityOverride.ts')),
  '@/generated/vipManagerRuntimeContract':compile(await read('src/generated/vipManagerRuntimeContract.ts')),
  'next/server':{}, '@/lib/server/ghostAdminProxy':{}, '@/lib/server/httpBoundary':{},
};
const {parseReservationCreate,parseReservationUpdate}=compile(await read('src/app/api/admin/vip-floor/operations/route.ts')+'\nexport {parseReservationCreate,parseReservationUpdate};',deps);
const id='10000000-0000-4000-8000-000000000001';
const valid={eventDayId:id,offeringId:id,reservationId:id,expectedVersion:1,guestLabel:'  デモ予約  ',
 scheduledStartAt:'2026-09-28T22:00:00+09:00',scheduledEndAt:'2026-09-29T00:00:00+09:00',guestCount:2,
 tableIds:[id],expectedTableVersions:[{tableId:id,expectedVersion:1}],displayName:null,phone:null,email:null,
 languageCode:'ja',operatorNote:null,sourceChannel:'phone',serviceStatus:'expected',bookingStaffMemberId:null,notificationPreference:'none'};
for(const [name,parse] of [['create',parseReservationCreate],['update',parseReservationUpdate]]) {
 test(`${name} requires a real reservation name, integer party and valid operating times at the API boundary`,()=>{
   const result=parse(valid);assert.equal(result.ok,true);assert.equal((result.value.command??result.value).guestLabel,'デモ予約');
   for(const guestLabel of [undefined,null,'','  ','　', 'x'.repeat(81),123])assert.equal(parse({...valid,guestLabel}).ok,false,`name ${String(guestLabel)}`);
   for(const guestCount of [undefined,null,'2',0,-1,1.5,100])assert.equal(parse({...valid,guestCount}).ok,false,`count ${String(guestCount)}`);
   for(const scheduledStartAt of ['',null,undefined,'bad','2026-09-28T21:00:00+09:00','2026-09-28T22:01:00+09:00',valid.scheduledEndAt])assert.equal(parse({...valid,scheduledStartAt}).ok,false);
   assert.equal(parse({...valid,scheduledEndAt:''}).ok,false);
   assert.equal(parse({...valid,scheduledEndAt:'2026-09-29T05:15:00+09:00'}).ok,false);
   assert.equal(parse({...valid,expectedTableVersions:[]}).ok,false);
 });
}

test('a closed/missing monitored night is a normal response; other errors keep their status',async()=>{
  const contract=compile(await read('src/lib/vipFloorV2Contract.ts'),deps);
  const dayState=compile(await read('src/lib/vipFloorDayState.ts'),{'./vipFloorV2Contract':contract});
  let status=404,body={ok:false,dayState:{state:'missing',businessDate:'2026-09-28'}};
  const {GET}=compile(await read('src/app/api/admin/vip-floor/route.ts'),{
    '@/lib/ghostOperatingHours':deps['@/lib/ghostOperatingHours'],
    '@/lib/vipFloorDayState':dayState,'@/lib/vipFloorV2Contract':contract,
    '@/lib/server/httpBoundary':{assertOperatorMutation:()=>({ok:true})},
    '@/lib/server/ghostAdminProxy':{readAdminToken:()=> 'synthetic',ghostAdminFetch:async()=>({status,ok:status<400}),copyJson:async()=>body},
    'next/server':{NextResponse:{json:(payload,options)=>({payload,...options})}},
  });
  // GET only needs Request.url; no production transport is available in the VM.
  assert.equal((await GET({url:'https://example.invalid/api?date=2026-09-28&purpose=alerts'})).status,200);
  assert.equal((await GET({url:'https://example.invalid/api?date=2026-09-28'})).status,404);
  status=401;
  assert.equal((await GET({url:'https://example.invalid/api?date=2026-09-28&purpose=alerts'})).status,401);
  status=404;body={ok:false,dayState:{state:'missing',businessDate:'2026-09-29'}};
  assert.equal((await GET({url:'https://example.invalid/api?date=2026-09-28&purpose=alerts'})).status,404);
});
