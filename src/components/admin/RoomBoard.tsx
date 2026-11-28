'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { movePlayer } from '@/app/[locale]/admin/actions';

export type BoardRoom = { id: string; name: string; locked: boolean; players: { id: string; ign: string }[] };

export function RoomBoard({ rooms, roomSize, slug, locale }: { rooms: BoardRoom[]; roomSize: number; slug: string; locale: string }) {
  const ar = locale === 'ar';
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ id: string; ign: string; x: number; y: number } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; from: string } | null>(null);

  function move(regId: string, toId: string) {
    setMsg(null);
    start(async () => {
      const err = await movePlayer(regId, toId, slug);
      if (err) setMsg(err);
      else router.refresh();
    });
  }

  function roomAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y)?.closest('[data-room-id]') as HTMLElement | null;
    return el?.dataset.roomId ?? null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-[#a4a6aa]">
        {ar ? 'اسحب اللاعب من غرفة لغرفة (أو استخدم القائمة). النقل ممنوع بعد وجود نتائج.' : 'Drag a player to another room (or use the menu). Moving is blocked once results exist.'}
      </p>
      {msg && <div role="alert" className="border border-[#EF4444]/40 bg-[#EF4444]/15 p-3 text-xs font-bold text-[#FCA5A5]">{msg}</div>}
      <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${pending ? 'opacity-70' : ''}`}>
        {rooms.map((r) => (
          <div
            key={r.id}
            data-room-id={r.id}
            data-testid={`room-${r.name}`}
            className={`clip-card min-h-[120px] border p-3 transition-colors ${over === r.id && !r.locked ? 'border-[#e5ed43] bg-[#e5ed43]/10' : 'border-[#2b2d30] bg-[#101113]'}`}
          >
            <div className="mb-2 flex items-center justify-between text-xs font-extrabold">
              <span className="text-[#f4f4ed]">{r.name}</span>
              <span className="ltr-isolate text-[#e5ed43]">{r.players.length}/{roomSize}{r.locked ? ' 🔒' : ''}</span>
            </div>
            <div className="space-y-1.5">
              {r.players.map((p) => (
                <div
                  key={p.id}
                  data-player={p.ign}
                  onPointerDown={(e) => {
                    if (r.locked || (e.target as HTMLElement).tagName === 'SELECT') return;
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                    dragRef.current = { id: p.id, from: r.id };
                    setDrag({ id: p.id, ign: p.ign, x: e.clientX, y: e.clientY });
                  }}
                  onPointerMove={(e) => {
                    if (dragRef.current?.id !== p.id) return;
                    setDrag({ id: p.id, ign: p.ign, x: e.clientX, y: e.clientY });
                    setOver(roomAt(e.clientX, e.clientY));
                  }}
                  onPointerUp={(e) => {
                    const d = dragRef.current;
                    dragRef.current = null;
                    setDrag(null);
                    setOver(null);
                    if (!d || d.id !== p.id) return;
                    const to = roomAt(e.clientX, e.clientY);
                    if (to && to !== d.from) move(p.id, to);
                  }}
                  onPointerCancel={() => { dragRef.current = null; setDrag(null); setOver(null); }}
                  style={{ touchAction: r.locked ? 'auto' : 'none' }}
                  className={`clip-chip flex items-center gap-2 border border-[#2b2d30] bg-[#1b1d20] px-2 py-1.5 text-sm font-bold text-[#f4f4ed] ${r.locked ? '' : 'cursor-grab active:cursor-grabbing'} ${drag?.id === p.id ? 'opacity-40' : ''}`}
                >
                  {!r.locked && <span aria-hidden className="text-[#6f7276]">⋮⋮</span>}
                  <span className="min-w-0 flex-1 truncate">{p.ign}</span>
                  {!r.locked && (
                    <select
                      aria-label={ar ? 'نقل إلى' : 'Move to'}
                      value=""
                      onChange={(e) => e.target.value && move(p.id, e.target.value)}
                      className="max-w-[90px] border border-[#2b2d30] bg-[#0d0e10] px-1 py-0.5 text-[11px] text-[#a4a6aa]"
                    >
                      <option value="">{ar ? 'نقل' : 'Move'}</option>
                      {rooms.filter((x) => x.id !== r.id && !x.locked).map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))}
              {r.players.length === 0 && <p className="text-xs text-[#6f7276]">{ar ? 'فاضية' : 'Empty'}</p>}
            </div>
          </div>
        ))}
      </div>
      {drag && (
        <div style={{ position: 'fixed', left: drag.x + 8, top: drag.y + 8, pointerEvents: 'none', zIndex: 60 }} className="clip-chip bg-[#e5ed43] px-3 py-1.5 text-sm font-extrabold text-[#121408]">
          {drag.ign}
        </div>
      )}
    </div>
  );
}
