# Evidence osoby, která nahlásila škodu

## Cíl
U každé škody jasně evidovat a zobrazit řidiče, který ji nahlásil, a umožnit podle něj přehled filtrovat.

## Co se změní
- **Automatické přiřazení řidiče:** hlášení odeslané řidičem bude dál automaticky spojeno s jeho osobou; tento údaj se následně zobrazí v přehledech.
- **Ruční zadání škody:** administrátor nebo dispečer dostane ve formuláři pole **Nahlásil / řidič** s výběrem aktivních osob. Pole bude nepovinné pro případy, kdy oznamovatel není známý.
- **Hlavní přehled škod:** přibude sloupec **Nahlásil**, jméno se zahrne do vyhledávání a přidá se samostatný filtr podle řidiče.
- **Mobilní přehled a detail:** na kartě i detailu škody se zobrazí jméno oznamovatele; mobilní formulář administrátora/dispečera nabídne stejný výběr osoby.
- **Detail vozidla:** u každého záznamu škody se zobrazí, kdo ji nahlásil, a při ručním založení bude možné osobu vybrat.
- **Chybějící údaj:** starší nebo ručně vytvořené záznamy bez osoby se zobrazí jako **Neuvedeno**.

## Technické řešení
- Využije se existující vazba `incidents.driver_id → drivers.id`; nová tabulka ani nový sloupec nejsou potřeba.
- Načítání škod se rozšíří o jméno řidiče a ukládání z administrátorských formulářů o zvolenou osobu.
- Současná přístupová pravidla zůstanou zachována: zaměstnanci uvidí evidenci podle své role a řidič jen své hlášení.
- V databázi nyní nejsou žádné záznamy škod, takže není potřeba doplňovat historická data.

## Ověření
- Založit hlášení jako řidič a ověřit automaticky uvedené jméno.
- Založit hlášení jako administrátor/dispečer se zvolenou osobou i bez ní.
- Ověřit hledání a filtrování podle řidiče na počítači.
- Ověřit jméno oznamovatele v mobilním seznamu, mobilním detailu a detailu vozidla.
- Zkontrolovat načtení fotografií, změnu stavu a sestavení aplikace bez chyb.
