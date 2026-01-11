# Spelmekanik-redesign: Fånga paket & undvik snöbollar

## Sammanfattning

Ändra spelet från "undvik hinder" till "fånga paket och undvik snöbollar" med ett nivåsystem där man samlar 10 paket per nivå för att avancera genom 5 nivåer.

## Spelmekanik

### Tre objekttyper

1. **Flygande paket** (röda/gröna julklappar)
   - Flyger i överkroppshöjd (~100-130px från marken)
   - Stå upp för att fånga
   - Ger +1 paket

2. **Flygande snöbollar**
   - Flyger i huvudhöjd (~140-170px från marken)
   - Ducka för att undvika

3. **Rullande snöbollar**
   - Rullar längs marken
   - Hoppa för att undvika

### Kollisionslogik

| Objekt | Spelarens tillstånd | Resultat |
|--------|---------------------|----------|
| Paket | Stående/hoppande | Fånga (+1 paket) |
| Paket | Duckande | Missa (passerar förbi) |
| Flygande snöboll | Stående/hoppande | Träff (tappar paket) |
| Flygande snöboll | Duckande | Undvek |
| Rullande snöboll | Stående/duckande | Träff (tappar paket) |
| Rullande snöboll | Hoppande | Undvek |

### Träff-konsekvens

- Träffas av snöboll → tappar X paket (där X = nuvarande nivånummer)
- Minimum 0 paket (kan inte bli negativt)
- Inget "game over" - spelet fortsätter

## Nivåsystem

- **5 nivåer totalt**
- **10 paket per nivå** för att avancera
- **Hastighetsökning**: +20% per nivå
- **Spawn-balans**: ~60% paket, ~20% flygande snöbollar, ~20% rullande snöbollar

### Spelflöde

```
Menu → Kalibrering → Countdown → Nivå 1 → Nivå 2 → ... → Nivå 5 → Julhälsning
                                                                       ↓
                                              ←──── Spela igen ────────┘
```

## UI och visuell feedback

### HUD

- **Överst vänster**: "Nivå X" (1-5)
- **Överst mitten**: Paket-räknare "3/10" med paket-ikon
- **Överst höger**: Bästa nivå (highscore)

### Visuell feedback

- **Fångat paket**: Grön blink/partikel-effekt
- **Träffad av snöboll**: Röd blink, "-X" text flyger upp
- **Nivå klar**: "Nivå X klar!" text, 1-2 sek paus
- **Missat paket**: Ingen speciell effekt

### Vinst-skärm (efter nivå 5)

Snygg julhälsning med vektorgrafik (stjärnor, snöflingor):

```
GOD JUL!

önskar
Folke, Ellis, Alex & Anna

[Spela igen]
```

## Grafik

Allt i vektorgrafik (canvas paths):

- **Paket**: Fyrkantiga lådor med band/rosett (röd eller grön)
- **Snöbollar**: Vita cirklar med skugga och highlights
- **HUD-text**: Snygg julstil
- **Vinst-skärm**: Dekorativ text med snöflingor/stjärnor

## Implementation

### Filer som ändras

1. `src/core/types.ts` - Nya typer
2. `src/game/GameEngine.ts` - Ny spellogik
3. `src/game/ObstacleManager.ts` → `ObjectManager.ts` - Ny spawn-logik
4. `src/game/CollisionDetector.ts` - Ny kollisionshantering
5. `src/rendering/GameRenderer.ts` - Nya renderingsfunktioner
6. `src/ui/GameCanvas.tsx` - Uppdaterad renderingsloop
7. `src/ui/WinScreen.tsx` - Ny julhälsnings-komponent

### Nya typer

```typescript
type GameObjectType = 'package' | 'flyingSnowball' | 'rollingSnowball';

interface GameObject {
  x: number;
  y: number;
  type: GameObjectType;
  width: number;
  height: number;
  collected?: boolean; // för paket
}

interface LevelState {
  level: number;           // 1-5
  packagesCollected: number;
  packagesRequired: number; // alltid 10
  speedMultiplier: number;  // 1.0, 1.2, 1.4, 1.6, 1.8
}
```

### Kollisionsresultat

```typescript
type CollisionResult =
  | { type: 'catch'; object: GameObject }
  | { type: 'hit'; object: GameObject; packagesLost: number }
  | { type: 'miss' }
  | { type: 'dodge' }
  | null;
```
