# Vrátit přímé focení účtenky při tankování

## Co řidič uvidí
- Ve formuláři Tankování budou u účtenky dvě tlačítka:
  - **Vyfotit**: rovnou spustí fotoaparát.
  - **Z galerie**: otevře galerii, pokud je fotka už v telefonu.
- Stejná dvě tlačítka budou i u hlášení škody.

## Ochrana proti zmizení formuláře
Původní potíž vznikala tak, že telefon po vyfocení obnovil aplikaci a formulář zmizel. Aby se to už nestalo:
- Fotoaparát pořídí vždy jen jednu fotku. Další fotky přidá řidič dalším stisknutím tlačítka „Vyfotit“.
- Rozepsané údaje (auto, čas, místo, litry, cena, tachometr) se průběžně ukládají v telefonu. Kdyby se aplikace přesto obnovila, formulář se znovu otevře s vyplněnými údaji.
- Uložené údaje se smažou po kliknutí na „Uložit tankování“ nebo „Zrušit“.
- Fotky se dál před odesláním zmenší.

## Technické detaily
- V `FuelReceiptDialog.tsx` a `QuickIncidentDialog.tsx` budou dva skryté vstupy: `accept="image/*" capture="environment"` bez `multiple` a druhý bez `capture`, aby šlo vybírat z galerie.
- Koncept se bude ukládat do `sessionStorage` (`fuel-draft`). `MobileLayout` po načtení zkontroluje, jestli koncept existuje, a případně dialog otevře znovu.
