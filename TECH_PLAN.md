# Tech plan : ennemi sinusoïdal à spread shot

## Objectif
Ajouter un second type d'ennemi qui :
- descend l'écran en suivant une sinusoïde ;
- tire plusieurs balles à la fois, réparties en éventail (spread shot) ;
- est entièrement piloté par un fichier JSON (spawn, mouvement, tir) ;
- se distingue visuellement de l'ovni rouge.

## Données : `public/assets/Data/sineEnemy.json`
Même pattern que `playerShips.json` : le fichier est chargé dans `HomeScene.preload` avec `this.load.json`, lu via le
cache JSON et typé en TypeScript (`src/gameData/SineEnemyData.ts`).

| Clé | Rôle |
|---|---|
| `texture`, `tint`, `scale` | apparence : frame de l'atlas, teinte (`"#rrggbb"`), taille |
| `health` | points de vie |
| `spawn.delay` | temps entre deux tentatives de spawn (ms) |
| `spawn.maxActive` | nombre maximum de ces ennemis à l'écran |
| `movement.verticalSpeed` | vitesse de descente (px/ms) |
| `movement.amplitude` | écart horizontal maximum autour du point de spawn (px) |
| `movement.period` | durée d'une oscillation complète (ms) |
| `spreadShot.delay` | temps entre deux salves (ms) |
| `spreadShot.bulletCount` | nombre de balles par salve |
| `spreadShot.spreadAngle` | ouverture de l'éventail (degrés, 360 = cercle complet) |
| `spreadShot.bullet` | taille, couleur, vitesse et dégâts des balles |

Le JSON n'accepte pas les littéraux hexadécimaux : les couleurs y sont des chaînes `"#rrggbb"`, converties en nombre
avec `Phaser.Display.Color.HexStringToColor`. Le type `BulletJsonData` réutilise `BulletData` en changeant seulement
le type de `color`.

La clé de cache est une constante nommée : `GameConstants.DataKeys.SINE_ENEMY`.

## Architecture (Entity / Components)

### Nouveau composant `SineMovement` (`src/components/SineMovement.ts`)
- `x = originX + sin(2π · temps écoulé / période) · amplitude`
- `reset(originX)` remet le temps écoulé à zéro : indispensable avec le pooling, sinon un ennemi réutilisé
  reprendrait sa vague en cours de route.
- La descente verticale réutilise le composant `Movement` existant (`moveVertically`).

### Composant `Weapon` : nouvelle méthode `shootSpread`
- Le code de tir est extrait dans `shootAtAngle(source, angle)` ; `shoot` l'appelle avec l'angle de la source,
  donc le comportement du joueur et de l'ovni rouge ne change pas.
- `shootSpread(source, bulletCount, spreadAngle)` répartit les balles de `-spread/2` à `+spread/2` autour de la
  direction de la source.
- Pas entre deux balles : `spread / (n - 1)`, pour que les deux balles extrêmes soient pile sur les bords.
  Exception à 360° ou plus : `spread / n`, sinon la première et la dernière balle seraient superposées.
- Une seule balle : tir droit devant (évite la division par zéro).

### Nouvelle entité `SineEnemy` (`src/entities/SineEnemy.ts`)
- Hérite de `Entity`, avec les composants `Health`, `Movement`, `SineMovement`, `Weapon`.
- Pooling : `enable` remet la vie au maximum sans émettre d'événement (`heal(max, false)`), relance le timer de tir,
  réapplique la teinte et réinitialise la sinusoïde ; `disable` coupe le body et met le timer en pause.
- Feedback de dégâts identique à l'ovni rouge : flash blanc puis retour à la teinte de l'ennemi, ralentissement
  pendant le flash (`HIT_SLOWDOWN_FACTOR`).
- Constantes nommées : `FORWARD_ANGLE`, `HIT_FLASH_COLOR`, `HIT_FLASH_DURATION`, `HIT_SLOWDOWN_FACTOR`.

### `EntityManager`
- Nouveau groupe pooled `_sineEnemies`, qui partage le pool de balles ennemies existant.
- Nouveau timer de spawn piloté par `spawn.delay` et `spawn.maxActive`.
- Le point de spawn est tiré au hasard, assez loin des bords pour que toute la vague reste à l'écran
  (`SineEnemy.horizontalReach` = amplitude + demi-largeur). Si la vague est plus large que l'écran, l'ennemi
  apparaît au centre.
- Les collisions utilisent un tableau `[ovnis rouges, ennemis sinusoïdaux]` : pas de duplication des callbacks.

### UI
Aucune modification : la logique ne dépend pas de l'UI. Le score augmente déjà via le registry à chaque touche.

## Différence visuelle
Sprite `ufoRed` teinté en cyan (`setTint`), 30 % plus grand, avec des balles cyan. Aucune modification de l'atlas.

## Fichiers touchés
- Ajoutés : `public/assets/Data/sineEnemy.json`, `src/gameData/SineEnemyData.ts`,
  `src/components/SineMovement.ts`, `src/entities/SineEnemy.ts`
- Modifiés : `src/GameConstants.ts`, `src/scenes/HomeScene.ts`, `src/components/Weapon.ts`,
  `src/managers/EntityManager.ts`

## Vérifications
- `npx tsc --noEmit` et `npm run build-nolog` passent.
- Playtest manuel (`npm run dev-nolog`) :
  1. L'ennemi cyan apparaît au bout de 5 s, au maximum 2 en même temps, et ne sort jamais de l'écran sur les côtés.
  2. Il ondule de gauche à droite en descendant.
  3. Toutes les 2,5 s, il tire 5 balles cyan sur 60°.
  4. Il encaisse 3 tirs (flash blanc à chaque touche) puis explose ; le score augmente.
  5. En éditant le JSON (par exemple `bulletCount: 60`, `spreadAngle: 360`), le tir passe en cercle complet
     sans toucher au code ; idem pour l'amplitude, la période et le délai de spawn.
  6. Après un game over et un restart (touche R), les ennemis réutilisés repartent avec la vie pleine et une
     vague neuve.
