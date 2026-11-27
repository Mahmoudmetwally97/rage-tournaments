export type Locale = 'ar' | 'en';

export function isValidLocale(val: string): val is Locale {
  return val === 'ar' || val === 'en';
}

export const dictionaries = {
  ar: {
    brand: 'RAGE TOURNAMENTS',
    demoBanner: 'بيانات تجريبية للمعاينة (DEMO DATA) — سيتم ربطها بقاعدة بيانات Supabase الحية عند التفعيل',
    nav: {
      home: 'الرئيسية',
      tournaments: 'البطولات',
      leaderboards: 'التصنيف',
      login: 'دخول',
      signup: 'حساب جديد',
      dashboard: 'لوحة اللاعب',
      langSwitch: 'EN'
    },
    hero: {
      eyebrow: 'منصة بطولات RAGE الرسمية',
      title: 'نافس على RAGE. اصنع اسمك في البطولات.',
      subtitle: 'سجل في بطولات CrossFire الفردية والجماعية مجاناً، تابع جدولك والمجموعات، وارفع نتائجك من مكان واحد.',
      ctaPrimary: 'تصفح البطولات المفتوحة',
      ctaSecondary: 'إنشاء حساب في 30 ثانية'
    },
    home: {
      openTournaments: 'البطولات المتاحة للتسجيل',
      viewAll: 'عرض كل البطولات',
      upcomingMatches: 'المباريات القادمة',
      recentResults: 'أحدث النتائج',
      leaderboardPreview: 'أبرز المتصدرين'
    },
    tournament: {
      solo: 'فردي (Solo)',
      team: 'فرق (Team)',
      free: 'مجاني',
      open: 'التسجيل مفتوح',
      checkIn: 'مرحلة التحضير (Check-in)',
      live: 'مباشر الآن',
      completed: 'منتهية',
      slots: 'المشاركين',
      unlimited: 'مفتوح',
      startsAt: 'الموعد',
      prize: 'الجائزة',
      viewDetails: 'التفاصيل',
      registerNow: 'سجل الآن',
      tabs: {
        overview: 'نظرة عامة',
        rules: 'القوانين',
        schedule: 'المواعيد والمراحل',
        participants: 'المشاركون',
        leaderboard: 'الترتيب'
      },
      registerModalTitle: 'تأكيد التسجيل في البطولة',
      ignLabel: 'اسمك داخل اللعبة (IGN)',
      ignHelper: 'يُطلب مرة واحدة فقط لهذه اللعبة ويُحفظ لبطولاتك القادمة.',
      agreeRules: 'أوافق على جميع قوانين البطولة واللعب النظيف.',
      confirmSubmit: 'تأكيد التسجيل مجاناً',
      cancel: 'إلغاء',
      successTitle: 'تم تسجيلك بنجاح!',
      successCode: 'كود التسجيل الخاص بك'
    },
    auth: {
      loginTitle: 'تسجيل الدخول',
      signupTitle: 'إنشاء حساب جديد (3 خطوات)',
      signupSubtitle: 'أنشئ حسابك بسرعة بدون أسئلة إضافية — ستضيف الـ IGN فقط عند أول تسجيل في بطولة.',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      username: 'اسم المستخدم (Username)',
      loginBtn: 'دخول إلى المنصة',
      signupBtn: 'إنشاء الحساب والمتابعة',
      noAccount: 'ليس لديك حساب؟',
      hasAccount: 'لديك حساب بالفعل؟'
    },
    dashboard: {
      title: 'لوحة تحكم اللاعب',
      subtitle: 'تابع بطولاتك، مواعيد التحضير (Check-in)، ومبارياتك القادمة.',
      myTournaments: 'بطولاتي المسجل فيها',
      myMatches: 'مبارياتي القادمة',
      rageLinkTitle: 'ربط حساب RAGE',
      rageLinkDesc: 'الربط الاختياري بحساب RAGE قيد المراجعة التقنية ولن يعطلك عن المشاركة.'
    }
  },
  en: {
    brand: 'RAGE TOURNAMENTS',
    demoBanner: 'DEMO PREVIEW DATA — Will connect to live Supabase PostgreSQL once provisioned',
    nav: {
      home: 'Home',
      tournaments: 'Tournaments',
      leaderboards: 'Leaderboards',
      login: 'Log In',
      signup: 'Sign Up',
      dashboard: 'Dashboard',
      langSwitch: 'عربي'
    },
    hero: {
      eyebrow: 'OFFICIAL RAGE ESPORTS PLATFORM',
      title: 'Compete on RAGE. Earn Your Place.',
      subtitle: 'Join free CrossFire Solo and Team tournaments, track brackets and rooms, and submit verified match results from one unified platform.',
      ctaPrimary: 'Browse Open Tournaments',
      ctaSecondary: 'Create Account in 30s'
    },
    home: {
      openTournaments: 'Open Registration Tournaments',
      viewAll: 'View All Tournaments',
      upcomingMatches: 'Upcoming Matches',
      recentResults: 'Recent Results',
      leaderboardPreview: 'Leaderboard Preview'
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
      unlimited: 'Open',
      startsAt: 'Starts',
      prize: 'Prize',
      viewDetails: 'View Details',
      registerNow: 'Register Now',
      tabs: {
        overview: 'Overview',
        rules: 'Rules',
        schedule: 'Schedule & Stages',
        participants: 'Participants',
        leaderboard: 'Leaderboard'
      },
      registerModalTitle: 'Confirm Tournament Registration',
      ignLabel: 'In-Game Name (IGN)',
      ignHelper: 'Asked once per game and saved for your future registrations.',
      agreeRules: 'I accept the tournament rules and fair-play policy.',
      confirmSubmit: 'Confirm Free Registration',
      cancel: 'Cancel',
      successTitle: 'Registration Confirmed!',
      successCode: 'Your Registration Code'
    },
    auth: {
      loginTitle: 'Log In to RAGE Tournaments',
      signupTitle: 'Create Your Account (3 Steps)',
      signupSubtitle: 'Fast onboarding with zero extra friction — you will only enter your IGN when joining your first tournament.',
      email: 'Email Address',
      password: 'Password',
      username: 'Username',
      loginBtn: 'Log In',
      signupBtn: 'Create Account & Continue',
      noAccount: "Don't have an account?",
      hasAccount: 'Already have an account?'
    },
    dashboard: {
      title: 'Player Dashboard',
      subtitle: 'Track your active tournaments, check-in windows, and upcoming matches.',
      myTournaments: 'My Tournaments',
      myMatches: 'Upcoming Matches',
      rageLinkTitle: 'RAGE Account Linking',
      rageLinkDesc: 'Optional RAGE server account linking is pending technical verification and does not block participation.'
    }
  }
} as const;

type DeepString<T> = {
  readonly [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type Dictionary = DeepString<(typeof dictionaries)['en']>;
