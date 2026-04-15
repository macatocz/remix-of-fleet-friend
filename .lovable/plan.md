

# Vylepšení správy dokumentů vozidla

## 1. Oprava: české znaky v názvech souborů (kritický bug)
Supabase Storage nepodporuje diakritiku v klíčích. Řešení: sanitizovat `filePath` — nahradit diakritiku ASCII ekvivalenty a nepovolené znaky podtržítkem. Původní název souboru zůstane uložený v DB sloupci `name`.

Přidáme helper funkci `sanitizeFileName(name)` která odstraní diakritiku (`normalize("NFD").replace(...)`) a nahradí mezery/speciální znaky.

## 2. Potvrzovací dialog před smazáním
Přidat `AlertDialog` s textem „Opravdu chcete smazat dokument {název}?" a tlačítky Zrušit/Smazat.

## 3. Filtrování dokumentů podle kategorie
Přidat volitelný filtr nad seznamem — select „Všechny kategorie" + jednotlivé kategorie. Filtruje se na klientu.

## 4. Oprava toast logiky
Počítat úspěšné/neúspěšné uploady. Toast zobrazí „Nahráno X z Y souborů" nebo jen „Dokumenty nahrány" pokud vše OK.

## 5. Drag & drop zona
Přidat vizuální drop zónu pro jednodušší nahrávání souborů přetažením.

## Rozsah
- 1 soubor: `VehicleDocuments.tsx`
- 0 DB migrací

