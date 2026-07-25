"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LogOut, RefreshCw, ShieldCheck } from "lucide-react";

type Reservation = { id: string; publicCode: string; status: string; guestLabel?: string | null; guestCount: number; operatorNote?: string | null; slot: { startAt: string; endAt: string } | null; seats: Array<{ publicResourceCode: string | null; name: string | null }>; checkedInAt: string | null; seatExtendedUntilAt: string | null };
type Seat = { publicResourceCode: string | null; name: string; capacityMin: number; capacityMax: number; occupancy: string; reservation: Reservation | null };
type Board = { businessDate: string | null; reservations: Reservation[]; seats: Seat[]; totals: { reservations: number; availableSeats: number; occupiedSeats: number }; operations?: { adminMutationEnabled: boolean } };
type Session = { ok: boolean; role?: string; displayName?: string | null };

const appStyle = { minHeight: "100dvh", overflow: "auto", background: "#100d16", color: "#f7f2ea", fontFamily: "ui-sans-serif, system-ui, sans-serif" } as const;
const buttonStyle = { minHeight: 44, border: "1px solid #a9874c", background: "#1b1422", color: "#f7f2ea", padding: "0 12px", cursor: "pointer" } as const;

export default function RealVipFloorApp() {
  const [session, setSession] = useState<Session | null>(null);
  const [board, setBoard] = useState<Board | null>(null);
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("認証を確認しています");
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [assignmentByReservation, setAssignmentByReservation] = useState<Record<string, string>>({});

  const loadBoard = useCallback(async () => {
    setBusy(true);
    const response = await fetch("/api/admin/vip-floor", { cache: "no-store" });
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) { setSession({ ok: false }); setBoard(null); setMessage("PINでログインしてください"); }
    else if (!response.ok) setMessage("実予約を読み込めません。再読込してください。");
    else { setBoard(payload as Board); setMessage("GHOST予約台帳と同期済み"); }
    setBusy(false);
  }, []);

  useEffect(() => { void (async () => { const response = await fetch("/api/admin/session"); const payload = await response.json().catch(() => ({})); if (response.ok) { setSession(payload as Session); await loadBoard(); } else { setSession({ ok: false }); setMessage("PINでログインしてください"); } })(); }, [loadBoard]);

  async function login(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("PINを確認しています");
    const response = await fetch("/api/admin/session/pin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(response.status === 429 ? "試行回数の上限です。時間をおいてください。" : "PINを確認してください。"); setBusy(false); return; }
    setSession(payload as Session); setPin(""); await loadBoard();
  }

  async function command(kind: "check_in" | "seat_extension" | "assignment", reservation: Reservation) {
    setBusy(true);
    const selectedTable = assignmentByReservation[reservation.id];
    const payload = kind === "seat_extension"
      ? { extendMinutes: 30, reason: "vip_floor_operator" }
      : kind === "assignment"
        ? { tableIds: selectedTable ? [selectedTable] : [], reason: "vip_floor_operator" }
        : { reason: "vip_floor_operator" };
    if (kind === "assignment" && !selectedTable) { setMessage("割り当てる卓を選択してください。"); setBusy(false); return; }
    const response = await fetch("/api/admin/vip-floor/commands", { method: "POST", headers: { "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify({ kind, reservationId: reservation.id, payload }) });
    if (response.ok) { setMessage(kind === "check_in" ? "チェックインを保存しました" : kind === "assignment" ? "卓割当を保存しました" : "30分延長を保存しました"); await loadBoard(); }
    else setMessage(response.status === 401 ? "セッションが終了しました。再ログインしてください。" : "保存できませんでした。最新状態を確認してください。");
    setBusy(false);
  }

  async function logout() { await fetch("/api/admin/session", { method: "DELETE" }); setSession({ ok: false }); setBoard(null); setMessage("ログアウトしました"); }

  const visibleReservations = useMemo(() => (board?.reservations ?? []).filter((item) => `${item.publicCode} ${item.guestLabel ?? ""} ${item.seats.map((seat) => seat.name).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [board, query]);

  if (!session?.ok) return (
    <main style={{ ...appStyle, display: "grid", placeItems: "center", padding: 20 }}>
      <form onSubmit={login} style={{ width: "min(400px, 100%)", border: "1px solid #a9874c", padding: 28, background: "#18121e" }}>
        <ShieldCheck size={28} color="#d5b36c" />
        <p style={{ color: "#d5b36c", letterSpacing: ".12em", fontSize: 12 }}>GHOST OSAKA · VIP FLOOR</p>
        <h1 style={{ margin: "8px 0 10px" }}>現場オペレーション</h1>
        <p style={{ color: "#bdb4bc", fontSize: 14 }}>{message}</p>
        <label style={{ display: "grid", gap: 8, marginTop: 20 }}>
          スタッフPIN
          <input value={pin} onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 8))} inputMode="numeric" autoComplete="one-time-code" minLength={4} maxLength={8} style={{ minHeight: 48, background: "#0f0b13", border: "1px solid #765e39", color: "white", padding: "0 12px", fontSize: 22, letterSpacing: ".25em" }} />
        </label>
        <button disabled={busy || pin.length < 4} style={{ ...buttonStyle, width: "100%", marginTop: 18, background: "#b99558", color: "#130d16", fontWeight: 800 }}>{busy ? "確認中…" : "ログイン"}</button>
      </form>
    </main>
  );

  return <main style={appStyle}><header style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center", padding: "14px 18px", borderBottom: "1px solid #574333", background: "#18121e" }}><div style={{ marginRight: "auto" }}><strong style={{ letterSpacing: ".08em" }}>GHOST OSAKA</strong><div style={{ fontSize: 12, color: "#d5b36c" }}>VIP FLOOR · 実予約台帳</div></div><span style={{ fontSize: 12, color: "#c8bdc4" }}>{session.displayName ?? session.role ?? "staff"}</span><button style={buttonStyle} onClick={() => void loadBoard()} disabled={busy}><RefreshCw size={16} /> 再読込</button><button style={buttonStyle} onClick={() => void logout()}><LogOut size={16} /> ログアウト</button></header><section style={{ padding: "16px 18px", display: "grid", gap: 12 }}><div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}><strong>{board?.businessDate ?? "営業日未設定"}</strong><span style={{ color: "#8fe0b7", fontSize: 13 }}><CheckCircle2 size={14} /> {message}</span><span style={{ color: "#c8bdc4", fontSize: 13 }}>予約 {board?.totals.reservations ?? 0} / 稼働卓 {board?.totals.occupiedSeats ?? 0} / 空席 {board?.totals.availableSeats ?? 0}</span></div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="予約番号 / ゲスト / 卓を検索" style={{ minHeight: 44, maxWidth: 420, background: "#100d16", border: "1px solid #574333", color: "white", padding: "0 12px" }} /><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>{visibleReservations.map((reservation) => <article key={reservation.id} style={{ border: "1px solid #4d3a32", padding: 14, background: "#17121b" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong>{reservation.publicCode}</strong><span style={{ color: "#d5b36c", fontSize: 12 }}>{reservation.status}</span></div><div style={{ marginTop: 8, fontSize: 15 }}>{reservation.guestLabel ?? "ゲスト名非表示"} · {reservation.guestCount}名</div><div style={{ marginTop: 5, color: "#c8bdc4", fontSize: 13 }}>{reservation.slot ? new Intl.DateTimeFormat("ja-JP", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tokyo" }).format(new Date(reservation.slot.startAt)) : "時刻未設定"} · {reservation.seats.map((seat) => seat.name ?? seat.publicResourceCode).filter(Boolean).join(" / ") || "未割当"}</div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}><button style={buttonStyle} disabled={busy || !board?.operations?.adminMutationEnabled || Boolean(reservation.checkedInAt)} onClick={() => void command("check_in", reservation)}>チェックイン</button><button style={buttonStyle} disabled={busy || !board?.operations?.adminMutationEnabled || !reservation.checkedInAt} onClick={() => void command("seat_extension", reservation)}>30分延長</button></div><div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}><select aria-label={`${reservation.publicCode}の割当卓`} value={assignmentByReservation[reservation.id] ?? ""} onChange={(event) => setAssignmentByReservation((current) => ({ ...current, [reservation.id]: event.target.value }))} style={{ minHeight: 44, flex: "1 1 130px", background: "#100d16", border: "1px solid #574333", color: "white", padding: "0 8px" }}><option value="">卓を選択</option>{(board?.seats ?? []).filter((seat) => seat.publicResourceCode).map((seat) => <option value={seat.publicResourceCode ?? ""} key={seat.publicResourceCode ?? seat.name}>{seat.name} ({seat.occupancy})</option>)}</select><button style={buttonStyle} disabled={busy || !board?.operations?.adminMutationEnabled} onClick={() => void command("assignment", reservation)}>卓割当</button></div></article>)}</div></section></main>;
}
