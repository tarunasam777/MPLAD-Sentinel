import { describe, expect, it } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DICTS, LocaleProvider, useLocale } from "./i18n";

function LangProbe() {
  const { locale, t, toggle } = useLocale();
  return (
    <div>
      <span data-testid="locale">{locale}</span>
      <span data-testid="hero">{t("hero.title2")}</span>
      <span data-testid="audit-tab">{t("tab.audit")}</span>
      <span data-testid="public-tab">{t("tab.public")}</span>
      <button onClick={toggle}>toggle</button>
    </div>
  );
}

describe("i18n dictionary integrity", () => {
  it("defines every key in BOTH locales (no missing Hindi strings)", () => {
    const enKeys = Object.keys(DICTS.en).sort();
    const hiKeys = Object.keys(DICTS.hi).sort();
    expect(hiKeys).toEqual(enKeys);
  });

  it("never ships an empty translation", () => {
    for (const [key, value] of Object.entries(DICTS.en)) {
      expect(String(value).length, `en:${key}`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(DICTS.hi)) {
      expect(String(value).length, `hi:${key}`).toBeGreaterThan(0);
    }
  });

  it("contains the PS-required hero and tab translations", () => {
    // “Every MPLADS work. Monitored, verified, auditable.” in Hindi
    expect(DICTS.hi["hero.title2"]).toBe("अनुवीक्षित, सत्यापित, लेखा-परीक्षा योग्य।");
    expect(DICTS.hi["hero.title1"]).toContain("सांसद निधि कार्य");
    // “Public Citizen View” / “Audit & Ledger”
    expect(DICTS.hi["tab.public"]).toBe("सार्वजनिक नागरिक दृष्टिकोण");
    expect(DICTS.hi["tab.audit"]).toBe("लेखा-परीक्षा एवं लेजर");
  });
});

describe("useLocale / LocaleProvider", () => {
  it("defaults to English and toggles globally without raw keys", async () => {
    const user = userEvent.setup();
    render(
      <LocaleProvider>
        <LangProbe />
      </LocaleProvider>
    );
    expect(screen.getByTestId("locale").textContent).toBe("en");
    expect(screen.getByTestId("hero").textContent).toBe("Monitored, verified, auditable.");
    expect(screen.getByTestId("audit-tab").textContent).toBe("Audit & Ledger");

    await user.click(screen.getByText("toggle"));
    expect(screen.getByTestId("locale").textContent).toBe("hi");
    expect(screen.getByTestId("hero").textContent).toBe("अनुवीक्षित, सत्यापित, लेखा-परीक्षा योग्य।");
    expect(screen.getByTestId("audit-tab").textContent).toBe("लेखा-परीक्षा एवं लेजर");
    expect(screen.getByTestId("public-tab").textContent).toBe("सार्वजनिक नागरिक दृष्टिकोण");

    // Toggle back
    await act(async () => {
      screen.getByText("toggle").click();
    });
    expect(screen.getByTestId("locale").textContent).toBe("en");
  });
});
