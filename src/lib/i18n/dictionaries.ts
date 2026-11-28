export type Locale = 'ar' | 'en';

export function isValidLocale(val: string): val is Locale {
  return val === 'ar' || val === 'en';
}

export const dictionaries = {
  ar: {
    brand: 'RAGE TOURNAMENTS',
    demoBanner: 'نسخة معاينة قيد التجهيز (PREVIEW) — المواعيد والجوائز والنقاط تُعلن لاحقاً',
    nav: {
      home: 'الرئيسية',
      tournaments: 'البطولات',
      leaderboards: 'التصنيف',
      login: 'دخول',
      signup: 'حساب جديد',
      dashboard: 'لوحة اللاعب',
      logout: 'خروج',
      langSwitch: 'EN',
      menuOpen: 'فتح القائمة',
      menuClose: 'إغلاق القائمة'
    },
    hero: {
      eyebrow: 'CROSSFIRE • RAGE ESPORTS',
      title: 'نافس على مستوى احترافي. اصنع اسمك في بطولات RAGE.',
      subtitle: 'منصة بطولات مستقلة لـ CrossFire RAGE. تسجيل سريع، تنظيم دقيق للمراحل والمجموعات، ومتابعة لحظية للنتائج والترتيب.',
      ctaPrimary: 'استكشف البطولات',
      ctaSecondary: 'أنشئ حسابك الآن'
    },
    home: {
      featuredLabel: 'البطولة المميزة',
      openTournaments: 'البطولات القادمة والمفتوحة',
      openTournamentsSub: 'بطولات مجانية بنظام Solo و Team جاهزة للتسجيل.',
      viewAll: 'عرض جميع البطولات',
      upcomingMatches: 'المباريات القادمة',
      recentResults: 'أحدث النتائج المعتمدة',
      leaderboardPreview: 'صدارة الترتيب',
      viewLeaderboard: 'الترتيب الكامل'
    },
    filters: {
      searchPlaceholder: 'ابحث باسم البطولة أو النظام...',
      allStatuses: 'كل الحالات',
      allTypes: 'الكل (Solo & Team)',
      allFormats: 'كل الأنظمة',
      reset: 'إعادة تعيين',
      emptyTitle: 'لا توجد بطولات مطابقة',
      emptyDesc: 'جرب تغيير كلمات البحث أو إعادة تعيين الفلاتر لعرض جميع البطولات المتاحة.'
    },
    tournament: {
      solo: 'Solo',
      team: 'Team',
      free: 'تسجيل مجاني',
      open: 'التسجيل مفتوح',
      checkIn: 'مرحلة Check-in',
      live: 'جارية الآن',
      completed: 'منتهية',
      slots: 'المشاركين',
      unlimited: 'سعة مفتوحة',
      startsAt: 'الموعد',
      format: 'النظام',
      game: 'اللعبة',
      prize: 'الجائزة',
      viewDetails: 'التفاصيل',
      registerNow: 'سجل الآن',
      tabs: {
        overview: 'نظرة عامة',
        rules: 'القوانين',
        schedule: 'المراحل والمواعيد',
        participants: 'المشاركون',
        leaderboard: 'الترتيب'
      },
      registerModalTitle: 'تأكيد التسجيل في البطولة',
      ignLabel: 'اسمك داخل اللعبة (IGN)',
      ignHelper: 'يُطلب مرة واحدة لهذه اللعبة ويُحفظ لبطولاتك القادمة.',
      agreeRules: 'أوافق على جميع قوانين البطولة واللعب النظيف.',
      confirmSubmit: 'تأكيد التسجيل مجاناً',
      cancel: 'إلغاء',
      close: 'إغلاق',
      successTitle: 'تم تأكيد تسجيلك!',
      successCode: 'الرقم المرجعي للتسجيل'
    },
    auth: {
      loginTitle: 'تسجيل الدخول',
      loginSubtitle: 'ادخل بحسابك المستقل لمتابعة بطولاتك ومبارياتك.',
      signupTitle: 'إنشاء حساب جديد',
      signupSubtitle: 'خطوات بسيطة وسريعة — ستضيف الـ IGN فقط عند التسجيل في أول بطولة.',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      username: 'اسم المستخدم (Username)',
      loginBtn: 'دخول إلى المنصة',
      signupBtn: 'إنشاء الحساب والمتابعة',
      noAccount: 'ليس لديك حساب؟',
      hasAccount: 'لديك حساب بالفعل؟',
      steps: ['البيانات الأساسية', 'تأكيد الحساب', 'جاهز للمنافسة']
    },
    dashboard: {
      title: 'لوحة تحكم اللاعب',
      subtitle: 'ملخص مشاركاتك، مواعيد التحضير (Check-in)، ومبارياتك القادمة.',
      myTournaments: 'البطولات المسجل بها',
      myMatches: 'مبارياتي القادمة',
      recentResults: 'نتائجي الأخيرة',
      checkInStatus: 'حالة Check-in',
      checkInReady: 'مؤكد',
      checkInPending: 'بانتظار التحضير',
      rageLinkTitle: 'ربط حساب RAGE',
      rageLinkDesc: 'الربط الاختياري بحساب RAGE قيد التحقق التقني ولا يعطلك عن المشاركة.',
      browseAction: 'تصفح بطولات جديدة'
    },
    leaderboard: {
      rank: 'المركز',
      player: 'اللاعب / الفريق',
      code: 'المرجع',
      points: 'النقاط',
      kills: 'القتلات (Kills)',
      status: 'الحالة'
    }
  },
  en: {
    brand: 'RAGE TOURNAMENTS',
    demoBanner: 'PREVIEW BUILD — dates, prizes and points to be announced',
    nav: {
      home: 'Home',
      tournaments: 'Tournaments',
      leaderboards: 'Leaderboards',
      login: 'Log In',
      signup: 'Sign Up',
      dashboard: 'Dashboard',
      logout: 'Logout',
      langSwitch: 'عربي',
      menuOpen: 'Open menu',
      menuClose: 'Close menu'
    },
    hero: {
      eyebrow: 'CROSSFIRE • RAGE ESPORTS',
      title: 'Compete at Standard. Earn Your Place on RAGE.',
      subtitle: 'An independent esports tournament platform for CrossFire RAGE. Fast registration, structured multi-stage operations, and verified standings.',
      ctaPrimary: 'Browse Tournaments',
      ctaSecondary: 'Create Account'
    },
    home: {
      featuredLabel: 'Featured Tournament',
      openTournaments: 'Upcoming & Open Tournaments',
      openTournamentsSub: 'Free-entry Solo and Team competitions ready for registration.',
      viewAll: 'View All Tournaments',
      upcomingMatches: 'Upcoming Matches',
      recentResults: 'Recent Results',
      leaderboardPreview: 'Leaderboard Preview',
      viewLeaderboard: 'Full Standings'
    },
    filters: {
      searchPlaceholder: 'Search by tournament name or format...',
      allStatuses: 'All Statuses',
      allTypes: 'All Modes (Solo & Team)',
      allFormats: 'All Formats',
      reset: 'Reset Filters',
      emptyTitle: 'No matching tournaments',
      emptyDesc: 'Try adjusting your search query or resetting filters to view all available tournaments.'
    },
    tournament: {
      solo: 'Solo',
      team: 'Team',
      free: 'Free Entry',
      open: 'Registration Open',
      checkIn: 'Check-in Open',
      live: 'Live',
      completed: 'Completed',
      slots: 'Participants',
      unlimited: 'Open Capacity',
      startsAt: 'Starts',
      format: 'Format',
      game: 'Game',
      prize: 'Prize',
      viewDetails: 'Details',
      registerNow: 'Register Now',
      tabs: {
        overview: 'Overview',
        rules: 'Rules',
        schedule: 'Schedule & Stages',
        participants: 'Participants',
        leaderboard: 'Standings'
      },
      registerModalTitle: 'Confirm Tournament Registration',
      ignLabel: 'In-Game Name (IGN)',
      ignHelper: 'Asked once per game and saved for future registrations.',
      agreeRules: 'I accept the tournament rules and fair-play policy.',
      confirmSubmit: 'Confirm Free Registration',
      cancel: 'Cancel',
      close: 'Close',
      successTitle: 'Registration Confirmed!',
      successCode: 'Registration Reference ID'
    },
    auth: {
      loginTitle: 'Log In to RAGE Tournaments',
      loginSubtitle: 'Sign in with your independent account to manage tournaments and matches.',
      signupTitle: 'Create Your Account',
      signupSubtitle: 'Fast 3-step onboarding — you will only enter your IGN when joining your first tournament.',
      email: 'Email Address',
      password: 'Password',
      username: 'Username',
      loginBtn: 'Log In',
      signupBtn: 'Create Account & Continue',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?',
      steps: ['Account Details', 'Verify Access', 'Ready to Compete']
    },
    dashboard: {
      title: 'Player Dashboard',
      subtitle: 'Track your registered tournaments, check-in status, and upcoming matches.',
      myTournaments: 'Registered Tournaments',
      myMatches: 'Upcoming Matches',
      recentResults: 'Recent Results',
      checkInStatus: 'Check-in Status',
      checkInReady: 'Checked In',
      checkInPending: 'Check-in Pending',
      rageLinkTitle: 'RAGE Account Linking',
      rageLinkDesc: 'Optional RAGE account linking is pending technical verification and does not block participation.',
      browseAction: 'Browse Tournaments'
    },
    leaderboard: {
      rank: 'Rank',
      player: 'Player / Team',
      code: 'Ref',
      points: 'Points',
      kills: 'Kills',
      status: 'Status'
    }
  }
} as const;

type DeepString<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : T[K] extends readonly string[] ? readonly string[] : DeepString<T[K]>;
};

export type Dictionary = DeepString<(typeof dictionaries)['en']>;
