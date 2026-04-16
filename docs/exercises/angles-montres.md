# Angles - Montres

> Test psychotechnique d'orientation spatiale. L'utilisateur doit cocher
> toutes les montres qui affichent le bon angle, en tenant compte du sens
> de rotation propre a chaque montre.
>
> Composant: `src/components/exercises/AnglesMontresTest.tsx`

## Principe

Pour chaque question :
- Un **angle de reference** (deux segments O et A depuis un sommet) est
  affiche en haut a gauche.
- **8 montres** sont affichees dans une grille (2 + 3 + 3).
- Chaque montre a sa propre **orientation d'horloge** (position du 12,
  sens horaire ou anti-horaire) et affiche un **angle** au centre
  (positif ou negatif).
- L'utilisateur doit **cocher toutes les montres** dont l'angle affiche
  correspond a l'angle de reference mesure dans le systeme de cette montre.

## Regles

- Angles : multiples de 5 degres (de 10 a 355, excluant 0 et 5).
- Un angle negatif `-X` signifie X degres dans le sens negatif de la
  montre (equivalent a `360 - X` dans le sens positif).
- **Plusieurs reponses correctes** par question (au moins 1, rarement >5).
- Question juste = toutes les correctes cochees ET aucune incorrecte.
- On peut passer sans cocher (= 0 point pour cette question).
- Pas de feedback immediat apres chaque question.
- 30 questions, 6 minutes de chrono global.

## Classes (seuils EPLtest en %)

| Classe | Score minimum |
|--------|---------------|
| 1      | 0 %           |
| 2      | 7 %           |
| 3      | 24 %          |
| 4      | 44 %          |
| 5      | 60 %          |
| 6      | 75 %          |
| 7      | 85 %          |
| 8      | 92 %          |
| 9      | 96 %          |

## Ecran de fin

Meme style que la Quadrilogie des Angles :
- Score X/30 (X%)
- Classe 1-9 avec histogramme arc-en-ciel
- Bouton "Revoir les reponses" pour naviguer dans la correction
- Boutons Refaire / Menu / Accueil

## Ecran de correction

Pour chaque question :
- L'angle de reference est affiche avec sa valeur numerique
- Les 8 montres montrent le visuel original avec feedback couleur :
  - Vert = correctement cochee
  - Rouge = erreur (cochee a tort, ou non cochee alors qu'elle aurait du l'etre)
  - Les montres correctes non cochees ont une bordure verte
