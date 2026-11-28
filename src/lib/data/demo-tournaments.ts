export interface DemoTournament {
  slug: string;
  isDemo: true;
  featured?: boolean;
  titleAr: string;
  titleEn: string;
  gameAr: string;
  gameEn: string;
  competitionType: 'solo' | 'team';
  formatKey: 'ffa' | 'groups_knockout' | 'points';
  formatLabel: string;
  status: 'upcoming' | 'registration_open' | 'check_in' | 'live' | 'completed';
  registeredCount: number;
  maxParticipants: number; // 0 = unlimited
  startsAtIso: string;
  prizeConfirmedAr: string | null;
  prizeConfirmedEn: string | null;
  rulesAr: string[];
  rulesEn: string[];
  stages: Array<{
    order: number;
    nameAr: string;
    nameEn: string;
    format: string;
    qualifies: string;
  }>;
  sampleParticipants: Array<{
    code: string;
    ign: string;
    status: string;
    points: number;
    kills: number;
  }>;
}

export interface DemoMatchItem {
  id: string;
  isDemo: true;
  titleAr: string;
  titleEn: string;
  stageLabelAr: string;
  stageLabelEn: string;
  timeLabelAr: string;
  timeLabelEn: string;
  status: 'scheduled' | 'live' | 'completed';
  scoreLabel?: string;
}

export const DEMO_TOURNAMENTS: DemoTournament[] = [
  {
    slug: 'demo-rage-ffa-pilot',
    isDemo: true,
    featured: true,
    titleAr: '[تجريبي] بطولة RAGE FFA التجريبية — 32 لاعب',
    titleEn: '[DEMO] RAGE FFA Pilot Cup — 32 Players',
    gameAr: 'كروس فاير — RAGE',
    gameEn: 'CrossFire — RAGE',
    competitionType: 'solo',
    formatKey: 'ffa',
    formatLabel: 'FFA • Multi-Stage',
    status: 'registration_open',
    registeredCount: 24,
    maxParticipants: 32,
    startsAtIso: '2026-12-04T19:00:00Z',
    prizeConfirmedAr: null,
    prizeConfirmedEn: null,
    rulesAr: [
      'التسجيل مجاني بالكامل للاعبين الفرديين.',
      'ممنوع استخدام أي برامج غش أو ثغرات — الاستبعاد فوري.',
      'الالتزام بعمل Check-in قبل الموعد بـ 15 دقيقة.'
    ],
    rulesEn: [
      'Free entry for solo players.',
      'Zero tolerance for cheats, macros, or map exploits.',
      'Check-in required 15 minutes before stage start.'
    ],
    stages: [
      { order: 1, nameAr: 'التصفيات (4 مجموعات × 8)', nameEn: 'Qualifiers (4 Groups x 8)', format: 'FFA', qualifies: 'Top 2 / Group (8)' },
      { order: 2, nameAr: 'النهائي الكبير', nameEn: 'Grand Final', format: 'FFA', qualifies: '1 Winner' }
    ],
    sampleParticipants: [
      { code: 'RAGE-1041', ign: '[EG]ProSniper', status: 'checked_in', points: 42, kills: 29 },
      { code: 'RAGE-1042', ign: 'Viper_CF', status: 'confirmed', points: 38, kills: 24 },
      { code: 'RAGE-1043', ign: 'CairoGhost', status: 'checked_in', points: 35, kills: 21 },
      { code: 'RAGE-1044', ign: 'Shadow_EG', status: 'confirmed', points: 29, kills: 18 }
    ]
  },
  {
    slug: 'demo-rage-team-5v5',
    isDemo: true,
    titleAr: '[تجريبي] تحدي الفرق 5v5 — Search & Destroy',
    titleEn: '[DEMO] RAGE 5v5 Team Clash — Search & Destroy',
    gameAr: 'كروس فاير — RAGE',
    gameEn: 'CrossFire — RAGE',
    competitionType: 'team',
    formatKey: 'groups_knockout',
    formatLabel: 'Groups + Knockout',
    status: 'registration_open',
    registeredCount: 11,
    maxParticipants: 16,
    startsAtIso: '2026-12-05T20:00:00Z',
    prizeConfirmedAr: null,
    prizeConfirmedEn: null,
    rulesAr: [
      'الفريق يتكون من 5 لاعبين أساسيين (يشمل القائد) + بديل واحد اختياري.',
      'قائد الفريق مسؤول عن تأكيد الحضور ورفع النتيجة.'
    ],
    rulesEn: [
      'Roster requires 5 starters (including Team Leader) + up to 1 optional substitute.',
      'Team Leader handles check-in and match result submission.'
    ],
    stages: [
      { order: 1, nameAr: 'دور المجموعات', nameEn: 'Group Stage', format: 'Groups (Round-Robin)', qualifies: 'Top 2 / Group' },
      { order: 2, nameAr: 'خروج المغلوب', nameEn: 'Knockout Finals', format: 'Single Elimination', qualifies: 'Champion' }
    ],
    sampleParticipants: [
      { code: 'RAGE-2011', ign: 'Team_Pharaohs', status: 'confirmed', points: 9, kills: 64 },
      { code: 'RAGE-2012', ign: 'Delta_Squad', status: 'confirmed', points: 6, kills: 51 }
    ]
  },
  {
    slug: 'demo-rage-open-ffa',
    isDemo: true,
    titleAr: '[تجريبي] بطولة النقاط المفتوحة — تسجيل مفتوح',
    titleEn: '[DEMO] Open Points Ladder — Unlimited Slots',
    gameAr: 'كروس فاير — RAGE',
    gameEn: 'CrossFire — RAGE',
    competitionType: 'solo',
    formatKey: 'points',
    formatLabel: 'Points Leaderboard',
    status: 'check_in',
    registeredCount: 58,
    maxParticipants: 0,
    startsAtIso: '2026-12-06T18:00:00Z',
    prizeConfirmedAr: null,
    prizeConfirmedEn: null,
    rulesAr: [
      'سعة التسجيل مفتوحة لجميع اللاعبين.',
      'يتم توزيع الغرف تلقائياً بعد إغلاق Check-in.'
    ],
    rulesEn: [
      'Open capacity for all eligible players.',
      'Rooms are balanced and assigned automatically after check-in closes.'
    ],
    stages: [
      { order: 1, nameAr: 'سلم النقاط', nameEn: 'Points Stage', format: 'Points', qualifies: 'Top 16' }
    ],
    sampleParticipants: [
      { code: 'RAGE-3011', ign: 'NileHawk', status: 'checked_in', points: 54, kills: 40 }
    ]
  }
];

export const DEMO_UPCOMING_MATCHES: DemoMatchItem[] = [
  {
    id: 'm-1',
    isDemo: true,
    titleAr: '[تجريبي] تصفيات FFA — غرفة 1',
    titleEn: '[DEMO] FFA Qualifiers — Room 1',
    stageLabelAr: 'المرحلة 1 • FFA',
    stageLabelEn: 'Stage 1 • FFA',
    timeLabelAr: 'الجمعة 21:00 بتوقيت القاهرة',
    timeLabelEn: 'Fri 21:00 EET',
    status: 'scheduled'
  },
  {
    id: 'm-2',
    isDemo: true,
    titleAr: '[تجريبي] Team_Pharaohs ضد Delta_Squad',
    titleEn: '[DEMO] Team_Pharaohs vs Delta_Squad',
    stageLabelAr: 'المجموعة A • 5v5',
    stageLabelEn: 'Group A • 5v5',
    timeLabelAr: 'السبت 22:00 بتوقيت القاهرة',
    timeLabelEn: 'Sat 22:00 EET',
    status: 'live'
  }
];

export const DEMO_RECENT_RESULTS: DemoMatchItem[] = [
  {
    id: 'r-1',
    isDemo: true,
    titleAr: '[تجريبي] جولة FFA التجريبية — غرفة 2',
    titleEn: '[DEMO] FFA Scrim Round — Room 2',
    stageLabelAr: 'المرحلة 1 • غرفة 2',
    stageLabelEn: 'Stage 1 • Room 2',
    timeLabelAr: 'منذ ساعتين',
    timeLabelEn: '2h ago',
    status: 'completed',
    scoreLabel: '#1 [EG]ProSniper (42 pts)'
  },
  {
    id: 'r-2',
    isDemo: true,
    titleAr: '[تجريبي] Team_Pharaohs ضد CairoVipers',
    titleEn: '[DEMO] Team_Pharaohs vs CairoVipers',
    stageLabelAr: 'مباراة ودية • 5v5',
    stageLabelEn: 'Scrim Match • 5v5',
    timeLabelAr: 'أمس',
    timeLabelEn: 'Yesterday',
    status: 'completed',
    scoreLabel: '13 - 9'
  }
];
