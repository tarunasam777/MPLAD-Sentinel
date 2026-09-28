"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Locale = "en" | "hi";

const STORAGE_KEY = "mplads-locale";

/* ------------------------------------------------------------------ */
/* Dictionary — every key must exist in BOTH locales (enforced by a    */
/* test in i18n.test.tsx, so a missing Hindi string can never ship).   */
/* ------------------------------------------------------------------ */

const en = {
  // Utility strip
  "util.gov": "Government of India · MoSPI · Data Informatics & Innovation Division",
  "util.nic": "NIC·secured",
  "util.live": "LIVE PIPELINE",
  "util.demo": "DEMO MODE",
  "util.prototype": "Prototype — Illustrative Data",
  "util.prototypeTip":
    "All case data, officials, vendors and amounts on this portal are synthetic and illustrative",
  "util.fontDecrease": "Decrease text size",
  "util.fontReset": "Reset text size",
  "util.fontIncrease": "Increase text size",
  "util.switchLang": "Switch language to Hindi",
  "util.switchLangShort": "हिंदी",

  // Branding bar
  "brand.name": "MPLADS Sentinel",
  "brand.division": "MoSPI · Data Informatics & Innovation Division",
  "brand.searchPlaceholder": "Search everything — works, MPs, cases, ledger…",
  "brand.searchAria": "Universal search across the whole program",
  "brand.search": "Search",
  "search.seeAll": "See all results",
  "search.noMatches": "No matches anywhere in the program.",
  "search.works": "Works",
  "search.cases": "Demo cases",
  "search.mps": "MPs",
  "search.officials": "Officials",
  "search.ledger": "Ledger blocks",
  "search.states": "States",
  "brand.selectRole": "Select Role",
  "brand.switchPortal": "Switch Portal / Role",
  "brand.resetDemo": "Reset demo",

  // Roles
  "role.mp": "Member of Parliament",
  "role.district": "District Magistrate",
  "role.state": "State Nodal Authority",
  "role.ministry": "MoSPI Ministry",
  "role.vendor": "Implementing Agency",
  "role.mp.desc": "Recommend works",
  "role.district.desc": "Sanction & inspect",
  "role.state.desc": "Nodal oversight",
  "role.ministry.desc": "Audit & policy",
  "role.vendor.desc": "Execute works",
  "role.signedInAs": "Signed in as",
  "role.scope": "· Telangana · FY 2025–26",
  "role.scopeClean": "Telangana • FY 2025–26",

  // Tabs
  "tab.public": "Public Citizen View",
  "tab.mp": "MP View",
  "tab.district": "District Authority",
  "tab.state": "State / Ministry",
  "tab.audit": "Audit & Ledger",
  "tab.methodology": "Methodology & ML",
  "tab.works": "Works Register",
  "nav.aria": "Portal sections",

  // Hero
  "hero.eyebrow": "Ministry of Statistics & Programme Implementation · DIID",
  "hero.title1": "Every MPLADS work.",
  "hero.title2": "Monitored, verified, auditable.",
  "hero.subtitle":
    "AI-assisted monitoring of sanctioned works — anomaly detection, critical-risk gates and a tamper-proof SHA-256 ledger, open to every citizen.",
  "hero.placeholder": "Search by MP name, constituency, work title or district…",
  "hero.searchAria": "Search MPLADS works",
  "hero.searchBtn": "Search works",
  "hero.try": "Try:",
  "hero.hint.duplicates": "duplicate road works",
  "hero.hint.kishan": "Kishan Reddy",
  "hero.hint.hyderabad": "Hyderabad",
  "hero.hint.water": "drinking water",

  // Landing stat strip
  "stat.mps": "Total MPs Covered",
  "stat.mps.detail": "official MoSPI allocation table",
  "stat.funds": "Total Funds Sanctioned",
  "stat.funds.detail": "allocated limits, all Lok Sabha MPs",
  "stat.works": "Active Works Monitored",
  "stat.flagRate": "Real-Time Anomaly Flag Rate",
  "stat.flagDetail": "works flagged",

  // Landing desks
  "desks.eyebrow": "One system · six desks",
  "desks.title": "Anomaly → gate → ledger, end to end",
  "desks.subtitle":
    "Sentinel scans every recommended work for duplicates, inflated costs, ghosts, rule violations, payment leaks and stalled projects. A Critical-Risk Gate enforces hard guidelines on top of a soft composite score; every human decision lands in a SHA-256 hash-chained ledger and every override is auto-flagged for audit. Pick a desk to explore.",
  "desks.enter": "Enter dashboard →",
  "desks.citizen": "Citizen Public View",
  "desks.citizen.org": "Transparency · भागीदारी",
  "desks.citizen.tag":
    "Every sanctioned work with its geo-pin, official status and the public audit chain — read-only.",
  "desks.citizen.open": "Open public explorer →",

  // Mode banner
  "mode.live": "Live Pipeline Feed",
  "mode.liveDetail": "Serving evaluated cases from the FastAPI detection → gate → ledger pipeline.",
  "mode.demo": "Demo Mode (Mock Data)",
  "mode.demoDetail": "Showing the built-in synthetic dataset — every figure is illustrative.",
  "mode.retry": "⟳ Connect live backend",

  // Footer
  "footer.disclaimer":
    "Designed for Ministry of Statistics and Programme Implementation (MoSPI) | Powered by NIC & MPLADS Sentinel AI | Data Encrypted with SHA-256",
  "footer.demoTag": "MPLADS Sentinel — hackathon demo",
  "footer.disclaimerToggle": "Disclaimer",
  "footer.rights":
    "© 2025–26 Ministry of Statistics & Programme Implementation. All data shown is synthetic for demonstration; no real schemes, officials or records are represented.",
};

type Dict = typeof en;

const hi: Dict = {
  // Utility strip
  "util.gov": "भारत सरकार · मोस्पी · डेटा सूचना एवं नवाचार प्रभाग",
  "util.nic": "एनआईसी·सुरक्षित",
  "util.live": "लाइव पाइपलाइन",
  "util.demo": "डेमो मोड",
  "util.prototype": "प्रोटोटाइप — उदाहरण हेतु आंकड़े",
  "util.prototypeTip":
    "इस पोर्टल का सारा केस डेटा, अधिकारी, वेंडर और राशियाँ केवल उदाहरण के लिए हैं",
  "util.fontDecrease": "अक्षर आकार घटाएँ",
  "util.fontReset": "अक्षर आकार पुनः सेट करें",
  "util.fontIncrease": "अक्षर आकार बढ़ाएँ",
  "util.switchLang": "भाषा अंग्रेज़ी में बदलें",
  "util.switchLangShort": "English",

  // Branding bar
  "brand.name": "एमपीलैड्स सेंटिनल",
  "brand.division": "मोस्पी · डेटा सूचना एवं नवाचार प्रभाग",
  "brand.searchPlaceholder": "सब कुछ खोजें — कार्य, सांसद, केस, बही…",
  "brand.searchAria": "पूरे कार्यक्रम की सार्वभौमिक खोज",
  "brand.search": "खोजें",
  "search.seeAll": "सभी परिणाम देखें",
  "search.noMatches": "पूरे कार्यक्रम में कोई मेल नहीं।",
  "search.works": "कार्य",
  "search.cases": "डेमो केस",
  "search.mps": "सांसद",
  "search.officials": "अधिकारी",
  "search.ledger": "बही खंड",
  "search.states": "राज्य",
  "brand.selectRole": "भूमिका चुनें",
  "brand.switchPortal": "पोर्टल / भूमिका बदलें",
  "brand.resetDemo": "डेमो रीसेट करें",

  // Roles
  "role.mp": "सांसद",
  "role.district": "ज़िला मजिस्ट्रेट",
  "role.state": "राज्य नोडल प्राधिकरण",
  "role.ministry": "मोस्पी मंत्रालय",
  "role.vendor": "कार्यान्वयन एजेंसी",
  "role.mp.desc": "कार्य अनुशंसित करें",
  "role.district.desc": "स्वीकृति व निरीक्षण",
  "role.state.desc": "नोडल निगरानी",
  "role.ministry.desc": "लेखा-परीक्षा व नीति",
  "role.vendor.desc": "कार्य निष्पादन",
  "role.signedInAs": "के रूप में प्रवेशित",
  "role.scope": "· तेलंगाना · वि.व. 2025–26",
  "role.scopeClean": "तेलंगाना • वि.व. 2025–26",

  // Tabs
  "tab.public": "सार्वजनिक नागरिक दृष्टिकोण",
  "tab.mp": "सांसद दृष्टिकोण",
  "tab.district": "ज़िला प्राधिकरण",
  "tab.state": "राज्य / मंत्रालय",
  "tab.audit": "लेखा-परीक्षा एवं लेजर",
  "tab.methodology": "पद्धति एवं एमएल",
  "tab.works": "कार्य पंजी",
  "nav.aria": "पोर्टल अनुभाग",

  // Hero
  "hero.eyebrow": "सांख्यिकी एवं कार्यक्रम क्रियान्वयन मंत्रालय · डीआईआईडी",
  "hero.title1": "प्रत्येक सांसद निधि कार्य।",
  "hero.title2": "अनुवीक्षित, सत्यापित, लेखा-परीक्षा योग्य।",
  "hero.subtitle":
    "स्वीकृत कार्यों की एआई-सहायता प्राप्त निगरानी — विसंगति पहचान, क्रिटिकल-रिस्क गेट और छेड़छाड़-रोधी SHA-256 लेजर, हर नागरिक के लिए खुला।",
  "hero.placeholder": "सांसद का नाम, संसदीय क्षेत्र, कार्य शीर्षक या ज़िला खोजें…",
  "hero.searchAria": "एमपीलैड्स कार्य खोजें",
  "hero.searchBtn": "कार्य खोजें",
  "hero.try": "आज़माएँ:",
  "hero.hint.duplicates": "डुप्लिकेट सड़क कार्य",
  "hero.hint.kishan": "किशन रेड्डी",
  "hero.hint.hyderabad": "हैदराबाद",
  "hero.hint.water": "पेयजल",

  // Landing stat strip
  "stat.mps": "कुल सांसद शामिल",
  "stat.mps.detail": "आधिकारिक मोस्पी आवंटन तालिका",
  "stat.funds": "कुल आवंटित निधि",
  "stat.funds.detail": "आवंटन सीमाएँ, सभी लोकसभा सांसद",
  "stat.works": "निगरानीत सक्रिय कार्य",
  "stat.flagRate": "रीयल-टाइम विसंगति फ्लैग दर",
  "stat.flagDetail": "कार्य फ्लैग किए गए",

  // Landing desks
  "desks.eyebrow": "एक तंत्र · छह डेस्क",
  "desks.title": "विसंगति → गेट → लेजर, शुरू से अंत तक",
  "desks.subtitle":
    "सेंटिनल हर अनुशंसित कार्य को डुप्लिकेट, बढ़ी लागत, भूत-कार्य, नियम उल्लंघन, भुगतान रिसाव और अटके प्रोजेक्ट के लिए स्कैन करता है। क्रिटिकल-रिस्क गेट सॉफ्ट स्कोर के ऊपर कठोर दिशानिर्देश लागू करता है; हर मानवीय निर्णय SHA-256 हैश-शृंखलित लेजर में दर्ज होता है और हर ओवरराइड ऑडिट हेतु स्वतः फ्लैग होता है। देखने के लिए कोई डेस्क चुनें।",
  "desks.enter": "डैशबोर्ड खोलें →",
  "desks.citizen": "नागरिक सार्वजनिक दृष्टिकोण",
  "desks.citizen.org": "पारदर्शिता · भागीदारी",
  "desks.citizen.tag":
    "भू-पिन, आधिकारिक स्थिति और सार्वजनिक ऑडिट शृंखला के साथ हर स्वीकृत कार्य — केवल-पठनीय।",
  "desks.citizen.open": "सार्वजनिक एक्सप्लोरर खोलें →",

  // Mode banner
  "mode.live": "लाइव पाइपलाइन फ़ीड",
  "mode.liveDetail": "FastAPI पहचान → गेट → लेजर पाइपलाइन से मूल्यांकित केस।",
  "mode.demo": "डेमो मोड (मॉक डेटा)",
  "mode.demoDetail": "अंतर्निहित सिंथेटिक डेटासेट दिखाया जा रहा है — हर आंकड़ा उदाहरण है।",
  "mode.retry": "⟳ लाइव बैकएंड से जोड़ें",

  // Footer
  "footer.disclaimer":
    "सांख्यिकी एवं कार्यक्रम क्रियान्वयन मंत्रालय (MoSPI) हेतु निर्मित | NIC एवं MPLADS Sentinel AI द्वारा संचालित | डेटा SHA-256 से एन्क्रिप्टेड",
  "footer.demoTag": "MPLADS सेंटिनल — हैकाथॉन डेमो",
  "footer.disclaimerToggle": "अस्वीकरण",
  "footer.rights":
    "© 2025–26 सांख्यिकी एवं कार्यक्रम क्रियान्वयन मंत्रालय। दिखाया गया सारा डेटा प्रदर्शन हेतु सिंथेटिक है; कोई वास्तविक योजना, अधिकारी या रिकॉर्ड दर्शाया नहीं गया है।",
};

export const DICTS: Record<Locale, Dict> = { en, hi };

type TFunc = (key: keyof Dict) => string;

interface LocaleCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  toggle: () => void;
  t: TFunc;
}

const Ctx = createContext<LocaleCtx | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  // Restore the persisted preference once, after mount. The effect (not a
  // lazy initializer) is deliberate: reading localStorage during render
  // would diverge from the SSR output and break hydration.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot post-hydration restore of an external preference; SSR-safe by design.
      if (saved === "hi" || saved === "en") setLocaleState(saved);
    } catch {
      /* storage unavailable — default en */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === "hi" ? "hi" : "en";
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggle = useCallback(() => {
    setLocaleState((cur) => {
      const next: Locale = cur === "en" ? "hi" : "en";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, []);

  const t = useCallback<TFunc>(
    (key) => DICTS[locale][key] ?? DICTS.en[key] ?? String(key),
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, toggle, t }), [locale, setLocale, toggle, t]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLocale(): LocaleCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLocale must be used within LocaleProvider");
  return v;
}
