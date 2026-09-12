"use client";
import {useState} from 'react';
import {BusinessDateField} from '../shell/BusinessDateField';
import {parseTicketSearchResponse,type TicketSearchRequest,type TicketSearchResponse} from '@/lib/ticketSearchContract';
import styles from './TicketOperations.module.css';
export function TicketOrderSearch({mode,onSelect}:{mode:'production'|'demo';onSelect(code:string):void}){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const [from,setFrom]=useState(today);const [through,setThrough]=useState(today);const [email,setEmail]=useState('');
 const [reason,setReason]=useState<TicketSearchRequest['reason']>('order_code_unknown');const [result,setResult]=useState<TicketSearchResponse|null>(null);
 const [submitted,setSubmitted]=useState<TicketSearchRequest|null>(null);const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function search(query:TicketSearchRequest){
  if(busy||mode==='demo')return;setBusy(true);setError('');
  try{const response=await fetch('/api/admin/vip-floor/tickets/search',{method:'POST',headers:{'content-type':'application/json'},credentials:'same-origin',cache:'no-store',body:JSON.stringify(query)});if(!response.ok)throw new Error(String(response.status));setResult(parseTicketSearchResponse(await response.json()));setSubmitted(query);}
  catch{setError('検索できませんでした。期間・入力・権限を確認し、混雑時は1分後に再試行してください。');setResult(null);}
  finally{setBusy(false);}
 }
 return <details className={styles.orderSearch}>
  <summary>メールと営業日で注文を探す</summary>
  {mode==='demo'?<p>この検索は本番のOwner操作で利用できます。</p>:<form onSubmit={event=>{event.preventDefault();void search({email,from,through,reason,cursor:null});}}>
   <label>購入時のメールアドレス<input type="email" required maxLength={254} autoComplete="off" value={email} onChange={e=>setEmail(e.target.value)} /></label>
   <BusinessDateField value={from} onChange={setFrom} label="検索開始の営業日" variant="field" />
   <BusinessDateField value={through} onChange={setThrough} label="検索終了の営業日" variant="field" />
   <label>確認理由<select value={reason} onChange={e=>setReason(e.target.value as TicketSearchRequest['reason'])}><option value="order_code_unknown">注文番号不明</option><option value="email_not_received">メール未着</option><option value="reconciliation">営業終了の突合</option></select></label>
   <button type="submit" disabled={busy}>{busy?'検索中…':'全注文から検索'}</button>
  </form>}
  <p role="status">{error|| (result?`${result.orders.length}件表示${result.hasMore?'・続きがあります':'・この条件の最終ページです'}`:'')}</p>
  {result?<>
   <p>候補の一致だけでは本人確認は完了しません。注文の支払・入場状態を開き、救済手順に沿って確認してください。</p>
   <ol className={styles.queueList}>{result.orders.map(order=><li key={order.publicCode}><button type="button" onClick={()=>onSelect(order.publicCode)}><strong className="tabular-nums">{order.publicCode}</strong><span>{order.eventDate} · {order.eventTitle}</span><span className="tabular-nums">{order.quantity}枚 · {{pending:'支払確認中',paid:'発券中',fulfilled:'発券済み',expired:'期限終了',cancelled:'取消',refunded:'返金済み'}[order.status]}</span></button></li>)}</ol>
   {result.hasMore&&submitted?<button type="button" disabled={busy} onClick={()=>void search({...submitted,cursor:result.nextCursor})}>次の25件</button>:null}
  </>:null}
 </details>;
}
