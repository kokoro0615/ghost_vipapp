import assert from 'node:assert/strict';

export async function assertReservationAlerts({ page, board, origin, capture }) {
  page.setDefaultTimeout(15000);
  const date=board.businessDay.businessDate;
  const nextDate=new Date(Date.parse(`${date}T12:00:00Z`)+86400000).toISOString().slice(0,10);
  const start=`${date}T22:00:00+09:00`, end=`${nextDate}T00:00:00+09:00`;
  const base={...board.reservations[0],id:'ab000000-0000-4000-8000-000000000001',lifecycleStatus:'confirmed',serviceStatus:'expected',
    customer:{displayLabel:'デモ通知予約',masked:false},sourceChannel:'phone',scheduledStartAt:start,scheduledEndAt:end,expectedReleaseAt:end,completedAt:null};
  let alertBoard={...structuredClone(board),boardRevision:1000,reservations:[base]};
  let invalid=false, reads=0;
  await page.route('**/api/admin/vip-floor?**',async route=>{
    if(new URL(route.request().url()).searchParams.get('purpose')!=='alerts') {
      if(new URL(route.request().url()).searchParams.get('date')===nextDate) return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({...board,businessDay:{...board.businessDay,businessDate:nextDate}})});
      return route.fallback();
    }
    reads++;
    assert.equal(new URL(route.request().url()).searchParams.get('date'),date);
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(invalid?{ok:false}:alertBoard)});
  });
  await page.addInitScript(now=>{window.__alertQaNow=now;Date.now=()=>window.__alertQaNow;},Date.parse(`${date}T21:44:59+09:00`));
  const firstRead=page.waitForResponse(r=>r.url().includes("purpose=alerts"));
  await page.goto(`${origin}/?view=list&date=${date}`,{waitUntil:'domcontentloaded'});
  await page.locator('main[data-state=healthy],main[data-state=empty]').waitFor();
  await firstRead;
  const popup=()=>page.getByRole('dialog',{name:'予約時刻のお知らせ',exact:true});
  assert.equal(await popup().count(),0);
  await page.evaluate(now=>{window.__alertQaNow=now;document.dispatchEvent(new Event('visibilitychange'));},Date.parse(`${date}T21:45:00+09:00`));
  await popup().waitFor();
  await popup().getByText('来店前確認',{exact:true}).waitFor();
  await capture(page,'reservation-alert-arrival');
  await popup().getByRole('button',{name:'確認しました',exact:true}).click();
  await popup().waitFor({state:'detached'});
  await page.getByRole('button',{name:'Floor',exact:true}).first().click();
  assert.equal(await popup().count(),0);
  await page.reload({waitUntil:'domcontentloaded'});
  await page.locator('main[data-state=healthy],main[data-state=empty]').waitFor();
  // The init clock is reset on reload; advance it to the same due window.
  await page.evaluate(now=>{window.__alertQaNow=now;document.dispatchEvent(new Event('visibilitychange'));},Date.parse(`${date}T21:46:00+09:00`));
  await refreshMonitor();
  assert.equal(await popup().count(),0,'acknowledged event must survive reload');

  // A shifted arrival gets a new key and must not destroy a partially typed form.
  alertBoard={...alertBoard,boardRevision:1001,reservations:[{...base,scheduledStartAt:`${date}T22:15:00+09:00`}]};
  await page.getByRole('button',{name:/新規オペレーション/u}).click();
  const intake=page.getByRole('dialog',{name:'新規予約',exact:true});
  await intake.getByRole('tab',{name:'事前予約',exact:true}).click();
  await intake.getByLabel('予約名（必須）',{exact:true}).fill('デモ入力途中');
  await intake.getByLabel('人数（必須）',{exact:true}).fill('3');
  await intake.getByLabel('現場共有メモ',{exact:true}).fill('デモ保持するメモ');
  await page.evaluate(now=>{window.__alertQaNow=now;},Date.parse(`${date}T22:00:00+09:00`));
  await refreshMonitor();
  await popup().waitFor();
  await capture(page,'reservation-alert-over-input');
  await popup().getByRole('button',{name:'確認しました',exact:true}).click();
  assert.equal(await intake.getByLabel('予約名（必須）',{exact:true}).inputValue(),'デモ入力途中');
  assert.equal(await intake.getByLabel('人数（必須）',{exact:true}).inputValue(),'3');
  assert.equal(await intake.getByLabel('現場共有メモ',{exact:true}).inputValue(),'デモ保持するメモ');
  assert.ok(await intake.getByLabel('現場共有メモ',{exact:true}).evaluate(el=>document.activeElement===el));
  await intake.getByRole('button',{name:'新規作成を閉じる',exact:true}).click();

  // Show another business date while the independent monitor watches today.
  await page.goto(`${origin}/?view=chart&date=${nextDate}`,{waitUntil:'domcontentloaded'});
  await page.locator('main[data-state=healthy],main[data-state=empty]').waitFor();
  alertBoard={...alertBoard,boardRevision:1002,reservations:[{...base,serviceStatus:'seated'}]};
  await page.evaluate(now=>{window.__alertQaNow=now;},Date.parse(`${date}T23:45:00+09:00`));
  await refreshMonitor();
  await popup().getByText('延長確認',{exact:true}).waitFor();
  assert.equal(new URL(page.url()).searchParams.get('date'),nextDate);
  await capture(page,'reservation-alert-extension');
  await popup().getByRole('button',{name:'確認しました',exact:true}).click();
  alertBoard={...alertBoard,boardRevision:1003,reservations:[{...base,serviceStatus:'seated',expectedReleaseAt:`${nextDate}T01:00:00+09:00`}]};
  await refreshMonitor();
  assert.equal(await popup().count(),0,'extending cancels the old deadline');
  alertBoard={...alertBoard,boardRevision:1004,reservations:[alertBoard.reservations[0],{...base,id:'ab000000-0000-4000-8000-000000000002',scheduledStartAt:`${nextDate}T01:00:00+09:00`}]};
  await page.evaluate(now=>{window.__alertQaNow=now;},Date.parse(`${nextDate}T00:45:00+09:00`));
  await refreshMonitor();
  await popup().waitFor();
  assert.equal(await popup().getByRole('listitem').count(),2);
  // A busy night must keep acknowledgement reachable while the list scrolls.
  alertBoard={...alertBoard,reservations:Array.from({length:12},(_,index)=>({...alertBoard.reservations[index%2],id:`ab000000-0000-4000-8000-${String(index+1).padStart(12,'0')}`}))};
  await refreshMonitor();
  await popup().getByRole('listitem').nth(11).waitFor();
  assert.equal(await popup().getByRole('listitem').count(),12);
  const list=popup().getByRole('list',{name:'時刻確認が必要な予約',exact:true});
  await list.focus();
  await page.keyboard.press('End');
  await page.waitForFunction(()=>Array.from(document.querySelectorAll('dialog[open] ul')).some(el=>el.scrollTop>0));
  assert.ok(await list.evaluate(el=>el.scrollTop>0),'keyboard must reach the end of a long alert list');
  await popup().getByRole('button',{name:'確認しました（12件）',exact:true}).scrollIntoViewIfNeeded();
  await capture(page,'reservation-alert-multiple');
  // A cancellation/service outcome disappears on the next successful read.
  alertBoard={...alertBoard,boardRevision:1005,reservations:alertBoard.reservations.map(r=>({...r,lifecycleStatus:'cancelled'}))};
  await refreshMonitor();
  await popup().waitFor({state:'detached'});
  invalid=true;
  await refreshMonitor();
  await page.getByText('当日の時刻通知を更新できません。接続を確認してください。',{exact:true}).waitFor();
  await capture(page,'reservation-alert-monitor-error');
  assert.equal(await popup().count(),0);
  assert.ok(reads>=6);

  async function refreshMonitor(){
    await page.evaluate(async()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:true});
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    });
    const nextRead=page.waitForResponse(r=>r.url().includes('purpose=alerts'));
    await page.evaluate(()=>{
      Object.defineProperty(document,'hidden',{configurable:true,value:false});
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await nextRead;
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  }
}
