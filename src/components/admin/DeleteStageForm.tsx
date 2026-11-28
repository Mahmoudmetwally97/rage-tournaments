'use client';

export function DeleteStageForm({ action, hidden, ar, name, rooms, matches, results }: { action: (f: FormData) => void | Promise<void>; hidden: Record<string, string>; ar: boolean; name: string; rooms: number; matches: number; results: number }) {
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const base = ar
      ? `حذف المرحلة "${name}"؟ هيتمسح ${rooms} غرفة و ${matches} ماتش.`
      : `Delete stage "${name}"? This removes ${rooms} room(s) and ${matches} match(es).`;
    if (!window.confirm(base)) { e.preventDefault(); return; }
    if (results > 0) {
      const warn = ar
        ? `تحذير: المرحلة فيها ${results} نتيجة مسجلة وهتتمسح نهائيا وتتغير الترتيبات. متأكد؟`
        : `Warning: this stage has ${results} saved result row(s). They will be permanently deleted and standings will change. Are you sure?`;
      if (!window.confirm(warn)) { e.preventDefault(); return; }
      (form.elements.namedItem('confirm_results') as HTMLInputElement).value = '1';
    }
  }
  return (
    <form action={action} onSubmit={onSubmit} className="space-y-2">
      {Object.entries(hidden).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <input type="hidden" name="confirm_results" value="" />
      <button type="submit" className="clip-btn border border-[#f87171]/60 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.1em] text-[#f87171] hover:bg-[#f87171]/10">
        {ar ? 'حذف المرحلة' : 'Delete stage'}
      </button>
      {results > 0 && <p className="text-[11px] text-[#f87171]">{ar ? `فيها ${results} نتيجة. هيطلب تأكيد مرتين.` : `Has ${results} result rows. You will be asked to confirm twice.`}</p>}
    </form>
  );
}
