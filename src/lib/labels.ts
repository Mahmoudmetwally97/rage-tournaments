const L: Record<string, [string, string]> = {
  draft: ['مسودة', 'Draft'],
  published: ['منشورة', 'Published'],
  registration_open: ['التسجيل مفتوح', 'Registration open'],
  registration_closed: ['التسجيل مقفول', 'Registration closed'],
  check_in: ['التشيك إن مفتوح', 'Check-in open'],
  ready: ['جاهزة', 'Ready'],
  live: ['مباشر الآن', 'Live'],
  completed: ['انتهت', 'Completed'],
  archived: ['مؤرشفة', 'Archived'],
  cancelled: ['ملغية', 'Cancelled'],
  suspended: ['موقوفة', 'Suspended'],
  pending: ['معلق', 'Pending'],
  confirmed: ['مقبول', 'Accepted'],
  checked_in: ['عمل تشيك إن', 'Checked in'],
  waitlisted: ['انتظار', 'Waitlisted'],
  rejected: ['مرفوض', 'Rejected'],
  disqualified: ['محظور', 'Banned'],
  scheduled: ['مجدول', 'Scheduled'],
  pending_review: ['قيد المراجعة', 'In review'],
  disputed: ['متنازع عليه', 'Disputed'],
  approved: ['موافق عليه', 'Approved'],
  paid: ['تم الدفع', 'Paid'],
  open: ['مفتوحة', 'Open'],
  resolved: ['تم الحل', 'Resolved'],
  all: ['الكل', 'All'],
  cash: ['كاش', 'Cash'],
  coins: ['كوينز', 'Coins'],
  voucher: ['قسيمة', 'Voucher'],
  other: ['أخرى', 'Other']
};
export function label(locale: string, key: string): string {
  const v = L[key];
  return v ? (locale === 'ar' ? v[0] : v[1]) : key;
}
