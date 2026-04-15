# Quadrilogie des Angles

> Test psychotechnique d'orientation spatiale recreant l'exercice du logiciel
> EPLtest. Disponible sur `/exercises/quadrilogie-angles` (route directe) et
> `/exercices/quadrilogie-angles` (route SEO).
>
> Composant: `src/components/exercises/QuadrilogieAnglesTest.tsx`

---

## Principe general

Pour chaque question, l'utilisateur doit donner un **angle multiple de 10°,
entre 0° et 360°** (0 et 360 acceptes tous les deux comme equivalents).

L'angle est toujours mesure :

> **Du segment "origine" vers le segment "arrivee", dans le sens positif
> defini par l'horloge affichee en haut de l'ecran.**

Le test comporte **40 questions** (10 par niveau), avec un **chronometre
global de 8 minutes** par defaut (modifiable dans les parametres). Les
reponses sont **modifiables** tant que le chrono n'est pas termine et que
l'utilisateur n'a pas quitte la derniere question.

## Horloge variable (haut-centre)

L'horloge est un cercle avec les chiffres `12, 3, 6, 9` autour. Pour chaque
question, on tire **2 parametres** :

| Parametre | Valeurs possibles | Effet |
|---|---|---|
| `clockUpAngle` | `0, 90, 180, 270` (angle math en degres) | Position visuelle du **12** : droite, haut, gauche, bas |
| `isReversed` | `true / false` | Sens positif anti-horaire (true) ou horaire (false) sur l'ecran |

Concretement, 8 configurations distinctes sont possibles. **Le sens positif
de l'horloge est defini par l'ordre `12 -> 3 -> 6 -> 9`** : si `12` est en
haut et `3` est a droite, c'est sens horaire ecran (`isReversed = false`).

## Les 4 niveaux

### Niveau 1 (Q1-10) - Deux segments avec cassure

- Visuel : un fond blanc avec deux segments noirs joints par une cassure
  visible. Les deux extremites sont labellisees **O** (origine) et **A**
  (arrivee).
- Le **sommet de l'angle** est la **jonction visible** entre les deux
  segments (pas de marqueur explicite).
- Angle a donner : du segment `[centre -> O]` vers `[centre -> A]`, dans
  le sens positif de l'horloge.
- Note : les angles peuvent etre **superieurs a 180°** (angles reflexes /
  rentrants). Exemple : si la cassure est tres legere, on peut avoir 175°
  ou 185° selon le sens.
- **Images de fond parasites** : une image 400x300 est affichee en
  arriere-plan de la zone visuelle, piochee aleatoirement parmi 50 photos
  via le CDN public **Picsum Photos** (`https://picsum.photos/id/<ID>/800/600`).
  Les segments O et A sont traces par-dessus en noir, avec un halo blanc
  sur les lettres pour rester lisibles sur n'importe quelle image. Chaque
  question pioche son image a la generation et la conserve lors des
  navigations Precedent/Suivant.

### Niveau 2 (Q11-20) - Point + fleche

- Visuel : un **point isole** + une **fleche separee** sur fond blanc, sans
  segment dessine entre eux.
- Le **sommet de l'angle** est la **base (queue) de la fleche**.
- L'utilisateur doit **imaginer** un segment qui relie le point a la base
  de la fleche.
- Angle a donner : du segment imaginaire `[point -> base fleche]` vers la
  fleche elle-meme `[base -> pointe]`, dans le sens positif de l'horloge.

### Niveau 3 (Q21-30) - Croix rouge + 2 points bleus

- Visuel : une **croix rouge** `x` au centre + deux **points bleus**
  labellises **O** et **A**.
- Le **sommet de l'angle** est la **croix**.
- L'utilisateur doit imaginer deux segments : `[A -> croix]` et
  `[O -> croix]` (ou `[croix -> O]` et `[croix -> A]`, ce qui revient au
  meme pour la mesure de l'angle entre eux).
- Angle a donner : du segment `[croix -> O]` vers `[croix -> A]`, dans le
  sens positif de l'horloge.

### Niveau 4 (Q31-40) - Redresser l'objet

- Visuel : une **silhouette noire d'objet** rotative + deux lettres **H**
  (Haut) et **B** (Bas) "gravees" a cote de l'objet (donc tournees avec
  lui).
- Angle a donner : la **rotation a appliquer a l'objet** (dans le sens
  positif de l'horloge) pour le **redresser**, c'est-a-dire pour que H
  pointe vers la position du `12` de l'horloge et B vers la position du
  `6`.
- Pour l'instant, **seul l'ours** est implemente comme silhouette
  (dessin canvas vectoriel). Les autres objets vus dans EPLtest
  (appareil photo, mais, mouton, haricot, piquets, aimant, etc.) restent
  a ajouter.

## UI

```
+---------------------------------------------+
|  |   [Horloge haut-centre]                  |
|  |                                          |
|  |       [Zone visuelle question]           |
|  |                                          |
|  v       [Champ de saisie]                  |
|  |                                          |
+--[Q n/40 ⏱ m:ss]--------[Precedent][Suivant]+
   ^ Barre de chrono verticale a gauche
```

- Fond **blanc** epure, conformement a EPLtest.
- Champ de saisie : petit `<input>` HTML positionne par-dessus le canvas,
  avec **focus automatique** a chaque changement de question (l'utilisateur
  peut taper sa reponse au clavier sans cliquer).
- **Touche Entree** = equivalent du bouton "Suivant".
- Bouton "Precedent" cache sur la premiere question.

## Validation et navigation

- La reponse de l'utilisateur est **enregistree** automatiquement quand il
  clique sur Precedent ou Suivant (ou appuie sur Entree).
- Sur la **derniere question**, le clic sur Suivant termine le test et
  affiche les resultats.
- Quand le **chronometre arrive a 0**, le test se termine automatiquement
  (la derniere reponse en cours de saisie est prise en compte).
- L'utilisateur peut **revenir en arriere** et **modifier ses reponses**
  tant que le test n'est pas termine.

## Ecran de resultats

- Titre `Quadrilogie des Angles` + badge `Classe N` (stanine 1-9).
- Score affiche : `correctes / total (%)`.
- **Histogramme arc-en-ciel** a 9 zones colorees representant les 9
  classes (rouge -> orange -> jaune -> vert -> bleu -> indigo). La classe
  de l'utilisateur est mise en evidence par une bordure noire.
- Si l'utilisateur a deja realise plusieurs sessions, un **mini graphique
  de progression** s'affiche.
- Boutons : **Revoir les reponses / Refaire / Menu / Accueil**.

## Ecran de correction (Revoir)

Accessible depuis l'ecran de resultats via le bouton **Revoir les
reponses**. L'utilisateur parcourt les 40 questions une par une avec :

- Le **visuel d'origine** de la question (fond blanc + horloge +
  elements du niveau).
- Un **arc vert** dessine depuis le sommet de l'angle, representant la
  **bonne reponse** (angle correct balaye depuis l'origine O dans le sens
  positif de l'horloge).
- Un **arc rouge en pointilles** (rayon legerement plus grand) qui
  represente la **reponse de l'utilisateur**, uniquement si celle-ci est
  differente de la bonne reponse.
- Une pastille de feedback sous le visuel :
  - **Vert** : "Correct : XX°" si bonne reponse.
  - **Rouge** : "Votre reponse : XX°  |  Bonne reponse : YY°" si fausse.
  - **Gris** : "Pas de reponse  |  Bonne reponse : YY°" si pas repondu.
- Boutons **Precedent / Suivant** pour naviguer, bouton **Resultats**
  en haut a gauche pour revenir.
- Le numero de question et le niveau sont affiches en haut (ex:
  "Question 5 / 40 — Niveau 1").

## Logique mathematique (calcul des angles)

### Conversion math angle <-> clock angle

Repere ecran : `Y` vers le bas. Pour un vecteur `(dx, dy)` partant du
sommet :

- **Math angle** (convention trigonometrique standard) :
  `mathAngle = atan2(-dy, dx)` (en degres)

- **Clock angle** (mesure dans le sens positif de l'horloge depuis le 12) :
  - Si `!isReversed` (sens horaire ecran) :
    `clockAngle = (clockUpAngle - mathAngle) mod 360`
  - Si `isReversed` (sens anti-horaire ecran) :
    `clockAngle = (mathAngle - clockUpAngle) mod 360`
  - Resultat ramene dans `[0, 360)`.

### Angle entre deux vecteurs (niveaux 1, 2, 3)

```
angleOA = (clockAngle(A) - clockAngle(O) + 360) mod 360
```

### Generation inverse (pour creer les questions)

Pour generer une question avec un angle cible `target` :

1. Tirer `oClockAngle` aleatoirement (multiple de 10).
2. Calculer `aClockAngle = (oClockAngle + target) mod 360`.
3. Convertir les deux angles "horloge" en angles "math" via la fonction
   inverse `clockAngleToMathDir(clockAngle, clockUpAngle, isReversed)`.
4. Placer les vecteurs `O` et `A` aux angles math correspondants avec des
   longueurs aleatoires.

### Niveau 4 (rotation pour redresser)

L'ours est tourne de `rotation` degres dans le sens **horaire ecran**
depuis la position droite (H en haut). Apres rotation, le H pointe dans
la direction math `90 - rotation`.

Pour redresser, on doit ramener H vers la position du `12` (math angle
`clockUpAngle`). La rotation a appliquer dans le sens positif de
l'horloge est :

```
target = (clockAngleOf(currentHMath) - 0) mod 360
       = mathAngleToClockAngle(currentHMath, clockUpAngle, isReversed)
```

Pour generer une question avec une rotation cible `target` :

```
currentHClockAngle = (360 - target) mod 360
currentHMath       = clockAngleToMathDir(currentHClockAngle, ...)
rotation           = (90 - currentHMath + 360) mod 360  // arrondi a 10°
```

## Parametres disponibles

| Parametre | Defaut | Plage |
|---|---|---|
| `questionsPerLevel` | 10 | 5 - 20 |
| `totalDurationSec` | 480 (8 min) | 120 - 1800 (2 - 30 min) |

## Points d'extension prevus

- [x] **Banque d'images de fond** pour le niveau 1 : implementee via
      Picsum Photos (50 IDs cures, CDN public, pas de stockage local).
      Possible evolution : telecharger localement dans `public/images/`
      pour supprimer la dependance externe.
- [ ] **Bibliotheque de silhouettes** pour le niveau 4 (appareil photo,
      mais, mouton, haricot, piquets, aimant, ours...). Pour l'instant,
      seul l'ours est dessine en canvas.
- [x] Mode "revoir les reponses" apres l'ecran de resultats (implemente
      avec arcs vert/rouge sur la zone visuelle).
- [ ] Bouton "Terminer" pour finir le test avant la fin du chrono.
- [ ] Animation d'arc lors de l'affichage de la correction.
