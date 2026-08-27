import { CULTURE_MORE } from '@/lib/exercises/cultureAviationMore';

export type CultureKind =
  | 'air-france'
  | 'flotte'
  | 'pionniers'
  | 'histoire'
  | 'records'
  | 'aeroports'
  | 'navigation';

export interface CultureItem {
  stem: string;
  choices: [string, string, string, string];
  correct: number;
  kind: CultureKind;
  explain: string;
}

export const CULTURE_KIND_LABELS: Record<CultureKind, string> = {
  'air-france': 'Air France',
  flotte: 'Flotte et moteurs',
  pionniers: 'Pionniers',
  histoire: 'Histoire de l\'aviation',
  records: 'Records et premiers',
  aeroports: 'Aéroports et géographie',
  navigation: 'Repères (lat/lon, codes)',
};

type Apt = {
  iata: string;
  icao: string;
  city: string;
  country: string;
  name: string;
  lat: number;
  lon: number;
};

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function fmtLat(lat: number): string {
  return `${Math.abs(lat).toFixed(1).replace('.', ',')}° ${lat >= 0 ? 'N' : 'S'}`;
}

function fmtLon(lon: number): string {
  return `${Math.abs(lon).toFixed(1).replace('.', ',')}° ${lon >= 0 ? 'E' : 'O'}`;
}

function item(
  stem: string,
  correct: string,
  wrong: [string, string, string],
  kind: CultureKind,
  explain: string,
): CultureItem {
  return { stem, choices: [correct, ...wrong], correct: 0, kind, explain };
}

function pick3(correct: string, pool: string[]): [string, string, string] {
  const uniq = [...new Set(pool.filter((x) => x && x !== correct))];
  const mixed = shuffle(uniq);
  while (mixed.length < 3) mixed.push(`(autre) ${mixed.length}`);
  return [mixed[0], mixed[1], mixed[2]];
}

function shuffleItem(q: CultureItem): CultureItem {
  const indexed = q.choices.map((choice, i) => ({ choice, i }));
  const shuffled = shuffle(indexed);
  const correct = shuffled.findIndex((x) => x.i === q.correct);
  return {
    ...q,
    choices: shuffled.map((x) => x.choice) as [string, string, string, string],
    correct,
  };
}

/** Chiffres publics 2025-2026 : corporate AF + flotte Wikipedia (juillet 2026). Les effectifs bougent : les questions le rappellent. */
const AF_HAND: CultureItem[] = [
  item('Quel est le code IATA d\'Air France ?', 'AF', ['KL', 'AH', 'TO'], 'air-france', 'IATA à 2 lettres : **AF**. KLM = KL, Air Algérie = AH, Transavia = TO / HV selon le certificat.'),
  item('Quel est le code OACI d\'Air France ?', 'AFR', ['AFA', 'AFL', 'FRN'], 'air-france', 'OACI à 3 lettres : **AFR**. L\'indicatif radio est AIRFRANS.'),
  item('Quel est l\'indicatif radio (callsign) d\'Air France ?', 'AIRFRANS', ['FRENCH BIRD', 'SPEEDBIRD', 'KLIM'], 'air-france', 'Callsign **AIRFRANS**. SPEEDBIRD = British Airways.'),
  item('En quelle année Air France a-t-elle été créée (fusion des compagnies antérieures) ?', '1933', ['1919', '1945', '2004'], 'air-france', '**30 août 1933** : fusion d\'Air Orient, Air Union, CIDNA et SGTA (Farman). 2004 = fusion du groupe avec KLM.'),
  item('Quel jour exact est considérée comme la date de création d\'Air France ?', '30 août 1933', ['7 octobre 1919', '5 mai 2004', '22 juin 2000'], 'air-france', '**30 août 1933**. 1919 = Lignes aériennes Latécoère. 2004 = Air France-KLM. 2000 = SkyTeam.'),
  item('De quelle alliance Air France est-elle membre fondateur ?', 'SkyTeam', ['Star Alliance', 'Oneworld', 'Vanilla Alliance'], 'air-france', '**SkyTeam** (2000), avec Aeroméxico, Delta, Korean Air notamment. Star = Lufthansa / United / Air Canada… Oneworld = BA / AA / Qantas…'),
  item('Quel est le programme de fidélité d\'Air France-KLM ?', 'Flying Blue', ['Miles & More', 'Executive Club', 'MileagePlus'], 'air-france', '**Flying Blue**. Miles & More = Lufthansa. Executive Club = BA. MileagePlus = United.'),
  item('Quel est le hub principal d\'Air France ?', 'Paris-Charles de Gaulle (CDG)', ['Paris-Orly uniquement', 'Lyon-Saint-Exupéry', 'Amsterdam-Schiphol'], 'air-france', 'Hub long-courrier : **CDG** (Roissypôle). Orly reste un socle moyen-courrier / outre-mer. Schiphol est le hub **KLM**.'),
  item('Où se trouve le siège social d\'Air France ?', 'Tremblay-en-France (Roissypôle, CDG)', ['La Défense', 'Orly Sud', 'Amsterdam'], 'air-france', 'Siège à **Tremblay-en-France**, ensemble Roissypôle, aéroport CDG.'),
  item('Qui est la directrice générale d\'Air France (2026) ?', 'Anne Rigail', ['Benjamin Smith', 'Jean-Marc Natali', 'Carsten Spohr'], 'air-france', '**Anne Rigail** dirige Air France. **Benjamin Smith** est PDG d\'Air France-KLM. Spohr = Lufthansa.'),
  item('Qui est le PDG du groupe Air France-KLM (2026) ?', 'Benjamin Smith', ['Anne Rigail', 'Pieter Elbers', 'Guillaume Faury'], 'air-france', '**Benjamin Smith** (groupe). Anne Rigail = Air France. Faury = Airbus.'),
  item('En quelle année le groupe Air France-KLM a-t-il été formé ?', '2004', ['1933', '1999', '2013'], 'air-france', 'Fusion **2004** (annonce 2003, réalisation 2004). Hop naît en 2013.'),
  item('Quelle est la filiale régionale d\'Air France ?', 'Air France Hop', ['Air France Cargo seulement', 'KLM Cityhopper', 'Brit Air indépendante'], 'air-france', '**Hop!** (Air France Hop), née en 2013 de Regional, Brit Air et Airlinair. KLM Cityhopper est KLM.'),
  item('Quelle est la filiale low-cost d\'Air France opérant depuis la France ?', 'Transavia France', ['easyJet', 'Vueling', 'Ryanair'], 'air-france', '**Transavia France** (détenue par le groupe). easyJet / Ryanair / Vueling sont des concurrentes.'),
  item('Combien d\'employés Air France revendique-t-elle dans sa présentation corporate 2026 ?', 'Environ 37 000', ['Environ 8 000', 'Environ 120 000', 'Environ 2 000'], 'air-france', 'Chiffre corporate **~37 000** employés Air France (2026). Le groupe AF-KLM est plus large. Les effectifs varient d\'une année sur l\'autre.'),
  item('Au 31 décembre 2025, combien d\'avions le groupe Air France (dont Hop) annonce-t-il ?', '268', ['120', '400', '58'], 'air-france', 'Corporate : **268** appareils au 31/12/2025 **y compris Hop**. La flotte « mainline » seule est plus petite (~228 mi-2026 selon Wikipedia).'),
  item('Air France exerce principalement combien d\'activités citées par l\'entreprise ?', 'Trois : passagers, cargo, maintenance', ['Une seule : passagers', 'Cinq y compris l\'hôtellerie', 'Deux : passagers et rail'], 'air-france', 'Corporate : **transport de passagers, cargo, et maintenance** (AFI KLM E&M).'),
  item('Quel est le nom de la division cargo du groupe ?', 'Air France KLM Martinair Cargo', ['Air France Express', 'Postale de nuit', 'SkyCargo'], 'air-france', '**Air France KLM Martinair Cargo**, hubs CDG et Schiphol. SkyCargo = Emirates.'),
  item('La classe long-courrier la plus exclusive d\'Air France s\'appelle :', 'La Première', ['La Suite', 'First Wing', 'Concorde Club'], 'air-france', '**La Première** (surtout 777-300ER configurés). Ce n\'est pas sur toute la flotte.'),
  item('Combien de vols par jour Air France met-elle en avant (ordre de grandeur corporate 2026) ?', 'Plus de 800', ['Environ 80', 'Environ 8 000', 'Une dizaine'], 'air-france', 'Corporate : **800+** vols par jour (ordre de grandeur, réseau + Hop).'),
  item('Air France Hop vole surtout sur quel type d\'appareil (années 2020) ?', 'Embraer E-Jets (E170 / E190)', ['ATR 72 uniquement', 'Airbus A220', 'Boeing 737 MAX'], 'flotte', 'Hop : **Embraer 170/190**. Les A220 sont **mainline** Air France. Transavia : 737.'),
  item('Transavia France vole principalement sur :', 'Boeing 737', ['Airbus A320', 'Embraer 190', 'A350'], 'flotte', 'Transavia : **737** (dont MAX selon livraisons). Pas d\'A350.'),
  item('Combien d\'Airbus A220-300 Air France a-t-elle en ligne (flotte publique, été 2026) ?', '58', ['4', '10', '114'], 'flotte', 'Wikipedia flotte (juillet 2026) : **58 A220-300** (plus des commandes). Ils remplacent A318/A319. Les chiffres bougent à chaque livraison.'),
  item('Combien d\'Airbus A318 restait-il chez Air France (été 2026) ?', '4 — dernier exploitant commercial', ['Aucun, tous retirés en 2015', '40', '58'], 'flotte', '**4 A318**, et Air France est citée comme **dernier exploitant** commercial du type. Remplacement par A220.'),
  item('Combien d\'A319 restait-il chez Air France (été 2026) ?', '1 (en cours de retrait)', ['20', '58', 'Aucun depuis 2010'], 'flotte', 'Il n\'en restait **qu\'un** dans le tableau 2026, en retrait au profit des A220.'),
  item('Combien d\'A320-200 (ordre de grandeur, été 2026) chez Air France ?', 'Une trentaine (≈ 36)', ['2', '90', '0, tous A321'], 'flotte', 'Environ **36 A320-200** (table juillet 2026). Pas toute la famille A320 : A318/319/321 à part.'),
  item('Combien d\'A321-200 (ordre de grandeur, été 2026) chez Air France ?', '8', ['58', '43', '0'], 'flotte', 'Le tableau public de juillet 2026 recense **8 A321-200** chez Air France, à part des A320 et des A220.'),
  item('Combien d\'A330-200 restait-il (été 2026) ?', '6, retrait annoncé pour début 2027', ['42', '0 depuis AF447', '30'], 'flotte', '**6 A330-200**, remplacement par A350, retrait visé **début 2027**. Un A330 a été perdu sur AF447 (2009).'),
  item('Combien d\'A350-900 (ordre de grandeur, été 2026) chez Air France ?', 'Une quarantaine (≈ 42)', ['3', '10', '0, seulement des commandes'], 'flotte', 'Environ **42 A350-900** en service mi-2026, plus des commandes (dont A350-1000 à venir).'),
  item('Combien de Boeing 777-200ER (été 2026) ?', '18, à remplacer par des A350', ['43', '2 cargo seulement', '58'], 'flotte', '**18 B777-200ER**, destinés à être remplacés par A350-900/1000.'),
  item('Combien de Boeing 777-300ER (été 2026) ?', 'Une quarantaine (≈ 43)', ['10', '2', '90'], 'flotte', 'Le **777-300ER** est le pilier long-courrier (≈ **43**). Air France en a été client de lancement.'),
  item('Combien de Boeing 787-9 chez Air France (été 2026) ?', '10', ['43', '58', '0'], 'flotte', '**10 B787-9**. Moins nombreux que les 777-300ER.'),
  item('Combien de 777 cargo (777F) chez Air France Cargo (été 2026) ?', '2', ['10', '0', '43'], 'flotte', '**2 Boeing 777F** (client de lancement), à terme remplacés par l\'A350F.'),
  item('Quel moteur équipe l\'A220-300 d\'Air France ?', 'Pratt & Whitney PW1500G', ['CFM56-5B', 'Trent XWB', 'GE90-115B'], 'flotte', 'A220 : turbofan à engrenages **PW1500G**. CFM56 = A320ceo. Trent XWB = A350. GE90-115B = 777-300ER.'),
  item('Quel moteur équipe typiquement les A320ceo d\'Air France ?', 'CFM International CFM56-5B', ['PW1500G', 'GEnx', 'Trent 700'], 'flotte', 'Les A320/A321 **ceo** AF : **CFM56-5B**. Les A220 ont des PW1500G. Les LEAP sont une autre génération (neo), pas le cœur historique AF.'),
  item('Quel moteur équipe l\'A350-900 ?', 'Rolls-Royce Trent XWB', ['GE90', 'PW4000', 'CF6-80'], 'flotte', 'A350 : exclusivement **Trent XWB** (XWB-84 sur le -900).'),
  item('Quel moteur équipe le Boeing 777-300ER ?', 'General Electric GE90-115B', ['Trent XWB', 'CFM56', 'PW1500G'], 'flotte', '777-300ER : **GE90-115B**, l\'un des plus puissants turbofans civils. Le 777-200ER AF est plutôt en GE90-94B.'),
  item('Quel moteur équipe le Boeing 777-200ER d\'Air France ?', 'GE90-94B', ['GE90-115B', 'Trent 800', 'GEnx'], 'flotte', '777-200ER : **GE90-94B** (moins puissant que le -115B du -300ER).'),
  item('Quel moteur équipe le 787-9 d\'Air France ?', 'GE GEnx-1B', ['Trent 1000 uniquement', 'GE90', 'PW1500G'], 'flotte', 'Les 787 AF sont en **GEnx**. Le Trent 1000 équipe d\'autres compagnies, pas cette flotte AF.'),
  item('Quel moteur équipe typiquement les A330-200 d\'Air France ?', 'General Electric CF6-80E1', ['Trent XWB', 'GE90-115B', 'PW1500G'], 'flotte', 'A330-200 AF : **CF6-80E1** (certains A330 dans le monde ont PW4000 ou Trent 700 — pas le cas type AF).'),
  item('Air France a-t-elle encore des A380 en 2026 ?', 'Non, retirés en 2020', ['Oui, 10 appareils', 'Oui, en cargo', 'Seulement en wet-lease'], 'flotte', 'Les **10 A380** ont été retirés **en 2020** (Covid), remplacés dans le rôle par l\'A350.'),
  item('Air France a-t-elle encore des Boeing 747 passagers ?', 'Non, 747-400 passagers retirés en 2016', ['Oui, 4 Combi', 'Oui, 747-8', 'Seulement un 747 présidentiel'], 'flotte', 'Derniers **747-400** passagers : **2016**. Les 747 cargo ont suivi un calendrier un peu différent (retirés vers 2015).'),
  item('Quand Air France a-t-elle retiré le Concorde ?', '2003', ['1976', '2000', '1993'], 'flotte', 'Vols commerciaux Concorde AF **1976-2003**. L\'accident du F-BTSC (AF4590) a lieu le **25 juillet 2000** ; l\'arrêt définitif est **2003**.'),
  item('Combien de Concorde Air France a-t-elle exploités au total ?', '7', ['2', '16', '1'], 'flotte', '**7** Concorde AF (dont le F-BTSC perdu à Gonesse). BA en a exploité 7 aussi.'),
  item('Quel appareil a effectué le premier vol commercial Concorde Air France / BA ?', 'Concorde, 21 janvier 1976', ['A300, 1974', 'Boeing 707, 1959', 'Caravelle, 1959'], 'histoire', '**21 janvier 1976** : AF Paris-Dakar-Rio et BA Londres-Bahreïn.'),
  item('Quel long-courrier Air France a-t-elle retiré en 2020 avec l\'A380 ?', 'Airbus A340-300', ['Boeing 787', 'A350', 'A220'], 'flotte', 'Les **A340-300** (quadri Airbus) partent en **2020**. AF en avait été cliente de lancement en 1993.'),
  item('Air France a-t-elle été cliente de lancement du 777-300ER ?', 'Oui', ['Non, c\'était Emirates', 'Non, c\'était KLM', 'Non, c\'était Cathay'], 'flotte', '**Oui**, AF est **launch customer** du 777-300ER (mise en service 2004).'),
  item('Quel appareil cargo doit à terme remplacer les 777F chez Air France ?', 'Airbus A350F', ['A330-200F', '747-8F', 'A400M'], 'flotte', 'Commandes d\'**A350F** pour remplacer les 777F.'),
  item('Combien de types long-courrier passagers distincts Air France aligne-t-elle encore (2026) : A330, A350, 777, 787 ?', 'Quatre familles', ['Deux : A350 et 787 seulement', 'Un seul : 777', 'Six y compris A380 et 747'], 'flotte', 'Encore **A330** (fin de vie), **A350**, **777** (200ER + 300ER) et **787-9**. Plus d\'A380 ni de 747 passagers.'),
  item('Quel court/moyen-courrier remplace surtout les A318 et A319 ?', 'Airbus A220-300', ['Embraer 190 de Hop', 'A350-900', '737 MAX de Transavia'], 'flotte', 'L\'**A220-300** (148 sièges chez AF) remplace A318/A319 plus anciens et plus gourmands.'),
  item('Combien de sièges (config AF typique) sur l\'A220-300 ?', '148', ['292', '131', '472'], 'flotte', 'Config AF **148** en une classe. 131 ≈ A318. 292 ≈ un A350. 472 = une config très dense de 777.'),
  item('Le vol AF447 (1er juin 2009) était opéré sur quel type ?', 'Airbus A330-200', ['A340', '747-400', 'Concorde'], 'histoire', '**A330-200** Rio-Paris, accident dans l\'Atlantique. Facteurs : sondes Pitot, décrochage, perte de contrôle.'),
  item('Le Concorde AF4590 s\'est écrasé à :', 'Gonesse, le 25 juillet 2000', ['Rio, 2009', 'Ténérife, 1977', 'Habsheim, 1988'], 'histoire', '**AF4590**, 25 juillet 2000, Gonesse, peu après le décollage de CDG, vers New York.'),
  item('Quel crash d\'A320 AF a lieu à Habsheim en 1988 ?', 'AF296Q, présentation à basse hauteur', ['AF447', 'AF4590', 'AF358 Toronto'], 'histoire', '**AF296Q** (A320-100) à Habsheim, 26 juin 1988, vol de démonstration.'),
];

const PIONEERS: CultureItem[] = [
  item('Qui réalise le premier vol motorisé généralement retenu (17 décembre 1903) ?', 'Orville et Wilbur Wright', ['Clément Ader', 'Santos-Dumont', 'Blériot'], 'pionniers', '**Wright Flyer**, Kitty Hawk, **17 décembre 1903**. Ader a pu décoller avant, mais le premier vol **contrôlé, motorisé, répété** retenu internationalement est celui des Wright.'),
  item('Où a lieu le premier vol Wright de 1903 ?', 'Kitty Hawk, Caroline du Nord', ['Le Bourget', 'Pau', 'Bagatelle'], 'pionniers', '**Kill Devil Hills / Kitty Hawk**. Bagatelle = Santos-Dumont 1906. Le Bourget = salon et atterrissage de Lindbergh.'),
  item('Qui traverse la Manche en aéroplane le 25 juillet 1909 ?', 'Louis Blériot', ['Roland Garros', 'Jules Védrines', 'Pegoud'], 'pionniers', '**Blériot XI**, Calais-Douvres, **25 juillet 1909**. Prix du Daily Mail.'),
  item('Qui relie New York à Paris en solitaire sans escale les 20-21 mai 1927 ?', 'Charles Lindbergh', ['Costes et Bellonte', 'Nungesser et Coli', 'Amelia Earhart'], 'pionniers', '**Spirit of St. Louis**, Ryan NYP. Atterrissage au **Bourget**. Nungesser et Coli avaient disparu en tentant l\'inverse 12 jours plus tôt.'),
  item('Quel appareil pilote Lindbergh en 1927 ?', 'Spirit of St. Louis', ['Point d\'Interrogation', 'Oiseau Blanc', 'Southern Cross'], 'pionniers', '**Spirit of St. Louis**. Point d\'Interrogation = Costes/Bellonte. Oiseau Blanc = Nungesser/Coli.'),
  item('Qui réussit le premier Paris-New York sans escale (1er-2 septembre 1930) ?', 'Dieudonné Costes et Maurice Bellonte', ['Lindbergh', 'Mermoz et Guillaumet', 'Nungesser et Coli'], 'pionniers', 'Breguet 19 **Point d\'Interrogation**, Le Bourget → New York. C\'est l\'inverse de Lindbergh, plus difficile (vents d\'ouest).'),
  item('Comment s\'appelle l\'avion de Costes et Bellonte ?', 'Point d\'Interrogation', ['Arc-en-Ciel', 'Croix du Sud', 'Oiseau Canari'], 'pionniers', '**Point d\'Interrogation** (Breguet 19). Arc-en-Ciel = Mermoz. Croix du Sud = hydravion Latécoère de Mermoz.'),
  item('Nungesser et Coli disparaissent en 1927 à bord de :', 'L\'Oiseau Blanc', ['Le Spirit of St. Louis', 'La Croix du Sud', 'L\'Éole'], 'pionniers', 'Levasseur PL.8 **Oiseau Blanc**, tentative Paris-New York, **8 mai 1927**.'),
  item('Clément Ader fait décoller l\'Éole le :', '9 octobre 1890', ['17 décembre 1903', '25 juillet 1909', '21 mai 1927'], 'pionniers', '**Éole**, 9 octobre 1890, Armainvilliers : bond motorisé souvent cité en France, sans être le vol contrôlé Wright.'),
  item('Santos-Dumont vole au Bois de Boulogne (Bagatelle) en :', '1906 (14-bis)', ['1890', '1903', '1909'], 'pionniers', '**14-bis**, 23 octobre 1906 : premier vol public en Europe largement reconnu.'),
  item('Qui est l\'aviateur de l\'Aéropostale mort en 1936 à bord de la Croix du Sud ?', 'Jean Mermoz', ['Henri Guillaumet', 'Antoine de Saint-Exupéry', 'Didier Daurat'], 'pionniers', '**Jean Mermoz**, 7 décembre 1936, Latécoère 300 **Croix du Sud**, Atlantique sud.'),
  item('Henri Guillaumet est célèbre pour :', 'sa survie après un crash dans les Andes (1930)', ['le premier tour du monde en solitaire', 'le 14-bis', 'le Concorde'], 'pionniers', 'Potez 25, **13 juin 1930**, Andes. « Ce que j\'ai fait, je te le jure, aucune bête ne l\'aurait fait. » (Saint-Exupéry, Terre des hommes).'),
  item('Antoine de Saint-Exupéry disparaît en vol le :', '31 juillet 1944', ['7 décembre 1936', '13 juin 1930', '25 juillet 2000'], 'pionniers', 'Mission de reconnnaissance, **P-38 Lightning**, Méditerranée, **31 juillet 1944**. Épave identifiée en 2000-2004.'),
  item('Les Lignes aériennes Latécoère sont créées en :', '1918', ['1933', '1927', '1909'], 'pionniers', '**Pierre-Georges Latécoère**, 1918, Toulouse. Deviennent **Aéropostale** en 1927 (Marcel Bouilloux-Lafont).'),
  item('L\'Aéropostale prend ce nom en :', '1927', ['1918', '1933', '1945'], 'pionniers', '**1927**. Rachetée ensuite dans le giron qui mènera vers Air France (1933).'),
  item('Qui dirige l\'exploitation de l\'Aéropostale à Toulouse, figure du « chef » ?', 'Didier Daurat', ['Jean Mermoz', 'Marcel Dassault', 'Georges Guynemer'], 'pionniers', '**Didier Daurat**, directeur d\'exploitation, figure de Vol de nuit / Courrier sud.'),
  item('Adrienne Bolland est la première femme à :', 'franchir les Andes en avion (1921)', ['traverser l\'Atlantique nord en solitaire', 'piloter le Concorde', 'voler dans l\'espace'], 'pionniers', '**1er avril 1921**, Caudron G.3, Mendoza-Santiago.'),
  item('Hélène Boucher est :', 'une aviatrice française, records des années 1930, morte en 1934', ['la première hôtesse AF', 'une ingénieur Concorde', 'la fondatrice d\'Air France'], 'pionniers', 'Records de vitesse ; accident à Guyancourt le **30 novembre 1934**.'),
  item('Maryse Bastié est connue pour :', 'des records de distance et de durée dans les années 1930', ['le 14-bis', 'AF447', 'le premier 747 AF'], 'pionniers', 'Aviatrice française, records dont Dakar-Natal, figure majeure de l\'entre-deux-guerres.'),
  item('Roland Garros est le premier à :', 'traverser la Méditerranée en avion (1913)', ['traverser la Manche', 'atteindre Mach 1', 'relier Paris-New York'], 'pionniers', '**23 septembre 1913**, Saint-Raphaël-Bizerte. La Manche = Blériot 1909.'),
  item('Adolphe Pégoud est célèbre pour :', 'les premières figures de voltige (looping, 1913)', ['le Concorde', 'l\'Aéropostale', 'Kitty Hawk'], 'pionniers', 'Parmi les premiers à faire le **looping** et le vol inversé, 1913.'),
  item('Henri Farman réalise en 1908 :', 'le premier vol aller-retour d\'un kilomètre (prix Deutsch-Archdeacon)', ['la traversée de l\'Atlantique', 'le premier hélicoptère', 'le premier réacteur'], 'pionniers', '**13 janvier 1908**, Issy-les-Moulineaux, 1 km circuit fermé.'),
  item('Louis Blériot est aussi un :', 'constructeur (Blériot Aéronautique)', ['motoriste américain', 'PDG d\'Air France en 1933', 'inventeur du radar'], 'pionniers', 'Industriel : usines, types XI, etc., pas seulement le raid de 1909.'),
  item('Le premier homme dans l\'espace est :', 'Youri Gagarine, 12 avril 1961', ['Neil Armstrong, 1969', 'Alan Shepard, 1961', 'Jean-Loup Chrétien, 1982'], 'pionniers', '**Vostok 1**, **12 avril 1961**. Shepard = premier Américain (5 mai 1961, suborbital). Armstrong = Lune.'),
  item('Le premier pas sur la Lune a lieu le :', '20 juillet 1969', ['12 avril 1961', '4 octobre 1957', '16 juillet 1969'], 'pionniers', '**Apollo 11**, alunissage **20 juillet 1969**. Décollage le 16. Spoutnik = 4 oct. 1957.'),
  item('Qui franchit le mur du son le 14 octobre 1947 ?', 'Chuck Yeager', ['André Turcat', 'Jacqueline Auriol', 'Neil Armstrong'], 'records', 'Bell **X-1**, Muroc (Edwards). Turcat = essais Concorde. Jacqueline Auriol = records sur Mystère.'),
  item('André Turcat est :', 'pilote d\'essais, premier vol du Concorde (1969)', ['PDG d\'Airbus', 'inventeur du turboréacteur', 'navigateur d\'AF447'], 'pionniers', '**2 mars 1969**, Toulouse, Concorde 001. Brian Trubshaw pour le prototype britannique.'),
  item('Jacqueline Auriol est :', 'aviatrice d\'essais, records de vitesse à réaction', ['première PNF d\'Air France', 'concepteure de l\'A380', 'hôtesse du Concorde'], 'pionniers', 'Pilote d\'essais française, plusieurs records dans les années 1950 (Mystère IV, etc.).'),
  item('Jean-Loup Chrétien est :', 'le premier Français dans l\'espace (1982)', ['le premier Européen sur la Lune', 'le PDG du CNES en 1961', 'le copilote d\'AF447'], 'pionniers', '**Soyouz T-6**, 24 juin 1982.'),
  item('Amelia Earhart traverse l\'Atlantique en solitaire en :', '1932', ['1927', '1930', '1937'], 'pionniers', '**20-21 mai 1932**, Harbour Grace → Irlande. Elle disparaît en 1937 dans le Pacifique.'),
  item('Igor Sikorsky est associé à :', 'l\'hélicoptère moderne et aux hydravions géants', ['le turboréacteur', 'le Concorde', 'l\'Aéropostale'], 'pionniers', 'VS-300 (1939-41), puis R-4. Aussi commandant d\'hydravions (Clipper).'),
  item('Frank Whittle et Hans von Ohain sont liés à :', 'l\'invention du turboréacteur', ['le premier ULM', 'le GPS', 'le transpondeur'], 'pionniers', 'Réacteur : **Whittle** (GB) et **von Ohain** (Allemagne), fin des années 1930.'),
  item('Le De Havilland Comet est :', 'le premier jet de ligne commercial (1952)', ['le premier A320', 'un Concorde britannique', 'un hydravion de l\'Aéropostale'], 'histoire', '**BOAC**, 1952. Accidents de fatigue → leçon majeure. AF a brièvement eu des Comet (1953-54).'),
  item('La Caravelle (Sud Aviation) entre en service chez Air France en :', '1959', ['1952', '1969', '1976'], 'histoire', '**1959**. Réacteurs à l\'arrière, icône moyen-courrier. Retrait AF 1981.'),
  item('Le Boeing 707 arrive chez Air France en :', '1959', ['1946', '1969', '1991'], 'histoire', '**1959**, premier long-courrier à réaction AF (avec la Caravelle côté moyen-courrier).'),
  item('Le premier Airbus d\'Air France est :', 'l\'A300 (1974)', ['l\'A320 (1988)', 'l\'A380 (2009)', 'l\'A220 (2021)'], 'histoire', 'AF est cliente de lancement de l\'**A300**, 1974.'),
  item('L\'A320 d\'Airbus est mis en service (monde) en :', '1988 (Air France cliente de lancement)', ['1974', '2009', '1969'], 'histoire', '**1988**, sidestick, commandes de vol électriques — AF launch customer (vol Habsheim la même année).'),
  item('Le premier A380 Air France entre en ligne en :', '2009', ['2005 (premier vol)', '2020', '1993'], 'histoire', 'Premier vol A380 = **2005** (Toulouse). Mise en ligne AF **2009**. Retrait 2020.'),
  item('Le premier A350 Air France est livré en :', '2016', ['2009', '2020', '1993'], 'histoire', 'Premier A350-900 AF : **septembre 2016** (F-WTOM / F-HTEI selon immat d\'essais vs ligne).'),
];

const RECORDS: CultureItem[] = [
  item('Le premier tour du monde sans escale sans ravitaillement (avion) est réalisé en :', '1986, Rutan Voyager (Rutan / Yeager)', ['1969, Apollo', '2002, Fossett seul en ballon', '2016, Solar Impulse'], 'records', '**Voyager**, Dick Rutan et Jeana Yeager, décembre 1986, 9 jours. Fossett = ballon solo 2002. Solar Impulse = solaire, avec escales.'),
  item('Solar Impulse 2 termine son tour du monde solaire en :', '2016 (Borschberg / Piccard)', ['1986', '1969', '1933'], 'records', 'Bertrand Piccard et André Borschberg, 2015-2016.'),
  item('Le premier vol d\'un avion à réaction a lieu en :', '1939 (Heinkel He 178)', ['1947 (X-1)', '1952 (Comet)', '1969 (Concorde)'], 'records', '**He 178**, 27 août 1939, von Ohain. Le X-1 = Mach 1. Comet = jet de ligne. Concorde = premier vol 1969.'),
  item('Le premier hélicoptère vraiment opérationnel largement produit est :', 'le Sikorsky R-4 (années 1940)', ['l\'Alouette II dès 1907', 'le Concorde', 'l\'A380'], 'records', 'Cornu 1907 est un bond. L\'**R-4** est le premier hélicoptère de série / militaire utile.'),
  item('L\'Alouette II de Sud-Aviation est le premier hélicoptère :', 'turbine de série (1955-56)', ['à dépasser Mach 1', 'électrique', 'sans pilote'], 'records', '**Artouste**, premier hélicoptère à turbine produit en série.'),
  item('Le record d\'altitude avion (ordre de grandeur SR-71 / MiG-25 / X-15) culmine avec :', 'le North American X-15 (plus de 80 km pour certains vols)', ['un A320', 'un 747', 'un Cessna 172'], 'records', 'Le **X-15** a dépassé 80 km (vol spatial selon la définition USAF). Un avion de ligne reste vers 12 km (FL390).'),
  item('Un niveau de vol FL380 correspond environ à :', '38 000 pieds', ['380 mètres', '3 800 mètres', '380 000 pieds'], 'navigation', '**FL380** = 380 × 100 ft = **38 000 ft** ≈ 11 600 m, calage 1013 hPa.'),
  item('Le méridien origine (longitude 0°) passe par :', 'Greenwich', ['Paris (Observatoire)', 'New York', 'CDG'], 'navigation', '**Greenwich**. Le méridien de Paris a été utilisé historiquement en France, plus pour la navigation mondiale actuelle.'),
  item('L\'équateur est la ligne de :', 'latitude 0°', ['longitude 0°', 'latitude 90°', 'longitude 180°'], 'navigation', '**Latitude 0°**. Les pôles = 90° N/S. Greenwich = longitude 0°.'),
  item('Une latitude 49° N signifie :', 'dans l\'hémisphère nord, à 49° de l\'équateur', ['49° à l\'est de Greenwich', 'au pôle nord', 'sous l\'équateur'], 'navigation', 'Latitude = nord/sud par rapport à l\'équateur. 49° N ≈ Paris / CDG.'),
  item('Une longitude 2° E signifie :', 'un peu à l\'est de Greenwich (cas de Paris)', ['2° au nord de l\'équateur', 'à l\'ouest des États-Unis', 'au méridien 180°'], 'navigation', 'Paris / CDG ≈ **2,5° E**. New York est en longitude **ouest**.'),
  item('Le tropique du Cancer est à environ :', '23,4° N', ['0°', '66,6° N', '90° N'], 'navigation', '**≈ 23,4° N**. Capricorne = 23,4° S. Cercles polaires ≈ 66,6°.'),
  item('Le cercle polaire arctique est à environ :', '66,6° N', ['23° N', '49° N', '0°'], 'navigation', 'Au-delà, nuit / jour polaires. 49° N = France métropolitaine.'),
  item('1 degré de latitude vaut environ :', '111 km', ['1 km', '1 852 km', '10 km'], 'navigation', '**≈ 111 km** (40 000 km / 360). Un mille nautique = 1 852 m = 1 minute de latitude.'),
  item('Un mille nautique vaut :', '1 852 m', ['1 000 m', '1 609 m', '1 000 pieds'], 'navigation', '**1 852 m** = 1 minute d\'arc de latitude. Le mille terrestre US ≈ 1 609 m.'),
  item('Un nœud est :', '1 mille nautique par heure', ['1 km/h', '1 m/s', '100 ft/min'], 'navigation', '**kt** = NM/h. 250 kt ≈ 463 km/h.'),
  item('Le QNH est :', 'le calage altimétrique pour lire l\'altitude par rapport au niveau de la mer', ['une fréquence radio', 'un code IATA', 'un type de moteur'], 'navigation', '**QNH** : altimètre = altitude AMSL. **QFE** = hauteur / terrain. **QNE** = 1013, niveau de vol.'),
  item('Le code IATA a combien de lettres ?', '3 (aéroports) ou 2 (compagnies)', ['4 toujours', '5', '1'], 'navigation', 'Aéroport **3** lettres (CDG). Compagnie **2** (AF). OACI aéroport = **4** (LFPG).'),
  item('Le code OACI d\'un aéroport a :', '4 lettres', ['2 lettres', '3 lettres', '6 chiffres'], 'navigation', '**LFPG**, EGLL, KJFK. Le préfixe L = Europe du sud / France, E = Europe du nord, K = USA continentaux, etc.'),
  item('Le préfixe OACI « LF » désigne :', 'la France métropolitaine', ['le Royaume-Uni', 'l\'Allemagne', 'les États-Unis'], 'navigation', '**LF** = France. EG = UK, ED = Allemagne, K = USA (sans préfixe région à 2 lettres de la même façon : KJFK).'),
  item('Le préfixe OACI « EG » désigne :', 'le Royaume-Uni', ['la France', 'l\'Espagne', 'l\'Irlande seulement'], 'navigation', '**EG** = UK (EGLL Heathrow). EI = Irlande. LE = Espagne.'),
  item('Un numéro de piste 27 indique un QFU proche de :', '270° (ouest)', ['027°', '90°', '180°'], 'navigation', 'Deux chiffres = cap magnétique / 10. **27** ≈ 270° = face à l\'ouest. 09 = 090° = est.'),
  item('Deux pistes parallèles 26L et 26R : le L signifie :', 'Left (gauche) pour un avion en approche dans ce sens', ['Longue', 'Landing only', 'Low visibility'], 'navigation', '**L / C / R** = Left / Centre / Right vus dans le sens du QFU.'),
];

const AIRLINES: CultureItem[] = [
  item('Le code IATA de KLM est :', 'KL', ['AF', 'BA', 'LH'], 'air-france', '**KL**. Groupe AF-KLM, alliance SkyTeam, hub Schiphol (AMS / EHAM).'),
  item('Le code IATA de British Airways est :', 'BA', ['UK', 'VS', 'EI'], 'histoire', '**BA**, Oneworld, callsign SPEEDBIRD, hub Heathrow.'),
  item('Le code IATA de Lufthansa est :', 'LH', ['DLH', 'DE', 'OS'], 'histoire', '**LH**, Star Alliance, hub Francfort. OACI = DLH.'),
  item('Le code IATA de Delta Air Lines est :', 'DL', ['DA', 'AA', 'UA'], 'histoire', '**DL**, SkyTeam, partenaire historique d\'AF. AA = American, UA = United.'),
  item('Le code IATA d\'American Airlines est :', 'AA', ['US', 'DL', 'AS'], 'histoire', '**AA**, Oneworld.'),
  item('Le code IATA d\'United est :', 'UA', ['US', 'DL', 'NW'], 'histoire', '**UA**, Star Alliance.'),
  item('Le code IATA d\'Emirates est :', 'EK', ['QR', 'EY', 'SV'], 'histoire', '**EK**, Dubaï (DXB). QR = Qatar, EY = Etihad, SV = Saudia.'),
  item('Le code IATA de Qatar Airways est :', 'QR', ['EK', 'QF', 'AT'], 'histoire', '**QR**, Oneworld, hub Hamad (DOH). QF = Qantas.'),
  item('Le code IATA d\'Air Canada est :', 'AC', ['CA', 'TS', 'WS'], 'histoire', '**AC**, Star Alliance. CA = Air China.'),
  item('Le code IATA d\'Iberia est :', 'IB', ['I2', 'UX', 'VY'], 'histoire', '**IB**, Oneworld, groupe IAG avec BA. UX = Air Europa, VY = Vueling.'),
  item('Le code IATA d\'Alitalia / ITA Airways est :', 'AZ', ['IT', 'AP', 'XM'], 'histoire', 'Historiquement **AZ** (Alitalia puis ITA).'),
  item('Le code IATA de Swiss est :', 'LX', ['SZ', 'OS', 'SK'], 'histoire', '**LX**, Star, groupe Lufthansa. OS = Austrian, SK = SAS.'),
  item('Le code IATA de Ryanair est :', 'FR', ['RN', 'RK', 'EI'], 'histoire', '**FR**. EI = Aer Lingus. Low-cost, pas d\'alliance mondiale classique.'),
  item('Le code IATA d\'easyJet est :', 'U2', ['EZ', 'EC', 'TO'], 'histoire', '**U2**. TO = Transavia France.'),
  item('Star Alliance a été fondée en :', '1997', ['2000', '2004', '1933'], 'histoire', '**1997** (Lufthansa, United, Air Canada, SAS, Thai). SkyTeam = 2000. Oneworld = 1999.'),
  item('Oneworld a été fondée en :', '1999', ['1997', '2000', '1933'], 'histoire', '**1999** (BA, AA, Cathay, Qantas, Canadian).'),
  item('SkyTeam a été fondée en :', '2000', ['1997', '1999', '2004'], 'histoire', '**22 juin 2000**. AF est membre fondateur.'),
];

const APTS: Apt[] = [
  { iata: 'CDG', icao: 'LFPG', city: 'Paris', country: 'France', name: 'Roissy-Charles de Gaulle', lat: 49.01, lon: 2.55 },
  { iata: 'ORY', icao: 'LFPO', city: 'Paris', country: 'France', name: 'Orly', lat: 48.72, lon: 2.36 },
  { iata: 'NCE', icao: 'LFMN', city: 'Nice', country: 'France', name: 'Côte d\'Azur', lat: 43.66, lon: 7.22 },
  { iata: 'MRS', icao: 'LFML', city: 'Marseille', country: 'France', name: 'Provence', lat: 43.44, lon: 5.22 },
  { iata: 'LYS', icao: 'LFLL', city: 'Lyon', country: 'France', name: 'Saint-Exupéry', lat: 45.73, lon: 5.08 },
  { iata: 'TLS', icao: 'LFBO', city: 'Toulouse', country: 'France', name: 'Blagnac', lat: 43.63, lon: 1.37 },
  { iata: 'BOD', icao: 'LFBD', city: 'Bordeaux', country: 'France', name: 'Mérignac', lat: 44.83, lon: -0.72 },
  { iata: 'NTE', icao: 'LFRS', city: 'Nantes', country: 'France', name: 'Atlantique', lat: 47.15, lon: -1.61 },
  { iata: 'LIL', icao: 'LFQQ', city: 'Lille', country: 'France', name: 'Lesquin', lat: 50.56, lon: 3.09 },
  { iata: 'SXB', icao: 'LFST', city: 'Strasbourg', country: 'France', name: 'Entzheim', lat: 48.54, lon: 7.63 },
  { iata: 'MPL', icao: 'LFMT', city: 'Montpellier', country: 'France', name: 'Méditerranée', lat: 43.58, lon: 3.96 },
  { iata: 'RNS', icao: 'LFRN', city: 'Rennes', country: 'France', name: 'Saint-Jacques', lat: 48.07, lon: -1.73 },
  { iata: 'BIQ', icao: 'LFBZ', city: 'Biarritz', country: 'France', name: 'Pays Basque', lat: 43.47, lon: -1.52 },
  { iata: 'AJA', icao: 'LFKJ', city: 'Ajaccio', country: 'France', name: 'Napoléon Bonaparte', lat: 41.92, lon: 8.80 },
  { iata: 'BIA', icao: 'LFKB', city: 'Bastia', country: 'France', name: 'Poretta', lat: 42.55, lon: 9.48 },
  { iata: 'LHR', icao: 'EGLL', city: 'Londres', country: 'Royaume-Uni', name: 'Heathrow', lat: 51.47, lon: -0.46 },
  { iata: 'LGW', icao: 'EGKK', city: 'Londres', country: 'Royaume-Uni', name: 'Gatwick', lat: 51.15, lon: -0.18 },
  { iata: 'AMS', icao: 'EHAM', city: 'Amsterdam', country: 'Pays-Bas', name: 'Schiphol', lat: 52.31, lon: 4.76 },
  { iata: 'FRA', icao: 'EDDF', city: 'Francfort', country: 'Allemagne', name: 'Francfort', lat: 50.04, lon: 8.56 },
  { iata: 'MUC', icao: 'EDDM', city: 'Munich', country: 'Allemagne', name: 'Franz Josef Strauss', lat: 48.35, lon: 11.79 },
  { iata: 'BER', icao: 'EDDB', city: 'Berlin', country: 'Allemagne', name: 'Brandenburg', lat: 52.37, lon: 13.50 },
  { iata: 'MAD', icao: 'LEMD', city: 'Madrid', country: 'Espagne', name: 'Barajas', lat: 40.47, lon: -3.57 },
  { iata: 'BCN', icao: 'LEBL', city: 'Barcelone', country: 'Espagne', name: 'El Prat', lat: 41.30, lon: 2.08 },
  { iata: 'LIS', icao: 'LPPT', city: 'Lisbonne', country: 'Portugal', name: 'Humberto Delgado', lat: 38.77, lon: -9.13 },
  { iata: 'FCO', icao: 'LIRF', city: 'Rome', country: 'Italie', name: 'Fiumicino', lat: 41.80, lon: 12.24 },
  { iata: 'MXP', icao: 'LIMC', city: 'Milan', country: 'Italie', name: 'Malpensa', lat: 45.63, lon: 8.73 },
  { iata: 'ATH', icao: 'LGAV', city: 'Athènes', country: 'Grèce', name: 'Elefthérios Venizélos', lat: 37.94, lon: 23.94 },
  { iata: 'IST', icao: 'LTFM', city: 'Istanbul', country: 'Turquie', name: 'Istanbul Airport', lat: 41.26, lon: 28.74 },
  { iata: 'ZRH', icao: 'LSZH', city: 'Zurich', country: 'Suisse', name: 'Zurich', lat: 47.46, lon: 8.55 },
  { iata: 'GVA', icao: 'LSGG', city: 'Genève', country: 'Suisse', name: 'Genève', lat: 46.24, lon: 6.11 },
  { iata: 'BRU', icao: 'EBBR', city: 'Bruxelles', country: 'Belgique', name: 'Zaventem', lat: 50.90, lon: 4.48 },
  { iata: 'VIE', icao: 'LOWW', city: 'Vienne', country: 'Autriche', name: 'Schwechat', lat: 48.11, lon: 16.57 },
  { iata: 'CPH', icao: 'EKCH', city: 'Copenhague', country: 'Danemark', name: 'Kastrup', lat: 55.62, lon: 12.65 },
  { iata: 'OSL', icao: 'ENGM', city: 'Oslo', country: 'Norvège', name: 'Gardermoen', lat: 60.20, lon: 11.10 },
  { iata: 'ARN', icao: 'ESSA', city: 'Stockholm', country: 'Suède', name: 'Arlanda', lat: 59.65, lon: 17.92 },
  { iata: 'HEL', icao: 'EFHK', city: 'Helsinki', country: 'Finlande', name: 'Vantaa', lat: 60.32, lon: 24.96 },
  { iata: 'DUB', icao: 'EIDW', city: 'Dublin', country: 'Irlande', name: 'Dublin', lat: 53.43, lon: -6.27 },
  { iata: 'WAW', icao: 'EPWA', city: 'Varsovie', country: 'Pologne', name: 'Chopin', lat: 52.17, lon: 20.97 },
  { iata: 'PRG', icao: 'LKPR', city: 'Prague', country: 'Tchéquie', name: 'Václav Havel', lat: 50.10, lon: 14.26 },
  { iata: 'KEF', icao: 'BIKF', city: 'Reykjavik', country: 'Islande', name: 'Keflavík', lat: 63.99, lon: -22.61 },
  { iata: 'JFK', icao: 'KJFK', city: 'New York', country: 'États-Unis', name: 'John F. Kennedy', lat: 40.64, lon: -73.78 },
  { iata: 'EWR', icao: 'KEWR', city: 'Newark', country: 'États-Unis', name: 'Newark Liberty', lat: 40.69, lon: -73.87 },
  { iata: 'LAX', icao: 'KLAX', city: 'Los Angeles', country: 'États-Unis', name: 'Los Angeles', lat: 33.94, lon: -118.41 },
  { iata: 'SFO', icao: 'KSFO', city: 'San Francisco', country: 'États-Unis', name: 'San Francisco', lat: 37.62, lon: -122.38 },
  { iata: 'ORD', icao: 'KORD', city: 'Chicago', country: 'États-Unis', name: 'O\'Hare', lat: 41.97, lon: -87.91 },
  { iata: 'MIA', icao: 'KMIA', city: 'Miami', country: 'États-Unis', name: 'Miami', lat: 25.80, lon: -80.29 },
  { iata: 'ATL', icao: 'KATL', city: 'Atlanta', country: 'États-Unis', name: 'Hartsfield-Jackson', lat: 33.64, lon: -84.43 },
  { iata: 'DFW', icao: 'KDFW', city: 'Dallas', country: 'États-Unis', name: 'Dallas/Fort Worth', lat: 32.90, lon: -97.04 },
  { iata: 'BOS', icao: 'KBOS', city: 'Boston', country: 'États-Unis', name: 'Logan', lat: 42.37, lon: -71.01 },
  { iata: 'IAD', icao: 'KIAD', city: 'Washington', country: 'États-Unis', name: 'Dulles', lat: 38.95, lon: -77.46 },
  { iata: 'YYZ', icao: 'CYYZ', city: 'Toronto', country: 'Canada', name: 'Pearson', lat: 43.68, lon: -79.63 },
  { iata: 'YUL', icao: 'CYUL', city: 'Montréal', country: 'Canada', name: 'Trudeau', lat: 45.47, lon: -73.74 },
  { iata: 'YVR', icao: 'CYVR', city: 'Vancouver', country: 'Canada', name: 'Vancouver', lat: 49.19, lon: -123.18 },
  { iata: 'MEX', icao: 'MMMX', city: 'Mexico', country: 'Mexique', name: 'Benito Juárez', lat: 19.44, lon: -99.07 },
  { iata: 'GRU', icao: 'SBGR', city: 'São Paulo', country: 'Brésil', name: 'Guarulhos', lat: -23.44, lon: -46.47 },
  { iata: 'GIG', icao: 'SBGL', city: 'Rio de Janeiro', country: 'Brésil', name: 'Galeão', lat: -22.81, lon: -43.25 },
  { iata: 'EZE', icao: 'SAEZ', city: 'Buenos Aires', country: 'Argentine', name: 'Ezeiza', lat: -34.82, lon: -58.54 },
  { iata: 'SCL', icao: 'SCEL', city: 'Santiago', country: 'Chili', name: 'Arturo Merino Benítez', lat: -33.39, lon: -70.79 },
  { iata: 'BOG', icao: 'SKBO', city: 'Bogota', country: 'Colombie', name: 'El Dorado', lat: 4.70, lon: -74.15 },
  { iata: 'LIM', icao: 'SPJC', city: 'Lima', country: 'Pérou', name: 'Jorge Chávez', lat: -12.02, lon: -77.11 },
  { iata: 'DXB', icao: 'OMDB', city: 'Dubaï', country: 'Émirats arabes unis', name: 'Dubaï', lat: 25.25, lon: 55.36 },
  { iata: 'AUH', icao: 'OMAA', city: 'Abou Dabi', country: 'Émirats arabes unis', name: 'Abou Dabi', lat: 24.43, lon: 54.65 },
  { iata: 'DOH', icao: 'OTHH', city: 'Doha', country: 'Qatar', name: 'Hamad', lat: 25.27, lon: 51.61 },
  { iata: 'CAI', icao: 'HECA', city: 'Le Caire', country: 'Égypte', name: 'Le Caire', lat: 30.12, lon: 31.41 },
  { iata: 'CMN', icao: 'GMMN', city: 'Casablanca', country: 'Maroc', name: 'Mohammed V', lat: 33.37, lon: -7.59 },
  { iata: 'TUN', icao: 'DTTA', city: 'Tunis', country: 'Tunisie', name: 'Carthage', lat: 36.85, lon: 10.23 },
  { iata: 'ALG', icao: 'DAAG', city: 'Alger', country: 'Algérie', name: 'Houari Boumédiène', lat: 36.69, lon: 3.22 },
  { iata: 'RAK', icao: 'GMMX', city: 'Marrakech', country: 'Maroc', name: 'Ménara', lat: 31.61, lon: -8.04 },
  { iata: 'JNB', icao: 'FAOR', city: 'Johannesburg', country: 'Afrique du Sud', name: 'O.R. Tambo', lat: -26.14, lon: 28.25 },
  { iata: 'CPT', icao: 'FACT', city: 'Le Cap', country: 'Afrique du Sud', name: 'Le Cap', lat: -33.97, lon: 18.60 },
  { iata: 'NBO', icao: 'HKJK', city: 'Nairobi', country: 'Kenya', name: 'Jomo Kenyatta', lat: -1.32, lon: 36.93 },
  { iata: 'ADD', icao: 'HAAB', city: 'Addis-Abeba', country: 'Éthiopie', name: 'Bole', lat: 8.98, lon: 38.80 },
  { iata: 'BOM', icao: 'VABB', city: 'Mumbai', country: 'Inde', name: 'Chhatrapati Shivaji', lat: 19.09, lon: 72.87 },
  { iata: 'DEL', icao: 'VIDP', city: 'Delhi', country: 'Inde', name: 'Indira Gandhi', lat: 28.56, lon: 77.10 },
  { iata: 'SIN', icao: 'WSSS', city: 'Singapour', country: 'Singapour', name: 'Changi', lat: 1.36, lon: 103.99 },
  { iata: 'HKG', icao: 'VHHH', city: 'Hong Kong', country: 'Chine', name: 'Hong Kong', lat: 22.31, lon: 113.91 },
  { iata: 'PEK', icao: 'ZBAA', city: 'Pékin', country: 'Chine', name: 'Capitale', lat: 40.08, lon: 116.58 },
  { iata: 'PVG', icao: 'ZSPD', city: 'Shanghai', country: 'Chine', name: 'Pudong', lat: 31.14, lon: 121.81 },
  { iata: 'ICN', icao: 'RKSI', city: 'Séoul', country: 'Corée du Sud', name: 'Incheon', lat: 37.46, lon: 126.44 },
  { iata: 'NRT', icao: 'RJAA', city: 'Tokyo', country: 'Japon', name: 'Narita', lat: 35.77, lon: 140.39 },
  { iata: 'HND', icao: 'RJTT', city: 'Tokyo', country: 'Japon', name: 'Haneda', lat: 35.55, lon: 139.78 },
  { iata: 'BKK', icao: 'VTBS', city: 'Bangkok', country: 'Thaïlande', name: 'Suvarnabhumi', lat: 13.69, lon: 100.75 },
  { iata: 'KUL', icao: 'WMKK', city: 'Kuala Lumpur', country: 'Malaisie', name: 'KLIA', lat: 2.75, lon: 101.71 },
  { iata: 'SYD', icao: 'YSSY', city: 'Sydney', country: 'Australie', name: 'Kingsford Smith', lat: -33.95, lon: 151.18 },
  { iata: 'MEL', icao: 'YMML', city: 'Melbourne', country: 'Australie', name: 'Tullamarine', lat: -37.67, lon: 144.84 },
  { iata: 'AKL', icao: 'NZAA', city: 'Auckland', country: 'Nouvelle-Zélande', name: 'Auckland', lat: -37.01, lon: 174.79 },
  { iata: 'TLV', icao: 'LLBG', city: 'Tel Aviv', country: 'Israël', name: 'Ben Gourion', lat: 32.01, lon: 34.89 },
  { iata: 'FDF', icao: 'TFFF', city: 'Fort-de-France', country: 'France (Martinique)', name: 'Aimé Césaire', lat: 14.59, lon: -61.00 },
  { iata: 'PTP', icao: 'TFFR', city: 'Pointe-à-Pitre', country: 'France (Guadeloupe)', name: 'Pôle Caraïbes', lat: 16.27, lon: -61.53 },
  { iata: 'RUN', icao: 'FMEE', city: 'Saint-Denis', country: 'France (La Réunion)', name: 'Roland Garros', lat: -20.89, lon: 55.52 },
  { iata: 'MRU', icao: 'FIMP', city: 'Port-Louis', country: 'Maurice', name: 'Sir Seewoosagur Ramgoolam', lat: -20.43, lon: 57.68 },
  { iata: 'PPT', icao: 'NTAA', city: 'Papeete', country: 'France (Polynésie)', name: 'Faa\'a', lat: -17.55, lon: -149.61 },
  { iata: 'NOU', icao: 'NWWW', city: 'Nouméa', country: 'France (Nouvelle-Calédonie)', name: 'La Tontouta', lat: -22.01, lon: 166.21 },
  { iata: 'CAY', icao: 'SOCA', city: 'Cayenne', country: 'France (Guyane)', name: 'Félix Eboué', lat: 4.82, lon: -52.36 },
  { iata: 'DZA', icao: 'FMCZ', city: 'Dzaoudzi', country: 'France (Mayotte)', name: 'Pamandzi', lat: -12.80, lon: 45.28 },
  { iata: 'BVA', icao: 'LFOB', city: 'Beauvais', country: 'France', name: 'Tillé', lat: 49.45, lon: 2.11 },
  { iata: 'LBG', icao: 'LFPB', city: 'Le Bourget', country: 'France', name: 'Le Bourget', lat: 48.97, lon: 2.44 },
  { iata: 'CFE', icao: 'LFLC', city: 'Clermont-Ferrand', country: 'France', name: 'Auvergne', lat: 45.79, lon: 3.17 },
  { iata: 'BES', icao: 'LFRB', city: 'Brest', country: 'France', name: 'Bretagne', lat: 48.45, lon: -4.42 },
  { iata: 'SXM', icao: 'TNCM', city: 'Philipsburg', country: 'Saint-Martin (côté néerlandais)', name: 'Princess Juliana', lat: 18.04, lon: -63.11 },
  { iata: 'DSS', icao: 'GOBD', city: 'Dakar', country: 'Sénégal', name: 'Blaise Diagne', lat: 14.67, lon: -17.07 },
  { iata: 'ABJ', icao: 'DIAP', city: 'Abidjan', country: 'Côte d\'Ivoire', name: 'Félix Houphouët-Boigny', lat: 5.26, lon: -3.93 },
  { iata: 'DLA', icao: 'FKKD', city: 'Douala', country: 'Cameroun', name: 'Douala', lat: 4.01, lon: 9.72 },
  { iata: 'BKO', icao: 'GABS', city: 'Bamako', country: 'Mali', name: 'Modibo Keïta', lat: 12.53, lon: -7.95 },
  { iata: 'TNR', icao: 'FMMI', city: 'Antananarivo', country: 'Madagascar', name: 'Ivato', lat: -18.80, lon: 47.48 },
  { iata: 'SEZ', icao: 'FSIA', city: 'Mahé', country: 'Seychelles', name: 'Seychelles International', lat: -4.67, lon: 55.52 },
];

const NATO: [string, string][] = [
  ['A', 'Alfa'], ['B', 'Bravo'], ['C', 'Charlie'], ['D', 'Delta'], ['E', 'Echo'],
  ['F', 'Foxtrot'], ['G', 'Golf'], ['H', 'Hotel'], ['I', 'India'], ['J', 'Juliett'],
  ['K', 'Kilo'], ['L', 'Lima'], ['M', 'Mike'], ['N', 'November'], ['O', 'Oscar'],
  ['P', 'Papa'], ['Q', 'Quebec'], ['R', 'Romeo'], ['S', 'Sierra'], ['T', 'Tango'],
  ['U', 'Uniform'], ['V', 'Victor'], ['W', 'Whiskey'], ['X', 'X-ray'], ['Y', 'Yankee'],
  ['Z', 'Zulu'],
];

function airportQuestions(): CultureItem[] {
  const out: CultureItem[] = [];
  const iatas = APTS.map((a) => a.iata);
  const icaos = APTS.map((a) => a.icao);
  const cities = APTS.map((a) => a.city);
  const countries = APTS.map((a) => a.country);
  const lats = APTS.map((a) => fmtLat(a.lat));
  const lons = APTS.map((a) => fmtLon(a.lon));

  for (const a of APTS) {
    const label = `${a.name} (${a.city})`;
    out.push(
      item(
        `Quel est le code IATA de l'aéroport ${a.name} (${a.city}) ?`,
        a.iata,
        pick3(a.iata, iatas),
        'aeroports',
        `${label} : IATA **${a.iata}**, OACI **${a.icao}**, ${a.country}. Les codes IATA ont 3 lettres.`,
      ),
    );
    out.push(
      item(
        `Quel est le code OACI de ${a.name} (${a.iata}) ?`,
        a.icao,
        pick3(a.icao, icaos),
        'aeroports',
        `${label} : **${a.icao}**. Quatre lettres ; le préfixe indique la région (LF = France, EG = Royaume-Uni, K = USA…).`,
      ),
    );
    out.push(
      item(
        `L'aéroport ${a.iata} dessert principalement quelle ville ?`,
        a.city,
        pick3(a.city, cities),
        'aeroports',
        `${a.iata} = **${a.city}** (${a.country}), aéroport ${a.name}.`,
      ),
    );
    out.push(
      item(
        `Dans quel pays se trouve l'aéroport ${a.iata} (${a.name}) ?`,
        a.country,
        pick3(a.country, countries),
        'aeroports',
        `${a.iata} / ${a.icao} : **${a.country}**, ville ${a.city}. IATA = 3 lettres, OACI = 4.`,
      ),
    );
    out.push(
      item(
        `Latitude approximative de ${a.iata} (${a.city}) ?`,
        fmtLat(a.lat),
        pick3(fmtLat(a.lat), lats),
        'navigation',
        `${a.name} : environ **${fmtLat(a.lat)}**, **${fmtLon(a.lon)}**. La latitude dit le nord/sud (équateur = 0°). Arrondi à 0,1° (~11 km) : largement assez pour un QCM de culture.`,
      ),
    );
    out.push(
      item(
        `Longitude approximative de ${a.iata} (${a.city}) ?`,
        fmtLon(a.lon),
        pick3(fmtLon(a.lon), lons),
        'navigation',
        `${a.name} : environ **${fmtLat(a.lat)}**, **${fmtLon(a.lon)}**. Longitude = est/ouest par rapport à Greenwich (0°). O = ouest.`,
      ),
    );
    out.push(
      item(
        `${a.iata} (${a.city}) se trouve dans quel hémisphère ?`,
        a.lat >= 0 ? 'Nord' : 'Sud',
        a.lat >= 0 ? ['Sud', 'Les deux à la fois', 'Aucun, c\'est l\'équateur'] : ['Nord', 'Les deux à la fois', 'Aucun, c\'est l\'équateur'],
        'navigation',
        `Latitude **${fmtLat(a.lat)}** → hémisphère **${a.lat >= 0 ? 'nord' : 'sud'}**. L'équateur est à 0°.`,
      ),
    );
  }
  return out;
}

function natoQuestions(): CultureItem[] {
  const words = NATO.map(([, w]) => w);
  return NATO.map(([letter, word]) =>
    item(
      `Alphabet OACI : la lettre ${letter} se dit ?`,
      word,
      pick3(word, words),
      'navigation',
      `Alphabet phonétique OACI / OTAN : **${letter} = ${word}**. C'est celui utilisé en radio aéronautique (indicatif, pistes, immatriculations).`,
    ),
  );
}

function extraGeo(): CultureItem[] {
  return [
    item('Le plus grand aéroport de Paris en trafic long-courrier est :', 'CDG (Roissy)', ['Orly', 'Le Bourget', 'Beauvais'], 'aeroports', '**CDG** = hub AF. Orly = surtout moyen-courrier / outre-mer. Le Bourget = affaires + salon. Beauvais = low-cost.'),
    item('Le code IATA d\'Orly est :', 'ORY', ['ORL', 'CDG', 'PAR'], 'aeroports', '**ORY** / **LFPO**. PAR est un code de ville, pas un aéroport.'),
    item('Le code IATA de Roissy est :', 'CDG', ['RSS', 'PAR', 'RFG'], 'aeroports', '**CDG** (Charles de Gaulle) / **LFPG**.'),
    item('Le Bourget a pour code IATA :', 'LBG', ['BUR', 'CDG', 'ORY'], 'aeroports', '**LBG** / **LFPB** : aviation d\'affaires et musée Air & Espace.'),
    item('Quel aéroport lyonnais porte le nom de Saint-Exupéry ?', 'LYS', ['LYN', 'EBU', 'CFE'], 'aeroports', '**LYS / LFLL**, hommage à l\'écrivain-aviateur. Bron = LYN (plus petit).'),
    item('Toulouse-Blagnac est le siège de :', 'Airbus (assemblage A320, essais…) et un aéroport majeur', ['Boeing', 'Embraer seulement', 'le hub KLM'], 'aeroports', '**TLS / LFBO** : Blagnac, cœur industriel Airbus. AF y a des lignes, ce n\'est pas son hub.'),
    item('Schiphol est le hub de :', 'KLM', ['Lufthansa', 'Iberia', 'easyJet uniquement'], 'aeroports', '**AMS / EHAM**, hub **KLM**, partenaire du groupe AF-KLM.'),
    item('Heathrow est le hub principal de :', 'British Airways', ['Air France', 'Ryanair', 'Lufthansa'], 'aeroports', '**LHR / EGLL**. AF y vole, mais le hub AF reste CDG.'),
    item('JFK dessert :', 'New York', ['Washington', 'Boston', 'Philadelphie'], 'aeroports', '**JFK / KJFK**, Queens. Newark (EWR) et LaGuardia (LGA) sont les deux autres grands New York.'),
    item('Quel aéroport new-yorkais est le plus utilisé par les long-courriers européens historiques ?', 'JFK', ['LaGuardia', 'Teterboro', 'Islip'], 'aeroports', '**JFK**. LGA est surtout domestique (pistes courtes). EWR aussi long-courrier (United / d\'autres).'),
    item('Haneda (HND) se trouve :', 'à Tokyo, plus proche du centre que Narita', ['à Osaka', 'à Séoul', 'à Pékin'], 'aeroports', '**HND / RJTT** = Tokyo-Haneda. **NRT / RJAA** = Narita, plus à l\'est, longtemps le grand international.'),
    item('Changi est l\'aéroport de :', 'Singapour', ['Kuala Lumpur', 'Bangkok', 'Hong Kong'], 'aeroports', '**SIN / WSSS**. KLIA = KUL. Suvarnabhumi = BKK. Hong Kong = HKG.'),
    item('O.R. Tambo est l\'aéroport de :', 'Johannesburg', ['Le Cap', 'Nairobi', 'Lagos'], 'aeroports', '**JNB / FAOR**. CPT = Le Cap. NBO = Nairobi. LOS = Lagos.'),
    item('El Dorado est l\'aéroport de :', 'Bogota', ['Lima', 'Quito', 'Caracas'], 'aeroports', '**BOG / SKBO**. Lima = LIM, Jorge Chávez.'),
    item('Galeão dessert :', 'Rio de Janeiro', ['São Paulo', 'Brasilia', 'Lisbonne'], 'aeroports', '**GIG**. São Paulo-Guarulhos = GRU. Lisbonne = LIS.'),
    item('Pudong (PVG) dessert :', 'Shanghai', ['Pékin', 'Canton', 'Hong Kong'], 'aeroports', '**PVG** = Shanghai-Pudong (international). Hongqiao (SHA) est l\'autre aéroport de Shanghai. Pékin-Capitale = PEK.'),
  ];
}

function uniqueItems(items: CultureItem[]): CultureItem[] {
  const seen = new Set<string>();
  const out: CultureItem[] = [];
  for (const q of items) {
    if (seen.has(q.stem)) continue;
    if (new Set(q.choices).size < 4) continue;
    seen.add(q.stem);
    const explain =
      q.explain.length > 40
        ? q.explain
        : `${q.explain} Retenez le nom, le code ou la date tels quels ; un effectif de flotte se date (année).`;
    out.push(explain === q.explain ? q : { ...q, explain });
  }
  return out;
}

const MIX_WEIGHT: Record<CultureKind, number> = {
  'air-france': 6,
  flotte: 5,
  pionniers: 3,
  histoire: 3,
  records: 2,
  aeroports: 2,
  navigation: 2,
};

let CACHED: CultureItem[] | null = null;

export function allCultureItems(): CultureItem[] {
  if (CACHED) return CACHED;
  CACHED = uniqueItems([
    ...AF_HAND,
    ...PIONEERS,
    ...RECORDS,
    ...AIRLINES,
    ...airportQuestions(),
    ...natoQuestions(),
    ...extraGeo(),
    ...CULTURE_MORE,
  ]);
  return CACHED;
}

export function pickCultureQuestions(count: number, kind?: CultureKind | 'all'): CultureItem[] {
  const n = Math.max(1, count);
  const pool =
    !kind || kind === 'all'
      ? allCultureItems()
      : allCultureItems().filter((q) => q.kind === kind);
  return shuffle(pool).slice(0, Math.min(n, pool.length)).map(shuffleItem);
}

export function nextCultureQuestion(
  usedStems: Set<string>,
  kind?: CultureKind | 'all',
): CultureItem {
  const all = allCultureItems();
  const scoped =
    !kind || kind === 'all' ? all : all.filter((q) => q.kind === kind);
  const fresh = scoped.filter((q) => !usedStems.has(q.stem));
  const pool = fresh.length > 0 ? fresh : scoped;

  if (kind && kind !== 'all') {
    return shuffleItem((shuffle(pool)[0] ?? pool[0]) as CultureItem);
  }

  const remainingKinds = [...new Set(pool.map((q) => q.kind))];
  const tickets: CultureKind[] = [];
  for (const k of remainingKinds) {
    const w = MIX_WEIGHT[k] ?? 1;
    for (let i = 0; i < w; i++) tickets.push(k);
  }
  const pickKind = tickets[Math.floor(Math.random() * tickets.length)] as CultureKind;
  const sub = pool.filter((q) => q.kind === pickKind);
  const chosen = (shuffle(sub.length > 0 ? sub : pool)[0] ?? pool[0]) as CultureItem;
  return shuffleItem(chosen);
}
