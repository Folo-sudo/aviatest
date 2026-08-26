'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePerformanceResult, loadEntries } from '@/lib/core/PerformanceTracker';
import { MiniPerformanceChart } from '@/components/PerformanceChart';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Play, RotateCcw, Home, Settings, CheckCircle2, XCircle } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

type GameState = 'menu' | 'settings' | 'reading' | 'questions' | 'results';
type AnswerMode = 'oneByOne' | 'allAtOnce';

interface MCQ {
  question: string;
  options: string[];
  correctIdx: number;
}

interface TextPassage {
  id: string;
  title: string;
  topic: string;
  body: string;
  questions: MCQ[];
}

interface GameSettings {
  numTexts: number;
  examMode: boolean;
  timePerTextSec: number;
  answerMode: AnswerMode;
}

interface AnswerRecord {
  textIdx: number;
  qIdx: number;
  selected: number | null;
  correct: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const EXERCISE_ID = 'lecture-textes';
const SETTINGS_KEY = 'aviatest-lecture-textes-settings';
const SLATE_BG = 'bg-gradient-to-br from-slate-50 to-slate-100';

const DEFAULT_SETTINGS: GameSettings = {
  numTexts: 5,
  examMode: false,
  timePerTextSec: 120,
  answerMode: 'oneByOne',
};

const PASSAGE_BANK: TextPassage[] = [
  {
    id: 'gps',
    title: 'Naissance du GPS',
    topic: 'technologie',
    body: `Le Global Positioning System (GPS) est un systeme de navigation par satellites developpe par l'armee americaine dans les annees 1970. Initialement reserve au usage militaire, il fut rendu accessible au public civil en 1983 apres un incident de navigation. Le systeme repose sur un constellation de satellites en orbite terrestre qui emettent des signaux horaires. Un recepteur calcule sa position en mesurant le temps de propagation des signaux depuis plusieurs satellites. La precision civile initiale etait degradee par un brouillage volontaire, supprime en 2000. Aujourd'hui, le GPS est omnipresent dans l'aviation, la marine et les smartphones. Des systemes concurrents comme Galileo (Europe) et BeiDou (Chine) offrent des alternatives complementaires pour ameliorer la fiabilite et la precision.`,
    questions: [
      {
        question: 'Quand le GPS a-t-il ete ouvert au public civil ?',
        options: ['1969', '1983', '1995', '2000', '2010'],
        correctIdx: 1,
      },
      {
        question: 'Comment un recepteur determine sa position ?',
        options: [
          'Par la couleur du signal',
          'Par le temps de propagation des signaux',
          'Par la frequence des satellites',
          'Par un questionnaire au pilote',
          'Par la temperature ambiante',
        ],
        correctIdx: 1,
      },
      {
        question: 'Quel brouillage a ete supprime en 2000 ?',
        options: [
          'Le brouillage volontaire de precision civile',
          'Les signaux militaires',
          'Les satellites europeens',
          'Les applications mobiles',
          'Les cartes papier',
        ],
        correctIdx: 0,
      },
    ],
  },
  {
    id: 'concorde',
    title: 'Le Concorde',
    topic: 'histoire',
    body: `Le Concorde fut le premier avion de ligne commercial supersonique, concu conjointement par Aerospatiale et British Aircraft Corporation. Son premier vol commercial date de 1976. Il pouvait atteindre Mach 2,02 a une altitude de croisiere d'environ 18 000 metres, reduisant le temps de vol entre Paris et New York a environ trois heures. Seuls Air France et British Airways exploiterent le Concorde en service regulier. Le programme fut marque par des contraintes economiques et environnementales, notamment le bruit au decollage et les emissions en altitude. L'accident du vol AF4590 en 2000, combine a la baisse du trafic apres les attentats de 2001, precipita l'arret du service en 2003. Le Concorde reste un symbole de l'innovation aeronautique europeenne et de l'ere du luxe aerien transatlantique.`,
    questions: [
      {
        question: 'Quelle vitesse maximale pouvait atteindre le Concorde ?',
        options: ['Mach 0,85', 'Mach 1,2', 'Mach 2,02', 'Mach 3,0', 'Mach 0,5'],
        correctIdx: 2,
      },
      {
        question: 'Quelles compagnies exploitaient le Concorde ?',
        options: [
          'Lufthansa et Iberia',
          'Air France et British Airways',
          'Delta et United',
          'Emirates et Qatar',
          'Air Canada et Qantas',
        ],
        correctIdx: 1,
      },
      {
        question: "Quel evenement precipita l'arret du service ?",
        options: [
          'Une greve des pilotes en 1998',
          "L'accident AF4590 et la baisse du trafic post-2001",
          'La fin des subventions europeennes en 1995',
          'Un defaut de moteur en serie',
          "L'interdiction de vol supersonique en 1989",
        ],
        correctIdx: 1,
      },
    ],
  },
  {
    id: 'photosynthese',
    title: 'Photosynthese',
    topic: 'science',
    body: `La photosynthese est le processus par lequel les plantes, algues et certaines bacteries convertissent l'energie lumineuse en energie chimique. Elle se deroule principalement dans les chloroplastes, organites contenant la chlorophylle. Le processus global peut etre resume par la transformation du dioxyde de carbone et de l'eau en glucose et dioxygene, sous l'action de la lumiere. La photosynthese comprend deux phases : les reactions lumineuses, qui captent l'energie solaire et produisent de l'ATP et du NADPH, et le cycle de Calvin, qui utilise ces molecules pour synthetiser des glucides. La photosynthese est fondamentale pour la vie sur Terre car elle constitue la base de la chaine alimentaire et maintient l'equilibre atmospherique du dioxygene. Les variations de temperature, luminosite et disponibilite en eau influencent son efficacite.`,
    questions: [
      {
        question: 'Ou se deroule principalement la photosynthese ?',
        options: ['Dans le noyau', 'Dans les chloroplastes', 'Dans le cytoplasme', 'Dans les mitochondries', 'Dans le noyau'],
        correctIdx: 1,
      },
      {
        question: 'Quels produits sont formes lors de la photosynthese ?',
        options: [
          'Glucose et dioxygene',
          'Glucose et dioxyde de carbone',
          'Eau et ammoniac',
          'Nitrogene et ozone',
          'Methane et helium',
        ],
        correctIdx: 0,
      },
      {
        question: "Quelle phase produit de l'ATP et du NADPH ?",
        options: [
          'Le cycle de Calvin',
          'Les reactions lumineuses',
          'La respiration cellulaire',
          'La fermentation',
          'La digestion',
        ],
        correctIdx: 1,
      },
    ],
  },
  {
    id: 'internet',
    title: "Origines d'Internet",
    topic: 'technologie',
    body: `Internet trouve ses origines dans le projet ARPANET, finance par l'agence americaine DARPA au debut des annees 1960. L'objectif etait de creer un reseau de communication resistant a la destruction partielle, utilisant le protocole de commutation de paquets. Le premier message transmis entre deux ordinateurs distants date de 1969. Le protocole TCP/IP, adopte en 1983, devint la norme universelle de transmission. Le World Wide Web, invente par Tim Berners-Lee en 1989 au CERN, democratisa l'acces a l'information via des pages hypertextes. La commercialisation des reseaux dans les annees 1990 transforma Internet en infrastructure mondiale. Aujourd'hui, des milliards d'appareils sont connectes, alimentant l'economie numerique, la telecommunication et les services cloud. Les questions de securite, de souverainete des donnees et d'equite d'acces restent des enjeux majeurs.`,
    questions: [
      {
        question: 'Quel projet a precede Internet ?',
        options: ['ARPANET', 'Ethernet', 'Usenet', 'FidoNet', 'Bitnet'],
        correctIdx: 0,
      },
      {
        question: 'Qui a invente le World Wide Web ?',
        options: [
          'Bill Gates',
          'Tim Berners-Lee',
          'Steve Jobs',
          'Linus Torvalds',
          'Vint Cerf',
        ],
        correctIdx: 1,
      },
      {
        question: 'Quel protocole est devenu la norme en 1983 ?',
        options: ['HTTP', 'FTP', 'TCP/IP', 'SMTP', 'DNS'],
        correctIdx: 2,
      },
    ],
  },
  {
    id: 'revolution',
    title: 'Revolution industrielle',
    topic: 'histoire',
    body: `La revolution industrielle, amorcee en Grande-Bretagne vers 1760, transforma les societes agricoles en economies industrielles. L'invention de la machine a vapeur par James Watt et les innovations dans le textile accelererent la production manufacturiere. L'urbanisation massive entraina des changements sociaux profonds, notamment l'emergence de la classe ouvriere et de nouvelles formes de travail en usine. Le charbon et le fer devinrent les matieres premieres essentielles. Le transport fut revolutionne par les railways et les navires a vapeur, facilitant le commerce mondial. La deuxieme revolution industrielle, au XIXe siecle, introduit l'electricite, la chimie et la production en serie. Ces transformations poserent des questions sur les conditions de travail, l'environnement et les inegalites, donnant naissance aux mouvements syndicaux et aux premieres legislations sociales.`,
    questions: [
      {
        question: 'Ou a debute la revolution industrielle ?',
        options: ['France', 'Allemagne', 'Grande-Bretagne', 'Etats-Unis', 'Italie'],
        correctIdx: 2,
      },
      {
        question: 'Quelle invention accelera la production manufacturiere ?',
        options: [
          'La machine a vapeur',
          'Le telephone',
          "L'ampoule electrique",
          'Le moteur diesel',
          'Le radar',
        ],
        correctIdx: 0,
      },
      {
        question: 'Quelle matiere premiere etait essentielle ?',
        options: ['Le bois', 'Le charbon', 'Le cuivre', 'Le plastique', 'Le lithium'],
        correctIdx: 1,
      },
    ],
  },
  {
    id: 'adn',
    title: "Structure de l'ADN",
    topic: 'science',
    body: `L'acide desoxyribonucleique (ADN) est la molecule qui porte l'information genetique de tous les organismes vivants. Sa structure en double helice fut decouverte en 1953 par James Watson et Francis Crick, avec des contributions decisives de Rosalind Franklin. L'ADN est compose de deux brins antiparalleles formes de nucleotides contenant les bases adenine, thymine, cytosine et guanine. Les bases s'associent par paires specifiques : A avec T, et C avec G. Le sequencage de l'ADN permet d'identifier les genes responsables de traits hereditaires et de certaines maladies. Le Projet Genome Humain, acheve en 2003, cartographia l'ensemble des genes humains. Les techniques modernes comme CRISPR offrent des possibilites de modification genetique avec des implications therapeutiques et ethiques considerables. L'ADN est aussi utilise en criminalistique pour l'identification individuelle.`,
    questions: [
      {
        question: 'Qui a decouvert la structure en double helice ?',
        options: [
          'Darwin et Pasteur',
          'Watson et Crick',
          'Einstein et Bohr',
          'Newton et Galileo',
          'Mendel et Lamarck',
        ],
        correctIdx: 1,
      },
      {
        question: "Quelle base s'associe avec l'adenine ?",
        options: ['Cytosine', 'Guanine', 'Thymine', 'Uracile', 'Adenine'],
        correctIdx: 2,
      },
      {
        question: 'Quand le Projet Genome Humain fut acheve ?',
        options: ['1983', '1993', '2003', '2013', '2023'],
        correctIdx: 2,
      },
    ],
  },
  {
    id: 'satellites',
    title: 'Satellites de communication',
    topic: 'technologie',
    body: `Les satellites de communication permettent la transmission de signaux radio sur de grandes distances, en relayant les informations entre stations terrestres. Le premier satellite de communication actif fut Telstar 1, lance en 1962. Les satellites geostationnaires, places a 36 000 km d'altitude, restent fixes par rapport a un point de la Terre, ideaux pour la television et les telecommunications. Les orbites basses, utilisees par des constellations comme Starlink, offrent une latence reduite pour l'internet haut debit. Un satellite emet et recoit des signaux via des antennes paraboliques et des transpondeurs. La bande passante disponible depend de la frequence utilisee et du nombre de transpondeurs. Les agences spatiales et les operateurs prives gerent les lancements et la maintenance en orbite. Les defis incluent la saturation des orbites, les debris spatiaux et la reglementation internationale des frequences.`,
    questions: [
      {
        question: 'Quel fut le premier satellite de communication actif ?',
        options: ['Apollo 11', 'Telstar 1', 'Hubble', 'Voyager 1', 'Sputnik 1'],
        correctIdx: 1,
      },
      {
        question: 'A quelle altitude sont les satellites geostationnaires ?',
        options: ['400 km', '2 000 km', '36 000 km', '100 000 km', '1 000 km'],
        correctIdx: 2,
      },
      {
        question: 'Quel avantage offrent les orbites basses ?',
        options: [
          "Latence reduite pour l'internet",
          'Moins de debris',
          "Pas besoin d'antennes",
          'Orbite fixe',
          'Energie solaire infinie',
        ],
        correctIdx: 0,
      },
    ],
  },
  {
    id: 'lune',
    title: 'Exploration lunaire',
    topic: 'histoire',
    body: `L'exploration de la Lune marque l'une des grandes aventures scientifiques du XXe siecle. Le programme Apollo de NASA culmina avec Apollo 11 en juillet 1969, quand Neil Armstrong et Buzz Aldrin devinrent les premiers humains a marcher sur la Lune. Six missions Apollo ont permis de ramener des echantillons de roches lunaires et de deployer des instruments scientifiques. La Lune est depourvue d'atmosphere et de magnetosphere significative, exposant sa surface aux radiations solaires et aux impacts meteoritiques. Les missions Luna sovietiques avaient precedemment envoye des sondes et des rover automatises. Apres une longue interruption, les programmes Artemis (USA) et les missions chinoises Chang'e visent un retour humain et l'exploration des poles lunaires, riches en glace d'eau. La Lune pourrait servir de base pour des missions vers Mars et l'industrie spatiale.`,
    questions: [
      {
        question: 'Quelle mission a permis le premier pas sur la Lune ?',
        options: ['Apollo 8', 'Apollo 11', 'Apollo 13', 'Gemini 7', 'Soyouz 1'],
        correctIdx: 1,
      },
      {
        question: 'Quel programme sovietique a precede Apollo ?',
        options: ['Vostok', 'Luna', 'Mir', 'Energia', 'Buran'],
        correctIdx: 1,
      },
      {
        question: 'Pourquoi les poles lunaires sont interessants ?',
        options: [
          'Ils sont plus chauds',
          "Ils contiennent de la glace d'eau",
          'Ils ont une atmosphere',
          'Ils sont invisibles depuis la Terre',
          'Ils sont toujours eclaires',
        ],
        correctIdx: 1,
      },
    ],
  },
];

// ============================================================================
// Helpers
// ============================================================================

function loadSettings(): GameSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function saveSettingsLocal(s: GameSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================================
// Component
// ============================================================================

export default function LectureTextesTest() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>('menu');
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [texts, setTexts] = useState<TextPassage[]>([]);
  const [textIdx, setTextIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [results, setResults] = useState<AnswerRecord[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [flash, setFlash] = useState<'correct' | 'wrong' | null>(null);
  const [locked, setLocked] = useState(false);

  const perfSavedRef = useRef(false);
  const readingStartRef = useRef(0);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  useEffect(() => {
    saveSettingsLocal(settings);
  }, [settings]);

  const startGame = useCallback(() => {
    perfSavedRef.current = false;
    const picked = shuffle(PASSAGE_BANK).slice(0, settings.numTexts);
    setTexts(picked);
    setTextIdx(0);
    setQIdx(0);
    setAnswers({});
    setResults([]);
    setFlash(null);
    setLocked(false);
    readingStartRef.current = Date.now();
    setTimeLeft(settings.timePerTextSec);
    setGameState('reading');
  }, [settings]);

  useEffect(() => {
    if (gameState !== 'reading' && gameState !== 'questions') return;
    const id = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          if (gameState === 'reading') setGameState('questions');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [gameState, textIdx]);

  const currentText = texts[textIdx];
  const answerKey = (ti: number, qi: number) => `${ti}-${qi}`;

  const submitOneAnswer = useCallback(
    (selected: number) => {
      if (!currentText || locked) return;
      const correct = selected === currentText.questions[qIdx].correctIdx;
      setLocked(true);
      setAnswers((a) => ({ ...a, [answerKey(textIdx, qIdx)]: selected }));
      const record: AnswerRecord = { textIdx, qIdx, selected, correct };
      setResults((r) => [...r, record]);

      if (!settings.examMode) {
        setFlash(correct ? 'correct' : 'wrong');
        setTimeout(() => {
          setFlash(null);
          setLocked(false);
          if (qIdx + 1 < currentText.questions.length) {
            setQIdx((i) => i + 1);
          } else if (textIdx + 1 < texts.length) {
            setTextIdx((i) => i + 1);
            setQIdx(0);
            setTimeLeft(settings.timePerTextSec);
            setGameState('reading');
            readingStartRef.current = Date.now();
          } else {
            setGameState('results');
          }
        }, correct ? 800 : 1800);
      } else {
        setLocked(false);
        if (qIdx + 1 < currentText.questions.length) {
          setQIdx((i) => i + 1);
        } else if (textIdx + 1 < texts.length) {
          setTextIdx((i) => i + 1);
          setQIdx(0);
          setTimeLeft(settings.timePerTextSec);
          setGameState('reading');
        } else {
          setGameState('results');
        }
      }
    },
    [currentText, locked, qIdx, textIdx, texts.length, settings],
  );

  const submitAllAnswers = useCallback(() => {
    if (!currentText) return;
    const newResults: AnswerRecord[] = [];
    currentText.questions.forEach((q, qi) => {
      const sel = answers[answerKey(textIdx, qi)];
      if (sel === undefined) return;
      newResults.push({
        textIdx,
        qIdx: qi,
        selected: sel,
        correct: sel === q.correctIdx,
      });
    });
    setResults((r) => [...r, ...newResults]);

    if (!settings.examMode) {
      const allCorrect = newResults.every((r) => r.correct);
      setFlash(allCorrect ? 'correct' : 'wrong');
      setTimeout(() => {
        setFlash(null);
        setAnswers({});
        if (textIdx + 1 < texts.length) {
          setTextIdx((i) => i + 1);
          setQIdx(0);
          setTimeLeft(settings.timePerTextSec);
          setGameState('reading');
        } else {
          setGameState('results');
        }
      }, 2500);
    } else {
      setAnswers({});
      if (textIdx + 1 < texts.length) {
        setTextIdx((i) => i + 1);
        setTimeLeft(settings.timePerTextSec);
        setGameState('reading');
      } else {
        setGameState('results');
      }
    }
  }, [currentText, answers, textIdx, texts.length, settings]);

  const timerPct =
    settings.timePerTextSec > 0 ? (timeLeft / settings.timePerTextSec) * 100 : 0;

  // ---- MENU ----
  if (gameState === 'menu') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Lecture de textes</CardTitle>
            <CardDescription>Comprehension ecrite — textes techniques et historiques</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.numTexts}</p>
                <p className="text-xs text-slate-500">Textes</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.timePerTextSec}s</p>
                <p className="text-xs text-slate-500">Lecture</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xl font-bold text-slate-700">{settings.answerMode === 'oneByOne' ? '1×1' : 'Lot'}</p>
                <p className="text-xs text-slate-500">Mode reponses</p>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <Play className="mr-2 h-5 w-5" /> Commencer
              </Button>
              <Button variant="outline" size="lg" className="w-full" onClick={() => setGameState('settings')}>
                <Settings className="mr-2 h-5 w-5" /> Parametres
              </Button>
              <Button variant="ghost" size="lg" className="w-full" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-2 h-5 w-5" /> Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- SETTINGS ----
  if (gameState === 'settings') {
    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Parametres</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <Label>Nombre de textes : {settings.numTexts}</Label>
              <Slider
                value={[settings.numTexts]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, numTexts: v }))}
                min={2}
                max={8}
                step={1}
                className="mt-2"
              />
            </div>
            <div>
              <Label>Temps de lecture : {settings.timePerTextSec}s</Label>
              <Slider
                value={[settings.timePerTextSec]}
                onValueChange={([v]) => setSettings((s) => ({ ...s, timePerTextSec: v }))}
                min={60}
                max={300}
                step={15}
                className="mt-2"
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <Label>Mode examen</Label>
                <p className="text-xs text-slate-500">Pas de correction affichee</p>
              </div>
              <Switch
                checked={settings.examMode}
                onCheckedChange={(v) => setSettings((s) => ({ ...s, examMode: v }))}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div>
                <Label>Reponses une par une</Label>
                <p className="text-xs text-slate-500">Sinon : toutes les questions puis valider</p>
              </div>
              <Switch
                checked={settings.answerMode === 'oneByOne'}
                onCheckedChange={(v) =>
                  setSettings((s) => ({ ...s, answerMode: v ? 'oneByOne' : 'allAtOnce' }))
                }
              />
            </div>
            <Button size="lg" className="w-full" onClick={() => setGameState('menu')}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- RESULTS ----
  if (gameState === 'results') {
    const correct = results.filter((r) => r.correct).length;
    const total = results.length;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    if (!perfSavedRef.current) {
      perfSavedRef.current = true;
      savePerformanceResult(EXERCISE_ID, correct, total);
    }
    const perfEntries = loadEntries(EXERCISE_ID);

    return (
      <div className={`flex min-h-screen flex-col items-center justify-center ${SLATE_BG} p-4`}>
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">Resultats</CardTitle>
            <Badge variant={pct >= 75 ? 'default' : 'secondary'}>{pct}%</Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-slate-700">{correct}/{total}</p>
            </div>
            {perfEntries.length >= 2 && (
              <MiniPerformanceChart entries={perfEntries} exerciseId={EXERCISE_ID} />
            )}
            <div className="flex flex-col gap-3">
              <Button size="lg" className="w-full" onClick={startGame}>
                <RotateCcw className="mr-2 h-5 w-5" /> Rejouer
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setGameState('menu')}>Menu</Button>
              <Button variant="ghost" className="w-full" onClick={() => router.push('/')}>
                <Home className="mr-2 h-5 w-5" /> Accueil
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ---- READING ----
  if (gameState === 'reading' && currentText) {
    return (
      <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
        <div className="border-b border-slate-200 bg-white/70 px-4 py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between text-sm font-medium text-slate-700">
            <span>Texte {textIdx + 1}/{texts.length}</span>
            <span>{timeLeft}s</span>
            <Badge variant="outline">{currentText.topic}</Badge>
          </div>
          <div className="mx-auto mt-2 h-2 max-w-3xl rounded-full bg-slate-200">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${timerPct}%`, backgroundColor: '#0068C6' }}
            />
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl flex-1 p-6">
          <h2 className="mb-4 text-2xl font-bold text-slate-800">{currentText.title}</h2>
          <p className="leading-relaxed text-slate-700">{currentText.body}</p>
          <Button
            className="mt-8"
            size="lg"
            onClick={() => {
              setGameState('questions');
              setQIdx(0);
            }}
          >
            Passer aux questions
          </Button>
        </div>
      </div>
    );
  }

  // ---- QUESTIONS ----
  if (gameState === 'questions' && currentText) {
    const oneByOne = settings.answerMode === 'oneByOne';

    if (oneByOne) {
      const q = currentText.questions[qIdx];
      return (
        <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
          <div className="border-b border-slate-200 bg-white/70 px-4 py-3">
            <div className="mx-auto flex max-w-3xl justify-between text-sm font-medium text-slate-700">
              <span>Texte {textIdx + 1} — Question {qIdx + 1}/3</span>
              <span>Score : {results.filter((r) => r.correct).length}/{results.length}</span>
            </div>
          </div>
          <div className="mx-auto w-full max-w-3xl flex-1 p-6">
            {flash && (
              <div
                className={`mb-4 flex items-center gap-2 rounded-lg border px-4 py-3 font-semibold ${
                  flash === 'correct' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {flash === 'correct' ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {flash === 'correct' ? 'Correct' : 'Incorrect'}
              </div>
            )}
            <p className="mb-6 text-lg font-medium text-slate-800">{q.question}</p>
            <div className="space-y-3">
              {q.options.map((opt, i) => {
                const picked = answers[answerKey(textIdx, qIdx)];
                const isRight = flash && i === q.correctIdx;
                const isPickedWrong = flash && picked === i && i !== q.correctIdx;
                return (
                <button
                  key={i}
                  type="button"
                  disabled={locked}
                  onClick={() => submitOneAnswer(i)}
                  className={`w-full rounded-lg border-2 px-4 py-3 text-left text-sm transition-all ${
                    isRight
                      ? 'border-green-500 bg-green-50'
                      : isPickedWrong
                        ? 'border-red-500 bg-red-50'
                        : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50'
                  }`}
                >
                  <span className="font-semibold text-slate-500">{i + 1}. </span>{opt}
                </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    // All at once
    const allAnswered = currentText.questions.every(
      (_, qi) => answers[answerKey(textIdx, qi)] !== undefined,
    );

    return (
      <div className={`flex min-h-screen flex-col ${SLATE_BG}`}>
        <div className="border-b border-slate-200 bg-white/70 px-4 py-3">
          <div className="mx-auto max-w-3xl text-sm font-medium text-slate-700">
            Texte {textIdx + 1}/{texts.length} — Repondez aux 3 questions
          </div>
        </div>
        <div className="mx-auto w-full max-w-3xl flex-1 space-y-8 p-6">
          {flash && (
            <div
              className={`flex items-center gap-2 rounded-lg border px-4 py-3 font-semibold ${
                flash === 'correct' ? 'border-green-200 bg-green-50 text-green-700' : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {flash === 'correct' ? 'Correct' : 'Partiel ou incorrect'}
            </div>
          )}
          {currentText.questions.map((q, qi) => (
            <div key={qi} className="rounded-xl border border-slate-200 bg-white/80 p-5">
              <p className="mb-4 font-medium text-slate-800">{q.question}</p>
              <div className="space-y-2">
                {q.options.map((opt, i) => {
                  const sel = answers[answerKey(textIdx, qi)] === i;
                  const isRight = flash && i === q.correctIdx;
                  const isPickedWrong = flash && sel && i !== q.correctIdx;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!!flash}
                      onClick={() =>
                        setAnswers((a) => ({ ...a, [answerKey(textIdx, qi)]: i }))
                      }
                      className={`w-full rounded-lg border-2 px-4 py-2 text-left text-sm transition-all ${
                        isRight
                          ? 'border-green-500 bg-green-50'
                          : isPickedWrong
                            ? 'border-red-500 bg-red-50'
                            : sel
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      {i + 1}. {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <Button size="lg" disabled={!allAnswered || !!flash} onClick={submitAllAnswers}>
            Valider les 3 reponses
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
