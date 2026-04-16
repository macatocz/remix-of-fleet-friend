

# Úprava karty „Dokumenty a kontroly" + přejmenování záložky

## Změny

### 1. Pole „Tankovací karty" → Ano/Ne select (VehicleDetail.tsx)

V `DOC_FIELDS` (řádek 87) změnit pole `tankovaci_karty` z textového na select s volbami ANO/NE:

```typescript
{ key: "tankovaci_karty", label: "Tankovací karty", type: "select",
  options: [{ value: "ANO", label: "ANO" }, { value: "NE", label: "NE" }] },
```

### 2. Přejmenování záložky „Tankování" → „Tankovací karty" (VehicleDetail.tsx)

Na řádku 547 změnit text záložky:

```
<CreditCard className="mr-2 h-4 w-4" />Tankovací karty
```

## Rozsah
- 1 soubor: `src/pages/VehicleDetail.tsx`
- 2 řádky k úpravě
- 0 DB migrací

