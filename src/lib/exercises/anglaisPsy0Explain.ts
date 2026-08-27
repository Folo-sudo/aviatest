import type { AnglaisItem, AnglaisKind } from '@/lib/exercises/anglaisPsy0Bank';

const KIND_INTRO: Record<AnglaisKind, string> = {
  classic:
    'Automatisme de grammaire ou de vocabulaire : article, préposition, temps, ou mot exact imposé par la phrase.',
  tense:
    'Le **repère de temps** (since, by the time, this time tomorrow, first time, after, for + durée…) impose un temps précis. Ne traduisez pas mot à mot depuis le français.',
  structure:
    'C’est la **construction** de la phrase (inversion, relative, so/such, in case, prefer, etc.), pas seulement le mot manquant.',
  'false-friend':
    'Faux ami ou paire piégeuse : le mot anglais ne veut pas dire la même chose que son cousin français, ou deux verbes proches ne se construisent pas pareil.',
  collocation:
    'On ne « traduit » pas : on apprend le **verbe + nom** (ou adj. + nom) que les anglophones emploient vraiment (make a decision, pay attention, heavy rain…).',
  error:
    'On cherche le morceau **grammaticalement impossible**. Le reste de la phrase peut être correct.',
  paraphrase:
    'On cherche le **sens** de l’expression, souvent idiomatique. Écartez la traduction mot à mot.',
  connector:
    'L’articulateur dit le **rapport logique** : opposition (although / despite), condition (unless / provided), but (so that / so as to), concession (even if / even though).',
  inference:
    'On ne devine pas : on garde seulement ce qui **découle forcément** de la phrase (quantifieurs, négation, implicature).',
  register:
    'On identifie **ce que fait le locuteur** (demander, refuser, prévenir, s’excuser) et le **niveau de formalité**.',
  reading:
    'La bonne réponse est dans le texte (ou clairement impliquée). Relisez ; n’ajoutez pas ce que le passage ne dit pas.',
};

function rightOf(item: AnglaisItem): string {
  return item.choices[item.correct] ?? '';
}

function rule(title: string, body: string): string {
  return `**${title}**\n${body}`;
}

function match(stem: string, ...needles: string[]): boolean {
  const s = stem.toLowerCase();
  return needles.every((n) => s.includes(n.toLowerCase()));
}

function explainClassic(item: AnglaisItem, right: string): string | null {
  const s = item.stem;
  if (match(s, 'engineer') && right === 'an') {
    return rule(
      'a / an',
      'On choisit **an** devant un **son** de voyelle, pas devant une lettre. « engineer » se prononce /en…/, donc **an engineer**. On dirait **a university** (son /j/) et **an hour** (h muet).',
    );
  }
  if (match(s, 'lived in paris') || (match(s, 'since') && right === 'since')) {
    return rule(
      'for / since',
      '**since** + point de départ (since 2019, since Monday). **for** + durée (for six years). « during » ne se met pas avec le present perfect de cette façon.',
    );
  }
  if (match(s, '9 o\'clock') || (match(s, 'starts') && right === 'at')) {
    return rule(
      'at / in / on (heure)',
      'Heure précise : **at** 9 o’clock. Jour : **on** Monday. Mois / année / moment de la journée : **in** July, **in** the morning.',
    );
  }
  if (match(s, 'last week') && right === 'went') {
    return rule(
      'prétérit',
      'Un repère **fini** dans le passé (last week, yesterday, in 2019) impose le **prétérit** (went), pas le present perfect (has gone).',
    );
  }
  if (match(s, 'when the phone rang')) {
    return rule(
      'past continuous',
      'Une action **en cours** interrompue par une autre : **were having** dinner when the phone rang. Le prétérit simple (had) raconterait deux actions successives, pas le décor.',
    );
  }
  if (match(s, 'interesting book') && right === 'an') {
    return rule(
      'a / an',
      '« interesting » commence par le son /ɪ/. Donc **an interesting book**.',
    );
  }
  if (match(s, 'fluently') && right === 'very') {
    return rule(
      'very + adverbe',
      '**very** modifie un adjectif ou un adverbe (very fluently). **much** va surtout avec un comparatif (much better) ou un indénombrable. **many** = dénombrables.',
    );
  }
  if (match(s, 'look forward')) {
    return rule(
      'look forward to + -ing',
      '**look forward to** est suivi d’un **nom** ou d’un **-ing** : look forward to hearing / to the meeting. « to » n’est pas l’infinitif ici.',
    );
  }
  if (match(s, 'neither tom nor')) {
    return rule(
      'neither… nor (accord)',
      'Avec **neither A nor B**, le verbe s’accorde en général avec **B** (le plus proche) : neither Tom nor his brothers **are**.',
    );
  }
  if (match(s, 'if i') && right === 'were') {
    return rule(
      'irréel présent',
      'Conseil / hypothèse irréelle : **If I were you**. Le subjonctif **were** (pas was) est la forme attendue en anglais soigné.',
    );
  }
  if (match(s, 'took') && right === 'off') {
    return rule(
      'phrasal verb',
      '**take off** = décoller. take out / take away / take up veulent dire autre chose.',
    );
  }
  if (match(s, 'responsible')) {
    return rule(
      'responsible for',
      'On est **responsible for** something. Le français « responsable de » pousse à **of**, qui est fautif ici.',
    );
  }
  if (match(s, 'how') && match(s, 'cost') && right === 'much') {
    return rule(
      'how much / how many',
      'Un prix est indénombrable dans cette question : **How much does it cost?** How many = objets comptables.',
    );
  }
  if (match(s, 'already') || (match(s, 'finished her training') && right === 'already')) {
    return rule(
      'already / yet / still',
      '**already** = déjà (souvent au present perfect, avant « trop tard »). **yet** surtout en question / négation. **still** = encore, ça continue.',
    );
  }
  if (match(s, 'seat') && right === 'belts') {
    return rule('vocabulaire', 'L’expression figée est **seat belt** (ceinture).');
  }
  if (match(s, 'correct sentence') && right.includes("doesn't like")) {
    return rule(
      'présent simple, 3e personne',
      'He **doesn’t like** (does + base verbale). Fautes fréquentes : *don’t* avec he, *doesn’t likes* (le -s est déjà dans does).',
    );
  }
  if (match(s, 'milk left') && right === 'any') {
    return rule(
      'some / any',
      'Négation et question : **any**. **some** surtout en affirmation (ou offre). **no** donnerait *there is no milk* (sans n’t).',
    );
  }
  if (match(s, 'weather was bad') && right === 'but') {
    return rule(
      'but / so / although',
      'Deux idées **opposées** : bad weather **but** we landed. **so** marquerait une conséquence, **although** irait en tête de proposition.',
    );
  }
  if (match(s, 'rather') && right === 'arrive') {
    return rule(
      'would rather + base',
      '**I’d rather** + base verbale (I’d rather arrive). Pas de *to*. Comparez : I’d rather **you arrived** (autre sujet → prétérit modal).',
    );
  }
  if (match(s, 'runway is') && right === 'longer') {
    return rule(
      'comparatif',
      'Adjectif court : **longer than**. *more long* est calqué sur le français. *longest* = superlatif (the longest).',
    );
  }
  if (match(s, 'flight attendant') && right === 'as') {
    return rule(
      'work as / like',
      '**work as** + métier (as a flight attendant). **like** = « à la manière de », pas le poste occupé.',
    );
  }
  if (match(s, 'friday') && right === 'by') {
    return rule(
      'by / until',
      '**by Friday** = au plus tard vendredi (échéance). **until** insiste sur la durée jusqu’à un moment.',
    );
  }
  if (match(s, 'used') && right === 'to working') {
    return rule(
      'be used to + -ing',
      '**be used to + -ing** = être habitué à. **used to + base** = habitude **passée** (I used to work nights).',
    );
  }
  if (match(s, 'luggage') && right === 'has been') {
    return rule(
      'present perfect passif',
      '**already** + résultat présent : **has been checked**. Luggage est indénombrable → verbe au singulier.',
    );
  }
  if (match(s, 'where') && right === 'the gate is') {
    return rule(
      'ordre des mots (indirect)',
      'Après ask / tell / could you tell me : **sujet + verbe** (where the gate is), pas l’inversion de la question directe (*where is the gate*).',
    );
  }
  if (match(s, 'library') && (right === 'bookshop' || right === 'library')) {
    return rule(
      'faux ami library / librairie',
      '**library** = bibliothèque. Une librairie (magasin) est une **bookshop / bookstore**.',
    );
  }
  if (match(s, 'actually')) {
    return rule(
      'actually ≠ actuellement',
      '**actually** = en fait / réellement. « Actuellement » se dit **currently / at the moment**.',
    );
  }
  if (match(s, 'eventually')) {
    return rule(
      'eventually ≠ éventuellement',
      '**eventually** = finalement, au bout du compte. « Éventuellement » ≈ **possibly / if necessary**.',
    );
  }
  if (match(s, 'departure') && right === 'arrival') {
    return rule('vocabulaire', '**departure** ↔ **arrival**. Landing / take-off sont des phases de vol, pas l’antonyme du départ commercial.');
  }
  if (match(s, '"plot"') || match(s, 'a "plot"')) {
    return rule('homophones', '**pilot** = pilote. **plot** = intrigue (ou complot, ou parcelle).');
  }
  if (match(s, 'trays') && right === 'raise') {
    return rule(
      'raise / rise',
      '**raise** est transitif (on raise something). **rise** est intransitif (the sun rises). Ici : raise their trays.',
    );
  }
  if (match(s, 'librairie')) {
    return rule(
      'faux ami',
      'Le faux ami de « librairie » est **library**. Le vrai mot pour le magasin est **bookshop / bookstore**.',
    );
  }
  if (match(s, 'passport') && right === 'forgot') {
    return rule(
      'prétérit + yesterday',
      '**yesterday** force le prétérit : **forgot**. *has forgotten* garderait un lien avec le présent, sans date close.',
    );
  }
  if (match(s, 'turbulence') && right === 'sick') {
    return rule(
      'adjectif / nom',
      'feel + **adjectif** : feel **sick**. illness / disease sont des noms ; injured = blessé (trauma), pas le mal de l’air.',
    );
  }
  if (match(s, 'comply')) {
    return rule('comply with', 'On **complies with** a rule. Pas *comply to*.');
  }
  if (match(s, 'student in the class') && right === 'best') {
    return rule(
      'superlatif',
      'Dans un groupe (in the class) : **the best**. better = comparatif (better than). *more good* n’existe pas.',
    );
  }
  if (match(s, 'ages') && right === 'for') {
    return rule('for + durée', '**for ages** = depuis longtemps (durée). **since** voudrait un point de départ (since 2019).');
  }
  if (match(s, 'before') && match(s, 'take-off')) {
    return rule('before + nom', '**before take-off**. ago se met après une durée (two hours ago). since = depuis un point.');
  }
  if (match(s, 'interested')) {
    return rule('interested in', '**interested in** + nom / -ing. Pas *interested by* (calque de « intéressé par »).');
  }
  if (match(s, 'neither the captain') && right === 'nor') {
    return rule('neither… nor', 'La paire figée est **neither… nor**. *or* irait avec either.');
  }
  if (match(s, 'yet') && right === "haven't received") {
    return rule(
      'present perfect + yet',
      '**yet** dans une négation actuelle : **haven’t received yet**. *didn’t receive* irait avec une date passée close.',
    );
  }
  if (match(s, 'helped us') && right === 'who') {
    return rule(
      'who / which',
      'Personne = **who**. **which** = chose. **whose** = dont (possession). **whom** = complément, plus formel.',
    );
  }
  if (match(s, 'hard to hear') && right === 'noise') {
    return rule('nom / adjectif', 'because of the **noise** (nom). noisy = adjectif ; noisily = adverbe.');
  }
  if (match(s, 'weather improves') && right === 'will depart') {
    return rule(
      '1re conditionnelle',
      'If + présent, **will** + base : If the weather improves, we **will depart**. would = irréel (2e).',
    );
  }
  if (match(s, 'avoided')) {
    return rule('avoid + -ing', '**avoid** + -ing (avoided losing). Pas *avoid to lose*.');
  }
  if (match(s, 'clouds now') && right === 'above') {
    return rule(
      'above / over',
      '**above the clouds** = plus haut que (altitude). over insiste souvent sur « au-dessus en couvrant / en traversant ».',
    );
  }
  if (match(s, 'how long') && right === 'have') {
    return rule(
      'present perfect',
      'How long **have** you been training? La durée jusqu’à maintenant se fait au present perfect (been), pas au prétérit seul.',
    );
  }
  if (match(s, 'insisted')) {
    return rule('insist on', '**insist on** + -ing / nom. Pas *insist to*.');
  }
  if (match(s, 'landing was') && right === 'smooth') {
    return rule(
      'adjectif après be',
      'was **smooth** (adjectif). smoothly = adverbe (landed smoothly).',
    );
  }
  if (match(s, 'boarding pass') && right === 'for') {
    return rule(
      'look for',
      '**look for** = chercher. look after = s’occuper de ; look up = chercher dans une liste ; look into = enquêter.',
    );
  }
  if (match(s, 'synonym of "rapid"')) {
    return rule('synonyme', '**rapid** ≈ **quick**. slow / late / heavy sont autre chose.');
  }
  if (match(s, 'the morning') && right === 'in') {
    return rule('in the morning', '**in the morning / afternoon / evening**. **at night**, **on Monday morning**.');
  }
  if (match(s, 'suggested')) {
    return rule(
      'suggest + -ing',
      '**suggest doing** (ou suggest that we leave). *suggest to leave* et *suggest us to* sont des calques.',
    );
  }
  if (match(s, 'seats available') && right === 'few') {
    return rule(
      'few / little',
      '**few** + dénombrable (seats). **little / a little** + indénombrable (fuel, time). a little ≠ few.',
    );
  }
  if (match(s, 'moreover') || (match(s, 'french well') && right === 'moreover')) {
    return rule(
      'moreover / however',
      '**moreover** ajoute une idée dans le même sens. **however** oppose. Ici l’anglais excellent s’ajoute au français.',
    );
  }
  if (match(s, 'gate number') && right === 'changed') {
    return rule('passif', 'has been **changed** (participe passé du passif).');
  }
  if (match(s, 'ran') && right === 'out of') {
    return rule('run out of', '**run out of** = ne plus en avoir. run away from = s’enfuir.');
  }
  if (match(s, 'information')) {
    return rule(
      'information indénombrable',
      '**information** n’a pas de pluriel : some information / a piece of information. *informations* est un calque du français.',
    );
  }
  if (match(s, 'co-pilot is') && right === 'younger') {
    return rule('comparatif', 'young → **younger than**. *more young* est fautif.');
  }
  if (match(s, 'seatbelt sign') && right === 'until') {
    return rule(
      'until / unless',
      '**until** = jusqu’à ce que le panneau s’éteigne. **unless** = à moins que (condition négative), ce qui inverserait le sens.',
    );
  }
  if (match(s, 'cup of tea') && right === 'another') {
    return rule('another', '**another** + nom singulier (= an other). other = autres (pluriel) ; else = autre chose (après something).');
  }
  if (match(s, 'cancelled') && right === 'because of') {
    return rule(
      'because / because of',
      '**because of** + nom. **because** + proposition (because the weather was bad). due to + nom aussi, mais *due* seul ne suffit pas.',
    );
  }
  if (match(s, 'denied')) {
    return rule('deny + -ing', '**deny doing**. Pas *deny to do*.');
  }
  if (match(s, 'brace') && right === 'during') {
    return rule('during', '**during** + nom d’événement (during an emergency landing). in / for ne collent pas aussi bien ici.');
  }
  if (match(s, 'sensible')) {
    return rule(
      'sensible ≠ sensible (FR)',
      'EN **sensible** = raisonnable, sensé. FR « sensible » ≈ **sensitive**.',
    );
  }
  if (match(s, 'altitude') && right === 'rose') {
    return rule(
      'rise / raise',
      '**rise** (rose, risen) intransitif : the altitude rose. **raise** transitif : they raised the gear.',
    );
  }
  if (match(s, 'capable')) {
    return rule('capable of', '**capable of + -ing**. Pas *capable to* (calque de « capable de »).');
  }
  if (match(s, 'better') && right === 'go') {
    return rule(
      "had better + base",
      "**We’d better go** (base, sans to). C’est un conseil pressant, proche de should.",
    );
  }
  return null;
}

function explainTense(item: AnglaisItem, right: string): string | null {
  const s = item.stem;
  if (match(s, 'by the time') && right.includes('had')) {
    return rule(
      'past perfect',
      '**By the time** + passé : l’autre action est **déjà finie avant** → **had closed**. Le present perfect (have closed) reste branché sur maintenant.',
    );
  }
  if (match(s, 'first time') && right.includes('has')) {
    return rule(
      "It's the first time + present perfect",
      '**It’s the first / second time** + **have/has + participe**. Pas de prétérit (*did*).',
    );
  }
  if (match(s, 'this time tomorrow') || match(s, 'this time next')) {
    return rule(
      'futur continu',
      'À un moment précis du futur, action **en cours** : **will be flying / will be starting**. *will fly* = décision / fait brut, pas le décor « à cette heure-là ».',
    );
  }
  if (match(s, 'as soon as') && right === 'get') {
    return rule(
      'as soon as + présent',
      'Dans le futur, **as soon as / when / until** prennent le **présent** : as soon as I **get**. Pas *will get*.',
    );
  }
  if (match(s, 'last year') && match(s, 'if he')) {
    return rule(
      'conditionnelle mixte',
      'Cause dans le **passé** (if + past perfect) + résultat **présent** (would + base) : If he **had studied**, he would be…',
    );
  }
  if (match(s, 'since she left') || match(s, 'have been working')) {
    return rule(
      'present perfect continuous',
      '**since** + début, action encore vraie : **has been working**. Le simple present (works) n’exprime pas la durée depuis ce point.',
    );
  }
  if (match(s, 'i wish') && (right === 'had' || right === 'were')) {
    return rule(
      'wish',
      '**I wish** + prétérit modal pour un présent irréel (I wish I **had** more rest / I wish the slot **were** later). *I wish I would have* est fautif (on dit I wish I had).',
    );
  }
  if (match(s, 'admitted')) {
    return rule(
      'discours indirect',
      'Le verbe de parole est au passé : on recule d’un cran → **had skipped** (past perfect).',
    );
  }
  if (match(s, 'by the time we arrive') || match(s, 'will have')) {
    return rule(
      'futur antérieur',
      'Action **finie avant** un moment futur : **will have finished**. *will finish* ne dit pas « déjà terminé à cet instant ».',
    );
  }
  if (match(s, 'hardly') || match(s, 'no sooner') || match(s, 'scarcely')) {
    return rule(
      'inversion (hardly / no sooner)',
      '**Hardly / Scarcely / No sooner** en tête → inversion : Hardly **had we** reached. No sooner + past perfect + **than**.',
    );
  }
  if (match(s, 'rather you') || match(s, 'rather she')) {
    return rule(
      "would rather + prétérit",
      "Autre sujet après **would rather** : prétérit modal (**left / handled**). Ce n’est pas un passé réel, c’est un souhait.",
    );
  }
  if (match(s, "it's time") || match(s, 'it\'s time')) {
    return rule(
      "It's time + prétérit",
      "**It's time we made** a decision : prétérit modal (urgence / retard). It's time **to make** est possible, mais pas *we make* dans cette structure.",
    );
  }
  if (match(s, 'if only')) {
    return rule('if only / wish', '**If only** + **were** / prétérit pour un présent irréel.');
  }
  if (match(s, 'until the agent') && right.includes("hadn't")) {
    return rule(
      'past perfect',
      'Jusqu’à un moment **passé**, l’info n’était pas encore là : **hadn’t heard**. *didn’t hear* raconte un événement, pas l’antériorité.',
    );
  }
  if (match(s, 'for two weeks') || match(s, 'for hours') || match(s, 'all morning')) {
    return rule(
      'present perfect continuous',
      'Durée **jusqu’à maintenant** + fatigue / inachèvement : **have been reading / running / working**. Le prétérit coupe le lien avec le présent.',
    );
  }
  if (match(s, 'by 2028') || match(s, 'by forty')) {
    return rule(
      'futur antérieur',
      '**By** + date future : **will have logged** (résultat acquis à cette date).',
    );
  }
  if (match(s, 'wasn\'t used to') || match(s, 'used to')) {
    return rule(
      'be used to + -ing',
      '**be / get used to + -ing**. used to + base = habitude passée (différent).',
    );
  }
  if (match(s, 'the moment') && right === 'lifts') {
    return rule(
      'subordonnée de temps au présent',
      'The moment / as soon as + **présent** pour le futur : The moment the fog **lifts**, we will…',
    );
  }
  if (match(s, 'just finished') || match(s, 'had just')) {
    return rule(
      'past perfect + when',
      'Une action **vient de** se terminer **avant** l’autre dans le passé : **had just finished** when…',
    );
  }
  if (match(s, 'if it') && right.includes('had not been')) {
    return rule(
      '3e conditionnelle (if it had not been for)',
      '**If it had not been for** the hold = sans ce hold, dans le passé. C’est un irréel passé.',
    );
  }
  if (match(s, 'mustn\'t') || match(s, 'passengers') && match(s, 'smoke')) {
    return rule(
      "mustn't = interdiction",
      "**mustn't** = défense. **needn't** = pas nécessaire. *mustn't to* n’existe pas.",
    );
  }
  return null;
}

function explainStructure(item: AnglaisItem, right: string): string | null {
  const s = item.stem;
  if (match(s, 'only then') || match(s, 'not only') || match(s, 'seldom') || match(s, 'under no')) {
    return rule(
      'inversion après adverbe négatif',
      'En tête : Only then / Not only / Seldom / Under no circumstances → **auxiliaire + sujet** : Only then **did we realise** ; Not only **was he** late ; Seldom **have we seen**.',
    );
  }
  if (match(s, 'despite') || match(s, 'although')) {
    return rule(
      'despite / although',
      '**despite / in spite of** + nom ou -ing. **although / even though** + sujet + verbe. **however** ne relie pas deux propositions comme ça (souvent adverbe : However, …).',
    );
  }
  if (match(s, 'in case')) {
    return rule(
      'in case ≠ if',
      '**in case** = par précaution (on agit **avant** le problème). **if** = condition pour que l’action ait lieu. Take a battery **in case** it dies.',
    );
  }
  if (match(s, 'so as')) {
    return rule('so as to', '**so as to** + base = afin de. so that + sujet + verbe.');
  }
  if (match(s, 'so') && match(s, 'that nobody')) {
    return rule('so / such', '**so** + adjectif + that. **such** + (a) + nom : such a long sector.');
  }
  if (match(s, 'such a long')) {
    return rule('such + nom', '**such a** + adj + nom + that. **so** + adjectif (so long that).');
  }
  if (match(s, 'tyres') || match(s, 'had the') || match(s, 'have the apu')) {
    return rule(
      'have something done',
      '**have / get + objet + participe** : faire faire (He had the tyres **checked**).',
    );
  }
  if (match(s, 'needn') && right === 'have') {
    return rule(
      "needn't have + participe",
      "**needn't have come** = tu es venu **pour rien** (c’était inutile, mais tu l’as fait). **didn't need to** = ce n’était pas nécessaire (on ne dit pas si tu l’as fait).",
    );
  }
  if (match(s, 'needn') && right.includes('needn')) {
    return rule(
      "needn't have",
      'Regret / constat : vous **n’aviez pas besoin** de venir, mais vous êtes venus → **needn’t have come**.',
    );
  }
  if (match(s, 'the more you') || match(s, 'the sooner')) {
    return rule(
      'the more… the more',
      'Parallèle : **The more** you practise, **the easier** it gets. Article **the** des deux côtés.',
    );
  }
  if (match(s, 'whether')) {
    return rule(
      'whether… or not',
      '**whether** … or not = que ça plaise ou non. **if** ne va pas aussi bien avec *or not* en fin de phrase.',
    );
  }
  if (match(s, 'which of the two')) {
    return rule('which of', 'Parmi un choix limité : **which**. **what** est plus ouvert.');
  }
  if (match(s, 'little chance') || (match(s, 'chance of') && right === 'little')) {
    return rule(
      'little / few',
      '**little** + indénombrable (chance, fuel, time). **few** + dénombrable (people, seats).',
    );
  }
  if (match(s, 'as if') || match(s, 'as though')) {
    return rule(
      'as if + were',
      'Comparaison irréelle : as if / as though he **were**. Ce n’est pas un passé réel.',
    );
  }
  if (match(s, 'should the weather') || match(s, 'were i you') || match(s, 'were we to') || match(s, 'had i known')) {
    return rule(
      'inversion conditionnelle',
      'Sans if : **Should** the weather worsen ; **Were** I you ; **Had** I known. C’est plus formel que if.',
    );
  }
  if (match(s, 'so') && match(s, 'i') && right === 'have') {
    return rule(
      'so + auxiliaire + sujet',
      'Pour **reprendre** une affirmation : So **have** I / So do I / So did I — on recopie l’auxiliaire de la phrase d’avant.',
    );
  }
  if (match(s, 'neither have i')) {
    return rule(
      'neither / nor',
      'Reprise **négative** : Neither have I, and **neither** has anyone… **so** reprendrait une affirmation.',
    );
  }
  if (match(s, 'prefer') && right === 'to handle' || match(s, 'prefer') && right === 'to stay') {
    return rule(
      "I'd prefer to",
      "**I'd prefer to** + base (I'd prefer to handle / to stay). I'd rather + base (sans to).",
    );
  }
  if (match(s, 'vital that') || match(s, 'essential that')) {
    return rule(
      'subjonctif mandatif',
      'Après it is vital / essential / important that : **base** sans -s (**be** checked). Très formel ; *is* est plus relâché et souvent refusé en QCM.',
    );
  }
  if (match(s, 'no point')) {
    return rule("there's no point + -ing", "There's no point **waiting**. Pas *to wait*.");
  }
  if (match(s, 'made us')) {
    return rule('make + base', '**make someone do** (sans to). *make us to sit* est fautif.');
  }
  if (match(s, 'object to')) {
    return rule('object to + -ing', '**object to being** treated… « to » est une préposition → -ing.');
  }
  if (match(s, 'too tired')) {
    return rule('too + adj + to', '**too tired to fly**. *too tired for fly* est impossible.');
  }
  if (match(s, 'both of') && right === 'whom') {
    return rule(
      'of whom',
      'Après a number of / both of / all of + personne : **whom**. which = chose.',
    );
  }
  return null;
}

function explainFalseFriend(item: AnglaisItem, right: string): string | null {
  const s = item.stem;
  if (match(s, 'currently')) {
    return rule('currently', '**currently** = en ce moment. **actually** = en fait. Ne les inversez pas.');
  }
  if (match(s, 'sympathetic')) {
    return rule(
      'sympathetic ≠ sympathique',
      '**sympathetic** = compatissant. « Sympathique » ≈ **nice / friendly**.',
    );
  }
  if (match(s, 'lecture')) {
    return rule('lecture ≠ lecture (FR)', 'EN **lecture** = cours magistral. FR lecture = **reading**.');
  }
  if (match(s, 'attend')) {
    return rule(
      'attend ≠ attendre',
      '**attend** a meeting = y **assister**. Attendre = **wait**. Aider = **help** (pas *assist at* pour « être présent »).',
    );
  }
  if (match(s, 'demand')) {
    return rule(
      'demand ≠ demander',
      '**demand** = exiger. Demander poliment = **ask**. « Une demande » commerciale ≈ **a request**.',
    );
  }
  if (match(s, 'resume') && !match(s, 'resumed taxi')) {
    return rule('resume / résumé', 'US **resume** = CV. **résumé** aussi. Reprendre le travail = **resume work**.');
  }
  if (match(s, 'issue')) {
    return rule(
      'issue ≠ issue (FR)',
      'EN **issue** = problème / question. FR « issue » (sortie) = **exit**.',
    );
  }
  if (match(s, 'rest of the crew')) {
    return rule('the rest', '**the rest** = le reste. FR « rest » (pause) = **a break / rest**.');
  }
  if (match(s, 'former')) {
    return rule('former ≠ ancien (vieux)', '**former** = précédent. **ancient** = antique. **old** = âgé / vieux.');
  }
  if (match(s, 'control')) {
    return rule(
      'control ≠ contrôler (vérifier)',
      '**control** = avoir le pouvoir sur. Vérifier = **check**. Un contrôle de sécurité = **security check**.',
    );
  }
  if (match(s, 'délai') || match(s, 'delay')) {
    return rule(
      'delay ≠ délai',
      '**delay** = retard. Un délai (date limite) = **deadline / time limit**.',
    );
  }
  if (match(s, 'location')) {
    return rule(
      'location ≠ location (FR)',
      'EN **location** = emplacement. Louer une voiture = **hire / rent**. FR location (loyer) ≠ EN location.',
    );
  }
  if (match(s, 'comprehensive')) {
    return rule('comprehensive ≠ compréhensif', '**comprehensive** = complet, exhaustif. Compréhensif = **understanding**.');
  }
  if (match(s, 'injury')) {
    return rule('injury ≠ injure', '**injury** = blessure. Une insulte = **insult**. FR « injure » piège.');
  }
  if (match(s, 'unique') || match(s, 'only spare')) {
    return rule(
      'unique ≠ unique (seul)',
      'EN **unique** = unique en son genre. « Le seul » = **the only**.',
    );
  }
  if (match(s, 'formidable')) {
    return rule(
      'formidable ≠ formidable (FR)',
      'EN **formidable** = impressionnant, redoutable. FR formidable ≈ **great / terrific**.',
    );
  }
  if (match(s, 'deception')) {
    return rule('deception ≠ déception', '**deception** = tromperie. Déception = **disappointment**.');
  }
  if (match(s, 'opportunity')) {
    return rule(
      'opportunity / possibility',
      '**opportunity** = occasion favorable à saisir. **possibility** = ce qui peut arriver (neutre).',
    );
  }
  if (match(s, 'college')) {
    return rule('college (US)', 'Aux US, **college** ≈ enseignement supérieur. Lycée = **high school**.');
  }
  if (match(s, 'pass') && match(s, 'exam')) {
    return rule(
      'pass an exam',
      'On **passes** an exam. *succeed an exam* est un calque. succeed **in** + -ing.',
    );
  }
  if (match(s, 'remind') || match(s, 'remember')) {
    return rule(
      'remind / remember',
      '**remind someone to do** = rappeler à quelqu’un. **remember to do** = ne pas oublier soi-même.',
    );
  }
  if (match(s, 'earn') || match(s, 'salary')) {
    return rule('earn / win', 'Un salaire s’**earn**. **win** = gagner un concours, un match, de l’argent à un jeu.');
  }
  if (match(s, 'lend') || match(s, 'borrow')) {
    return rule(
      'lend / borrow',
      '**lend** = prêter (Could you lend me…?). **borrow** = emprunter (Can I borrow…?).',
    );
  }
  if (match(s, 'said') || match(s, 'told') || match(s, 'tell')) {
    return rule(
      'say / tell',
      '**tell someone** something (tell us). **say** something (say that…). *say us* est fautif.',
    );
  }
  if (match(s, 'expect') || match(s, 'wait') || match(s, 'hope')) {
    return rule(
      'expect / wait / hope',
      '**expect** = s’attendre à (probable / prévu). **wait** = attendre physiquement. **hope** = souhaiter, sans certitude.',
    );
  }
  if (match(s, 'affect') || match(s, 'effect')) {
    return rule('affect / effect', '**affect** = verbe (influencer). **effect** = nom (un effet), sauf *effect a change* (rare).');
  }
  if (match(s, 'advice') || match(s, 'advise')) {
    return rule(
      'advice / advise',
      '**advice** = nom indénombrable (some advice, jamais *advices*). **advise** = verbe.',
    );
  }
  if (match(s, 'principle') || match(s, 'principal')) {
    return rule('principal / principle', '**principal** = principal / directeur. **principle** = principe (idée).');
  }
  if (match(s, 'quiet') || match(s, 'quite')) {
    return rule('quiet / quite', '**quiet** = silencieux. **quite** = tout à fait / assez.');
  }
  if (match(s, 'fewer') || match(s, 'less')) {
    return rule('fewer / less', '**fewer** + dénombrables (passengers). **less** + indénombrables (fuel, time).');
  }
  if (match(s, 'economic') || match(s, 'economical')) {
    return rule(
      'economic / economical',
      '**economical** = économe (consomme peu). **economic** = relatif à l’économie (economic growth).',
    );
  }
  if (match(s, 'effective') || match(s, 'efficient')) {
    return rule(
      'effective / efficient',
      '**effective** = ça marche, ça produit l’effet. **efficient** = bon rendement (peu de gaspillage).',
    );
  }
  if (match(s, 'historic') || match(s, 'historical')) {
    return rule(
      'historic / historical',
      '**historic** = qui fait date. **historical** = relatif à l’histoire (a historical novel).',
    );
  }
  if (match(s, 'lie') || match(s, 'lay')) {
    return rule(
      'lie / lay',
      '**lie** (lay / lain) = s’allonger (intransitif) : lie down. **lay** (laid / laid) = poser quelque chose.',
    );
  }
  if (match(s, 'loose') || match(s, 'lose')) {
    return rule('lose / loose', '**lose** = perdre. **loose** = lâche, pas serré.');
  }
  if (match(s, 'its') || match(s, "it's")) {
    return rule("its / it's", "**its** = possessif (its own APU). **it's** = it is / it has.");
  }
  if (match(s, 'stage')) {
    return rule('stage ≠ stage (FR)', 'FR « stage » = **internship**. EN **stage** = scène / étape.');
  }
  if (match(s, 'experience') || match(s, 'experiment')) {
    return rule(
      'experience / experiment',
      '**experience** = vécu, expérience professionnelle. **experiment** = expérience de labo / essai.',
    );
  }
  if (match(s, 'ignore')) {
    return rule(
      'ignore ≠ ignorer (ne pas savoir)',
      'EN **ignore** = faire exprès de ne pas prêter attention. Ne pas savoir = **not know / be unaware**.',
    );
  }
  if (match(s, 'phrase')) {
    return rule('phrase ≠ phrase (FR)', 'EN **phrase** = groupe de mots. Une phrase complète = **sentence**.');
  }
  if (match(s, 'hazard')) {
    return rule('hazard ≠ hasard', '**hazard** = danger. Hasard = **chance / coincidence**.');
  }
  if (match(s, 'caution')) {
    return rule('caution ≠ caution (FR)', 'EN **caution** = mise en garde. Une caution (dépôt) = **deposit**.');
  }
  if (match(s, 'fabric')) {
    return rule('fabric ≠ fabrique', '**fabric** = tissu. Une usine = **factory / plant**.');
  }
  if (match(s, 'habit')) {
    return rule('habit ≠ habit (vêtement)', '**habit** = habitude. Des vêtements = **clothes**.');
  }
  if (match(s, 'engaged')) {
    return rule(
      'engaged',
      '**engaged** to someone = fiancé(e). A line is **engaged** = occupée. Embauché = **hired**.',
    );
  }
  if (match(s, 'magazine')) {
    return rule('magazine ≠ magasin', '**magazine** = revue. Magasin = **shop / store**.');
  }
  if (match(s, 'prejudice')) {
    return rule('prejudice ≠ préjudice', '**prejudice** = préjugé. Un préjudice (dommage) = **harm / loss**.');
  }
  if (match(s, 'achieve')) {
    return rule(
      'achieve ≠ achever',
      '**achieve** = atteindre un résultat. Achever / terminer = **finish / complete**.',
    );
  }
  if (match(s, 'agenda')) {
    return rule(
      'agenda',
      'EN **agenda** = ordre du jour. Un carnet de rendez-vous = **diary / calendar**.',
    );
  }
  if (match(s, 'chef')) {
    return rule('chef ≠ chef (patron)', 'EN **chef** = cuisinier. Le patron = **boss / manager**.');
  }
  if (match(s, 'blessed') || match(s, 'blessé')) {
    return rule('injured / blessed', 'Blessé = **injured**. **blessed** = béni / bienheureux.');
  }
  if (match(s, 'complete') && match(s, 'complet')) {
    return rule(
      'complete ≠ complet (plein)',
      '**complete** = achevé / entier. Un vol complet (plus de places) = **full**.',
    );
  }
  if (match(s, 'significant')) {
    return rule(
      'significant / important',
      '**significant** insiste sur l’**effet** ou le sens statistique. **important** = important (y compris une personne).',
    );
  }
  if (match(s, 'actuellement')) {
    return rule('actually / currently', 'FR actuellement = **currently**. EN **actually** = en fait.');
  }
  if (match(s, 'conference') && match(s, 'meeting')) {
    return rule(
      'meeting',
      '« Je suis en réunion » = **I am in a meeting**. *I am in conference* n’est pas l’équivalent courant.',
    );
  }
  return null;
}

function explainCollocation(item: AnglaisItem, right: string): string | null {
  const pairs: [string, string][] = [
    ['decision', 'On **makes** a decision (pas *does*).'],
    ['attention', 'On **pays** attention (pas *makes attention*).'],
    ['meeting', 'On **holds** a meeting.'],
    ['photo', 'On **takes** a photo (pas *makes*).'],
    ['deadline', 'On **meets** a deadline.'],
    ['risk', 'On **runs / takes** a risk.'],
    ['warning', 'On **issues** a warning.'],
    ['visa', 'On **applies for** a visa.'],
    ['consisted', '**consist of** (pas *consist in* ici, et pas *composed of* sans be).'],
    ['depends', '**depend on** (pas *of*).'],
    ['succeeded', '**succeed in + -ing**.'],
    ['failed', '**fail to** + base.'],
    ['good', '**good at** + nom / -ing.'],
    ['keen', '**keen on** + nom / -ing.'],
    ['conclusion', 'On **draws** a conclusion.'],
    ['rain', '**heavy rain** (pas *strong rain*).'],
    ['promises', 'On **keeps** a promise.'],
    ['cold', 'On **catches** a cold.'],
    ['business', 'On **does** business with…'],
    ['look', '**take a look** / have a look.'],
    ['threat', 'On **poses** a threat.'],
    ['boarded', 'On **boards** the aircraft (pas *enters in*).'],
    ['report', 'On **files** a report.'],
    ['exam', 'On **sits / takes** an exam. *pass* = le réussir.'],
    ['agreement', 'On **reaches / comes to** an agreement.'],
    ['favour', 'On **does** someone a favour.'],
    ['blame', 'On **takes** the blame.'],
    ['action', 'On **takes** action.'],
    ['speech', 'On **makes** a speech.'],
    ['chance', "**don't stand a chance**."],
    ['surcharge', 'On **imposes** a surcharge / a charge.'],
    ['word', 'On **keeps** one\'s word.'],
    ['sight', 'On **loses** sight of…'],
    ['havoc', '**play havoc with** / wreak havoc.'],
    ['rumours', 'On **fuels** rumours (pas *fires*).'],
    ['complaint', 'On **lodges / files** a complaint.'],
    ['english', 'On **brushes up** one\'s English.'],
    ['fog', 'The fog **sets in**.'],
    ['habit', 'On **makes** a habit of + -ing.'],
    ['account', '**take account of** / take into account.'],
    ['notice', 'On **takes** notice of.'],
    ['profit', 'On **makes** a profit.'],
    ['rest', 'On **takes / has** a rest.'],
    ['talks', 'On **holds** talks.'],
  ];
  const s = item.stem.toLowerCase();
  for (const [needle, text] of pairs) {
    if (s.includes(needle)) return rule('Collocation', text);
  }
  return rule(
    'Collocation',
    `La forme figée attendue est **${right}**. Apprenez-la telle quelle : un autre verbe « logique » en français est souvent faux.`,
  );
}

function explainError(item: AnglaisItem, right: string): string {
  const s = item.stem;
  const hints: [string, string][] = [
    ['would have known', 'En if-clause du 3e type : **If I had known**, pas *If I would have known*.'],
    ['informations', '**information** est indénombrable : the information was…'],
    ['suggested us to', '**suggest -ing** ou suggest that we leave — pas *suggest someone to*.'],
    ['am living here since', 'since + present perfect : **I have lived / have been living** since 2018. Pas *I am living since*.'],
    ['despite of', '**despite** (sans of) ou **in spite of**.'],
    ['most tall', 'Deux personnes : **the taller**. Superlatif *the most / -est* = plus de deux.'],
    ['to meet', 'look forward to **meeting** (-ing).'],
    ['neither of the runways are', '**neither** est singulier : neither of the runways **is**.'],
    ["didn't used", "négation de used to : **didn't use to** (sans -d)."],
    ['discussed about', '**discuss** something (sans about). talk **about**.'] ,
    ["i'm agreeing", '**I agree** (état, pas *I am agreeing* en général).'],
    ['has went', 'participe de go = **gone** : has gone.'],
    ['the news are', '**news** est singulier : the news **is**.'],
    ['explained him', '**explain something to someone** (pas *explain him the problem*).'],
    ['married with', '**married to** someone.'],
    ['when i will arrive', 'after when / as soon as : présent — when I **arrive**.'],
    ['stopped to smoke', '**stop -ing** = arrêter de (quitter l’habitude). stop **to** = s’arrêter **pour**.'],
    ['too much people', 'people dénombrable : **too many people**. much = indénombrable.'],
    ['prefer flying than', '**prefer A to B** (pas *than*).'],
    ['you and i', 'après between : **between you and me** (complément).'],
    ['each of the pilots have', '**each** est singulier : each of the pilots **has**.'],
    ['where was the gate', 'question indirecte : where **the gate was** (pas d’inversion).'],
    ['used to get', 'be used to **getting**. used to get = habitude passée (autre structure).'],
    ['recommended me to', '**recommend -ing** / recommend that I apply — pas *recommend me to*.'],
    ['the police is', '**police** est pluriel : the police **are** coming.'],
    ['have been to london last week', 'last week → prétérit : **I went**. Le present perfect refuse cette date close.'],
    ['is knowing', '**know** n’est pas progressif : He **knows**.'],
    ['arrived to', '**arrive at** the airport / **arrive in** a city.'],
    ['depends of', '**depend on**.'],
    ['to hear from you', 'look forward to **hearing**.'],
    ['good in english', '**good at** English.'],
    ['difficulty to sleep', '**difficulty -ing** / have difficulty **in** sleeping.'],
    ['the fact the fog', 'despite **the fog** / despite the fact **that** it was foggy.'],
    ['look forward for', 'look forward **to**, pas *for*.'],
    ['one of the aircraft are', '**one of** + pluriel + verbe **singulier** : one of the aircraft **is**.'],
    ['am agree', '**I agree** (pas *I am agree*, calque de « je suis d’accord »).'],
    ['entered in', '**enter** the cockpit (sans in). enter **into** un accord.'],
    ["didn't see nothing", 'une seule négation : **didn’t see anything** / saw nothing.'],
    ['the both', '**both runways** (sans the) ou **both of the runways**.'],
    ['more experienced as', 'comparatif : more experienced **than** / the more experienced **of** the two.'],
    ['told to him', '**tell someone** (told him). say **to** someone.'],
  ];
  for (const [needle, text] of hints) {
    if (s.toLowerCase().includes(needle.toLowerCase())) {
      return rule('Pourquoi c’est faux', `${text}\n\nLe segment fautif est : **${right}**.`);
    }
  }
  return rule(
    'Repérage d’erreur',
    `Le morceau incorrect est **« ${right} »**. Comparez avec la construction standard (préposition, temps, accord, ou calque du français).`,
  );
}

function explainParaphrase(item: AnglaisItem, right: string): string {
  const s = item.stem.toLowerCase();
  const hints: [string, string][] = [
    ['called off', '**call off** = annuler.'],
    ['barely', '**barely** = tout juste, de justesse (presque pas).'],
    ['might as well', '**might as well** = autant le faire (pas de raison de ne pas).'],
    ["couldn't help", "**couldn't help + -ing** = ne pas pouvoir s’empêcher de."],
    ['put off', '**put off** = reporter (postpone).'],
    ['takes after', '**take after** = ressembler à (famille).'],
    ['get this over with', '**get something over with** = en finir, même si c’est pénible.'],
    ["i'm afraid", "**I'm afraid** = formule de regret poli, pas la peur."],
    ['came up with', '**come up with** = trouver / inventer une idée.'],
    ["don't add up", "**don't add up** = ce n’est pas cohérent."],
    ['by no means', '**by no means** = pas du tout.'],
    ['ran short', '**run short of** = manquer de.'],
    ['on second thoughts', '**on second thoughts** = en y réfléchissant (on change d’avis).'],
    ['bound to', '**bound to** = presque certain.'],
    ['take your point', '**take your point** = je vois votre argument.'],
    ['saw through', '**see through** = percer à jour (mensonge).'],
    ['cutting it fine', '**cut it fine** = trop juste, peu de marge.'],
    ['turned down', '**turn down** an offer = refuser. (turn down the volume = baisser le son : autre contexte.)'],
    ['running behind', '**run behind** = être en retard.'],
    ['take it from here', '**take it from here** = je prends le relais.'],
    ['neither here nor there', '**neither here nor there** = hors sujet, sans importance.'],
    ['kept her temper', '**keep one’s temper** = garder son calme.'],
    ['same boat', '**in the same boat** = dans la même situation.'],
    ['goes without saying', '**it goes without saying** = cela va de soi.'],
    ['out of the question', '**out of the question** = exclu, inenvisageable.'],
    ['made light of', '**make light of** = minimiser.'],
    ['could do with', '**could do with** = j’aurais bien besoin de.'],
    ['on the high side', '**on the high side** = plutôt élevé.'],
    ['split the difference', '**split the difference** = couper la poire en deux.'],
    ['beside the point', '**beside the point** = hors sujet.'],
    ['got away with', '**get away with** = s’en tirer avec (seulement un avertissement).'],
    ['cross that bridge', '**cross that bridge when we come to it** = on verra le moment venu.'],
    ['snowed under', '**snowed under** = débordé de travail.'],
    ['fell through', '**fall through** = tomber à l’eau, échouer.'],
    ['take your word', '**take someone’s word for it** = croire sur parole.'],
    ['dragged on', '**drag on** = s’éterniser.'],
    ['up to the job', '**up to the job** = à la hauteur.'],
    ['had better', "**had better** = tu ferais bien de (conseil pressant)."],
    ['talked the agent into', '**talk someone into** = persuader de.'],
    ['few and far between', '**few and far between** = rares.'],
    ['sit this one out', '**sit something out** = ne pas participer cette fois.'],
  ];
  for (const [needle, text] of hints) {
    if (s.includes(needle)) {
      return rule('Sens', `${text}\n\nÉquivalent le plus proche : **${right}**.`);
    }
  }
  return rule('Sens', `L’expression veut dire : **${right}**. Évitez la traduction mot à mot.`);
}

function explainConnector(item: AnglaisItem, right: string): string {
  const s = item.stem.toLowerCase();
  if (s.includes('despite') || right === 'Despite' || right === 'Notwithstanding') {
    return rule(
      'despite + nom',
      '**Despite / notwithstanding** + nom (despite the delay). **Although** + sujet-verbe. **However** se met plutôt en tête de phrase, avec une virgule.',
    );
  }
  if (right.toLowerCase() === 'although' || s.includes('she was tired')) {
    return rule('although + proposition', '**Although she was tired** + verbe. Pas *although being* : là il faudrait despite being.');
  }
  if (right === 'provided' || right === 'as long as') {
    return rule('condition', '**provided (that) / as long as** = à condition que. **unless** = à moins que (sens inverse).');
  }
  if (right === 'unless') {
    return rule('unless', '**unless** = if … not. Unless you object = si vous ne vous y opposez pas.');
  }
  if (right === 'yet') {
    return rule('yet (opposition)', '**yet** = et pourtant (opposition, comme but).');
  }
  if (right === 'therefore') {
    return rule('therefore', '**therefore** = par conséquent (cause → effet). although / despite n’expriment pas la conséquence.');
  }
  if (right === 'whereas') {
    return rule('whereas', '**whereas** oppose deux faits (elle / lui). Pas une cause.');
  }
  if (right === 'in case') {
    return rule('in case', '**in case** = au cas où (précaution). unless = condition négative.');
  }
  if (right === 'so as to') {
    return rule('so as to / so that', '**so as to** + verbe (but). **so that** + sujet + verbe (Speak slowly so that everyone can follow).');
  }
  if (right === 'so that') {
    return rule('so that', '**so that** + sujet + verbe. **so as to** n’a pas de sujet après lui.');
  }
  if (right === 'as soon as') {
    return rule('as soon as / as long as', '**as soon as** = dès que. **as long as** = tant que / à condition que.');
  }
  if (right === 'even if') {
    return rule(
      'even if / even though',
      '**even if** = même si (hypothèse). **even though** = même si (fait réel déjà vrai).',
    );
  }
  if (right === 'even though') {
    return rule(
      'even though',
      '**even though** + fait **avéré**. **even if** pour une hypothèse. **despite** + nom, pas + proposition complète sans -ing.',
    );
  }
  if (right === 'albeit') {
    return rule('albeit', '**albeit** = encore que, bien que (formel), souvent + adjectif : new, **albeit** effective.');
  }
  if (right === 'That said') {
    return rule('that said', '**That said** = ceci dit (on concède puis on nuance).');
  }
  if (right === 'Regardless') {
    return rule('regardless of', '**regardless of** + nom. *regarding of* n’existe pas.');
  }
  if (right === 'until') {
    return rule('until', '**until** = jusqu’à ce que (l’action ne commence / ne change qu’à ce moment). **by** = au plus tard.');
  }
  if (right === 'in case of') {
    return rule('in case of', '**in case of** + nom (in case of a hold). **in case** + proposition (in case we hold).');
  }
  return rule(
    'Articulateur',
    `Le rapport logique attendu se dit **${right}**. Relisez : cause, opposition, but, condition ou concession ?`,
  );
}

function explainInference(item: AnglaisItem, right: string): string {
  const s = item.stem.toLowerCase();
  if (s.includes('only four of the twelve')) {
    return rule(
      'only + fraction',
      '« Only 4 of 12 » ⇒ **8 n’ont pas** le CPL. On ne sait rien d’un ATPL.',
    );
  }
  if (s.includes('cannot have') || s.includes("can't have")) {
    return rule(
      'modaux de déduction',
      '**can’t have + participe** = presque sûr que ce n’est **pas** arrivé. **must have** = presque sûr que si.',
    );
  }
  if (s.includes('must have')) {
    return rule(
      'must have',
      '**must have** = déduction forte sur le passé, pas une obligation. Ce n’est pas une preuve filmée, c’est la conclusion raisonnable.',
    );
  }
  if (s.includes('few') && s.includes('complained')) {
    return rule('few', '**few** = peu nombreux (négatif). Ceux qui l’ont fait étaient très en colère : petit nombre, forte intensité.');
  }
  if (s.includes('yet to')) {
    return rule('yet to', '**is yet to sign / I have yet to meet** = **pas encore** fait.');
  }
  if (s.includes('barely')) {
    return rule('barely', '**barely** = tout juste, presque pas assez.');
  }
  if (s.includes('except')) {
    return rule('except', '« All except X » ⇒ X est le **seul** à ne pas l’avoir.');
  }
  if (s.includes('if the fog lifts') && s.includes('has not lifted')) {
    return rule(
      'dénier l’antécédent',
      'If P then Q, et non-P : on **ne conclut pas** Q. On ne peut pas dire que le vol est parti.',
    );
  }
  if (s.includes('no sooner')) {
    return rule('no sooner… than', '**No sooner A than B** = B tout de suite après A.');
  }
  if (s.includes('hardly')) {
    return rule('hardly', '**hardly** = presque pas. hardly spoke = très peu parlé. hardly anyone = presque personne.');
  }
  if (s.includes('little chance')) {
    return rule('little + nom', '**little chance** = peu de chances (pessimiste). a little = un peu (plus positif).');
  }
  if (s.includes('failed to')) {
    return rule('fail to', '**fail to notice** = **n’a pas** remarqué (échec, pas un retard).');
  }
  if (s.includes('due to leave')) {
    return rule('due to', '**is due to leave** = est **prévu** pour partir (horaire), pas « déjà parti ».');
  }
  if (s.includes('neither runway')) {
    return rule('neither', '**neither** = pas l’un, pas l’autre → les deux ne sont pas secs.');
  }
  if (s.includes('would have called') && s.includes('did not call')) {
    return rule(
      'modus tollens (irréel)',
      '« Si retard → elle aurait appelé ». Elle n’a pas appelé ⇒ on conclut qu’elle **n’était probablement pas** en retard. Ce n’est pas une preuve qu’elle a perdu son téléphone.',
    );
  }
  if (s.includes('at most')) {
    return rule('at most / at least', '**at most 3** = pas plus de 3. **at least 3** = 3 ou davantage. Exactement 3 n’est pas forcé.');
  }
  if (s.includes('six months') || s.includes('five months')) {
    return rule('contrainte chiffrée', 'Il **faut** 6 mois de validité. 5 mois < 6 ⇒ **insuffisant**.');
  }
  if (s.includes('anything but')) {
    return rule('anything but', '**anything but short** = tout **sauf** court → c’était long.');
  }
  if (s.includes('not all')) {
    return rule('not all', '**Not all** = il existe **au moins une** exception. Ce n’est pas « aucun ».');
  }
  if (s.includes('too recently')) {
    return rule('too… to', '**too recently to have landed** = trop tôt pour que l’atterrissage soit déjà fait.');
  }
  if (s.includes('anyone who holds') || s.includes('no type rating')) {
    return rule(
      'condition nécessaire',
      'La règle dit : type rating ⇒ peut postuler. Jane n’a pas le rating ⇒ **cette règle ne l’autorise pas**. (Elle pourrait l’être par une autre règle, mais pas par celle-ci.)',
    );
  }
  if (s.includes('monday') && s.includes('thursday')) {
    return rule('révision', 'Révisé jeudi ⇒ il existe une version **postérieure** à lundi.');
  }
  return rule(
    'Inférence',
    `Ce qui suit **nécessairement** : **${right}**. Écartez ce qui est possible mais pas dit, et les extrêmes (« never », « always », « definitely ») non justifiés.`,
  );
}

function explainRegister(_item: AnglaisItem, right: string): string {
  return rule(
    'Registre / fonction',
    `Ici, l’acte de langage (ou le niveau de politesse) est : **${right}**.\n\n- Ordre / consigne : you are to, shall, must\n- Requête polie : would you mind, I was wondering, I should be grateful if\n- Suggestion : you might want to, perhaps\n- Refus poli : I’m afraid we cannot\n- Excuse : I’m sorry / I apologise\n- Désaccord poli : with respect, I don’t share…\n\nLe trop familier (chuck, yo, lol) est hors d’un mail compagnie.`,
  );
}

function explainReading(item: AnglaisItem, right: string): string {
  return rule(
    'Compréhension',
    `D’après le texte, la réponse est **${right}**.\n\nRelisez le passage au-dessus : une question « according to the text » refuse ce que vous savez par ailleurs. Une question de vocabulaire (« closest to ») prend le **sens dans ce texte**, pas tous les sens du dictionnaire.`,
  );
}

export function explainAnglaisItem(item: AnglaisItem): string {
  const right = rightOf(item);
  let specific: string | null = null;
  switch (item.kind) {
    case 'classic':
      specific = explainClassic(item, right);
      break;
    case 'tense':
      specific = explainTense(item, right);
      break;
    case 'structure':
      specific = explainStructure(item, right);
      break;
    case 'false-friend':
      specific = explainFalseFriend(item, right);
      break;
    case 'collocation':
      specific = explainCollocation(item, right);
      break;
    case 'error':
      specific = explainError(item, right);
      break;
    case 'paraphrase':
      specific = explainParaphrase(item, right);
      break;
    case 'connector':
      specific = explainConnector(item, right);
      break;
    case 'inference':
      specific = explainInference(item, right);
      break;
    case 'register':
      specific = explainRegister(item, right);
      break;
    case 'reading':
      specific = explainReading(item, right);
      break;
  }

  const intro = KIND_INTRO[item.kind];
  if (specific) return `${intro}\n\n${specific}`;
  return `${intro}\n\nLa forme exacte attendue est **${right}**.\nMéthode : isolez le mot-clé de la phrase (temps, préposition, collocation, quantifieur, registre). Les trois distracteurs cassent soit la grammaire, soit le sens.`;
}
