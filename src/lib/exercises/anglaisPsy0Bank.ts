import {
  MORE_EXTRA_ANGLAIS_BANK,
  MORE_PASSAGES,
} from '@/lib/exercises/anglaisPsy0More';

export type AnglaisKind =
  | 'classic'
  | 'tense'
  | 'structure'
  | 'false-friend'
  | 'collocation'
  | 'error'
  | 'paraphrase'
  | 'connector'
  | 'inference'
  | 'register'
  | 'reading';

export const ANGLAIS_KIND_LABELS: Record<AnglaisKind, string> = {
  classic: 'Grammaire / vocabulaire',
  tense: 'Temps et aspect',
  structure: 'Structure',
  'false-friend': 'Faux amis',
  collocation: 'Collocations',
  error: 'Repérage d\'erreur',
  paraphrase: 'Sens / reformulation',
  connector: 'Articulateurs',
  inference: 'Inférence',
  register: 'Registre / fonction',
  reading: 'Compréhension écrite',
};

export interface AnglaisItem {
  stem: string;
  choices: [string, string, string, string];
  correct: number;
  kind: AnglaisKind;
  passage?: string;
}

function q(
  stem: string,
  choices: [string, string, string, string],
  correct: number,
  kind: AnglaisKind,
): AnglaisItem {
  return { stem, choices, correct, kind };
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Banque d'origine — ne pas modifier le fond des items. */
export const CLASSIC_ANGLAIS_BANK: AnglaisItem[] = [
  q('She is ___ engineer at Airbus.', ['a', 'an', 'the', '—'], 1, 'classic'),
  q('I have lived in Paris ___ 2019.', ['for', 'since', 'during', 'from'], 1, 'classic'),
  q('The meeting starts ___ 9 o\'clock.', ['in', 'on', 'at', 'by'], 2, 'classic'),
  q('He ___ to London last week.', ['goes', 'has gone', 'went', 'is going'], 2, 'classic'),
  q('We ___ dinner when the phone rang.', ['had', 'were having', 'have had', 'are having'], 1, 'classic'),
  q('This is ___ interesting book.', ['a', 'an', 'the', 'some'], 1, 'classic'),
  q('She speaks English ___ fluently.', ['very', 'much', 'many', 'lot'], 0, 'classic'),
  q('I look forward ___ hearing from you.', ['to', 'for', 'at', 'on'], 0, 'classic'),
  q('Neither Tom nor his brothers ___ ready.', ['is', 'are', 'was', 'has been'], 1, 'classic'),
  q('If I ___ you, I would accept the offer.', ['am', 'was', 'were', 'have been'], 2, 'classic'),
  q('The plane took ___ at 6 a.m.', ['off', 'out', 'away', 'up'], 0, 'classic'),
  q('He is responsible ___ safety procedures.', ['of', 'for', 'to', 'with'], 1, 'classic'),
  q('How ___ does this flight cost?', ['many', 'much', 'long', 'often'], 1, 'classic'),
  q('She has ___ finished her training.', ['yet', 'already', 'still', 'ever'], 1, 'classic'),
  q('The captain asked us to fasten our seat ___.', ['belts', 'ropes', 'strings', 'bands'], 0, 'classic'),
  q('Choose the correct sentence:', ['He don\'t like coffee.', 'He doesn\'t likes coffee.', 'He doesn\'t like coffee.', 'He not like coffee.'], 2, 'classic'),
  q('There isn\'t ___ milk left.', ['some', 'any', 'no', 'many'], 1, 'classic'),
  q('The weather was bad, ___ we landed safely.', ['so', 'but', 'because', 'although'], 1, 'classic'),
  q('I\'d rather ___ early than miss the briefing.', ['to arrive', 'arrive', 'arriving', 'arrived'], 1, 'classic'),
  q('This runway is ___ than the previous one.', ['long', 'longer', 'more long', 'longest'], 1, 'classic'),
  q('She works ___ a flight attendant.', ['as', 'like', 'for', 'by'], 0, 'classic'),
  q('We need to submit the report ___ Friday.', ['until', 'by', 'since', 'during'], 1, 'classic'),
  q('He is used ___ night shifts.', ['to work', 'to working', 'work', 'working'], 1, 'classic'),
  q('The luggage ___ checked already.', ['is', 'has been', 'was being', 'had'], 1, 'classic'),
  q('Could you tell me where ___?', ['is the gate', 'the gate is', 'is gate', 'gate is'], 1, 'classic'),
  q('A "library" in English is a place for books, not a ___ .', ['bookshop', 'reading room only', 'computer lab', 'archive only'], 0, 'classic'),
  q('"Actually" in English often means:', ['currently', 'in fact', 'soon', 'possibly'], 1, 'classic'),
  q('"Eventually" means:', ['possibly', 'in the end', 'immediately', 'rarely'], 1, 'classic'),
  q('The opposite of "departure" is:', ['arrival', 'delay', 'landing', 'take-off'], 0, 'classic'),
  q('A "pilot" flies an aircraft; a "plot" is:', ['a story plan', 'a type of engine', 'a runway mark', 'a weather chart'], 0, 'classic'),
  q('Fill in: "The flight attendant asked passengers to ___ their trays."', ['rise', 'raise', 'arise', 'lift up'], 1, 'classic'),
  q('Which word is a false friend for French "librairie"?', ['library', 'bookstore', 'librarian', 'ledger'], 0, 'classic'),
  q('He ___ his passport at home yesterday.', ['forgets', 'forgot', 'has forgotten', 'was forgetting'], 1, 'classic'),
  q('The turbulence made some passengers feel ___.', ['sick', 'illness', 'disease', 'injured'], 0, 'classic'),
  q('We must comply ___ international regulations.', ['with', 'to', 'by', 'on'], 0, 'classic'),
  q('She is the ___ student in the class.', ['more good', 'best', 'better', 'most good'], 1, 'classic'),
  q('I haven\'t seen him ___ ages.', ['since', 'for', 'during', 'from'], 1, 'classic'),
  q('The crew performed the check ___ take-off.', ['before', 'ago', 'since', 'during ago'], 0, 'classic'),
  q('Choose the correct preposition: "interested ___ aviation"', ['on', 'in', 'at', 'for'], 1, 'classic'),
  q('Neither the captain ___ the co-pilot was late.', ['or', 'nor', 'and', 'but'], 1, 'classic'),
  q('They ___ the new schedule yet.', ['didn\'t receive', 'haven\'t received', 'don\'t receive', 'aren\'t receiving'], 1, 'classic'),
  q('This is the man ___ helped us at the counter.', ['which', 'who', 'whom', 'whose'], 1, 'classic'),
  q('The announcement was hard to hear because of the ___.', ['noise', 'noisy', 'noisily', 'noised'], 0, 'classic'),
  q('If the weather improves, we ___ on time.', ['will depart', 'would depart', 'departed', 'had departed'], 0, 'classic'),
  q('She avoided ___ the confidential document.', ['to lose', 'losing', 'lose', 'lost'], 1, 'classic'),
  q('The aircraft is ___ the clouds now.', ['above', 'over', 'on', 'up'], 0, 'classic'),
  q('How long ___ you been training?', ['do', 'did', 'have', 'are'], 2, 'classic'),
  q('He insisted ___ paying the bill.', ['in', 'on', 'to', 'for'], 1, 'classic'),
  q('The runway was wet, so the landing was ___.', ['smoothly', 'smooth', 'smoothing', 'smoothed'], 1, 'classic'),
  q('I\'m looking ___ my boarding pass.', ['for', 'after', 'up', 'into'], 0, 'classic'),
  q('Choose the synonym of "rapid":', ['slow', 'quick', 'late', 'heavy'], 1, 'classic'),
  q('The briefing will take place ___ the morning.', ['on', 'in', 'at', 'by'], 1, 'classic'),
  q('She suggested ___ earlier.', ['to leave', 'leaving', 'leave', 'left'], 1, 'classic'),
  q('There are ___ seats available.', ['few', 'a little', 'much', 'little'], 0, 'classic'),
  q('He speaks French well; ___, his English is excellent.', ['however', 'moreover', 'although', 'unless'], 1, 'classic'),
  q('The gate number has been ___.', ['changed', 'change', 'changing', 'to change'], 0, 'classic'),
  q('We ran ___ fuel during the simulation.', ['out of', 'away from', 'off', 'down'], 0, 'classic'),
  q('Which is correct?', ['informations', 'an information', 'some information', 'many informations'], 2, 'classic'),
  q('The co-pilot is ___ than the captain.', ['young', 'younger', 'more young', 'youngest'], 1, 'classic'),
  q('Passengers must remain seated ___ the seatbelt sign is off.', ['until', 'during', 'while', 'unless'], 0, 'classic'),
  q('I\'d like ___ cup of tea, please.', ['other', 'another', 'more', 'else'], 1, 'classic'),
  q('The flight was cancelled ___ bad weather.', ['because', 'because of', 'due', 'thanks to'], 1, 'classic'),
  q('He denied ___ the procedure.', ['to ignore', 'ignoring', 'ignore', 'ignored'], 1, 'classic'),
  q('A "brace" position is used ___ an emergency landing.', ['in', 'for', 'during', 'at'], 2, 'classic'),
  q('"Sensible" in English usually means:', ['sensitive', 'reasonable', 'emotional', 'delicate'], 1, 'classic'),
  q('The altitude ___ steadily during the climb.', ['rose', 'raised', 'risen', 'arose'], 0, 'classic'),
  q('She is capable ___ handling pressure.', ['of', 'for', 'to', 'with'], 0, 'classic'),
  q('We\'d better ___ now or we\'ll be late.', ['to go', 'go', 'going', 'went'], 1, 'classic'),
];

const EXTRA_ANGLAIS_BANK: AnglaisItem[] = [
  ...MORE_EXTRA_ANGLAIS_BANK,

  // ---- Temps / aspect (automatismes plus fins) ----
  q('By the time we landed, they ___ the gate.', ['closed', 'have closed', 'had closed', 'were closing'], 2, 'tense'),
  q('It\'s the first time she ___ a night landing.', ['does', 'did', 'has done', 'had done'], 2, 'tense'),
  q('This time tomorrow we ___ over the Atlantic.', ['fly', 'will fly', 'will be flying', 'are flying'], 2, 'tense'),
  q('I\'ll text you as soon as I ___ the results.', ['will get', 'get', 'got', 'am getting'], 1, 'tense'),
  q('If he ___ harder last year, he would be in the programme now.', ['studied', 'has studied', 'had studied', 'would study'], 2, 'tense'),
  q('She ___ for the airline since she left university.', ['works', 'is working', 'has been working', 'had worked'], 2, 'tense'),
  q('I wish I ___ more rest before the sim.', ['have', 'had', 'would have', 'was having'], 1, 'tense'),
  q('He admitted that he ___ the checklist.', ['skipped', 'has skipped', 'had skipped', 'skips'], 2, 'tense'),
  q('They ___ dinner by the time we arrive.', ['finish', 'will finish', 'will have finished', 'are finishing'], 2, 'tense'),
  q('I didn\'t know you ___ Spanish.', ['speak', 'spoke', 'have spoken', 'are speaking'], 1, 'tense'),
  q('After she ___ the briefing, she called operations.', ['completed', 'has completed', 'had completed', 'was completed'], 2, 'tense'),
  q('We were exhausted because we ___ for eleven hours.', ['flew', 'have flown', 'had been flying', 'were flown'], 2, 'tense'),
  q('She said she ___ the following morning.', ['leaves', 'will leave', 'would leave', 'is leaving'], 2, 'tense'),
  q('Hardly ___ the runway when the rain started.', ['we reached', 'had we reached', 'we had reach', 'did we reached'], 1, 'tense'),
  q('No sooner had we taken off ___ the light came on.', ['when', 'than', 'that', 'then'], 1, 'tense'),
  q('I\'d rather you ___ now.', ['leave', 'left', 'to leave', 'leaving'], 1, 'tense'),
  q('It\'s time we ___ a decision.', ['make', 'made', 'have made', 'are making'], 1, 'tense'),
  q('If only the fog ___ thinner.', ['is', 'were', 'would be', 'has been'], 1, 'tense'),
  q('She ___ about the delay until the agent told her.', ['didn\'t hear', 'hasn\'t heard', 'hadn\'t heard', 'wasn\'t hearing'], 2, 'tense'),
  q('If only he ___ more patient with the trainees.', ['is', 'were', 'will be', 'has been'], 1, 'tense'),
  q('I ___ this manual for two weeks and I\'m still on chapter 3.', ['read', 'am reading', 'have been reading', 'had read'], 2, 'tense'),
  q('In interviews he always says the same thing: he ___ to command one day.', ['hopes', 'is hoping', 'has hoped', 'hope'], 0, 'tense'),
  q('We ___ wait here until the fog lifts.', ['must to', 'will have to', 'have to will', 'are having'], 1, 'tense'),
  q('I ___ to the hangar all morning; that\'s why I\'m exhausted.', ['ran', 'have run', 'had run', 'have been running'], 3, 'tense'),
  q('By 2028 she ___ 4,000 hours.', ['will log', 'will have logged', 'logs', 'is logging'], 1, 'tense'),
  q('He wasn\'t used to ___ so early.', ['get up', 'getting up', 'got up', 'gets up'], 1, 'tense'),

  // ---- Structure (ce n'est plus du « trou » simple) ----
  q('___ did we realise how serious the delay was.', ['Only then', 'Then only', 'Only', 'Not until then we'], 0, 'structure'),
  q('Not only ___ late, he had also lost his badge.', ['he was', 'was he', 'he were', 'did he'], 1, 'structure'),
  q('Seldom ___ such poor visibility.', ['we have seen', 'have we seen', 'we seen', 'did we saw'], 1, 'structure'),
  q('It was the co-pilot ___ noticed the discrepancy.', ['which', 'who', 'whom', 'whose'], 1, 'structure'),
  q('The aircraft ___ last week is already back in service.', ['servicing', 'serviced', 'which servicing', 'having service'], 1, 'structure'),
  q('___ the delay, most passengers remained calm.', ['Although', 'Despite', 'However', 'Whereas'], 1, 'structure'),
  q('___ he is inexperienced, he handled the radio well.', ['Despite', 'In spite of', 'Although', 'However'], 2, 'structure'),
  q('Take a spare battery ___ the first one dies.', ['if', 'in case', 'unless', 'provided'], 1, 'structure'),
  q('We left early so as ___ the rush.', ['avoid', 'to avoid', 'avoiding', 'we avoid'], 1, 'structure'),
  q('The briefing was ___ complex that nobody took notes.', ['so', 'such', 'too', 'enough'], 0, 'structure'),
  q('It was ___ a long sector that everyone was drained.', ['so', 'such', 'too', 'enough'], 1, 'structure'),
  q('He had the tyres ___ before departure.', ['to check', 'checking', 'checked', 'check'], 2, 'structure'),
  q('You needn\'t ___ come; the sim was cancelled.', ['to have', 'have', 'had', 'having'], 1, 'structure'),
  q('You came even though it turned out you were not required. You ___ .', ['mustn\'t have come', 'needn\'t have come', 'shouldn\'t come', 'hadn\'t to come'], 1, 'structure'),
  q('The more you practise, ___ it gets.', ['easier', 'the easier', 'more easy', 'the more easy'], 1, 'structure'),
  q('Whoever ___ last should lock the briefing room.', ['leave', 'leaves', 'left', 'is leaving'], 1, 'structure'),
  q('I\'ll go ___ you like it or not.', ['if', 'whether', 'unless', 'in case'], 1, 'structure'),
  q('___ of the two runways is longer?', ['What', 'Which', 'Who', 'Whose'], 1, 'structure'),
  q('There is ___ chance of a departure before noon.', ['few', 'little', 'a few', 'many'], 1, 'structure'),
  q('___ people who applied actually met the hours requirement.', ['Few', 'Little', 'Much', 'Less'], 0, 'structure'),
  q('He speaks as if he ___ the chief pilot.', ['is', 'were', 'has been', 'will be'], 1, 'structure'),
  q('Should the weather worsen, we ___ divert.', ['would', 'will', 'must to', 'are'], 1, 'structure'),
  q('Were I you, I ___ decline.', ['will', 'would', 'can', 'shall'], 1, 'structure'),
  q('Having ___ the walk-around, he signed the tech log.', ['finish', 'finished', 'finishing', 'been finish'], 1, 'structure'),
  q('The passengers waiting at gate 12 ___ already been rebooked.', ['has', 'have', 'had', 'are'], 1, 'structure'),
  q('I\'d prefer ___ on the radios until we are lined up.', ['you stay', 'to stay', 'staying', 'stay'], 1, 'structure'),
  q('Reply to "I have already done the module.": "So ___ I."', ['have', 'do', 'did', 'am'], 0, 'structure'),
  q('Neither have I, and ___ has anyone in my group.', ['so', 'neither', 'either', 'nor'], 1, 'structure'),

  // ---- Faux amis / paires piégeuses ----
  q('"Currently" is closest to:', ['in fact', 'at the moment', 'in the end', 'possibly'], 1, 'false-friend'),
  q('A "sympathetic" colleague is:', ['good-looking', 'compassionate', 'funny', 'strict'], 1, 'false-friend'),
  q('A university "lecture" is a:', ['reading list', 'talk given to students', 'book', 'exam paper'], 1, 'false-friend'),
  q('To "attend" a meeting means to:', ['help organise it', 'be present at it', 'wait for it', 'cancel it'], 1, 'false-friend'),
  q('If someone "demands" an explanation, they:', ['politely ask for one', 'insist on one', 'suggest one', 'offer one'], 1, 'false-friend'),
  q('In a job application, a "resume" is a:', ['summary of a book', 'CV', 'cover letter', 'reference'], 1, 'false-friend'),
  q('An "issue" in this sentence is a problem: "We had an issue with the APU." It is not:', ['a matter', 'an exit', 'a difficulty', 'a concern'], 1, 'false-friend'),
  q('"The rest of the crew" means the ___ of the crew.', ['break', 'remainder', 'hotel', 'relief'], 1, 'false-friend'),
  q('Her "former" airline — not her "ancient" airline — means:', ['very old', 'previous', 'historic', 'antique'], 1, 'false-friend'),
  q('To "check" a document is not the same as to "control" it. "Control" here would mean:', ['verify', 'have power over', 'stamp', 'file'], 1, 'false-friend'),
  q('A "delay" is lateness. A French "délai" for a due date is a:', ['delay', 'deadline', 'diversion', 'hold'], 1, 'false-friend'),
  q('"Location" in English is a place. It does not mean:', ['position', 'rental of a car', 'site', 'spot'], 1, 'false-friend'),
  q('A "comprehensive" briefing is:', ['kind', 'complete', 'short', 'optional'], 1, 'false-friend'),
  q('He suffered an "injury". This is closest to:', ['an insult', 'physical harm', 'an injustice', 'fatigue'], 1, 'false-friend'),
  q('"This is the only spare." "Unique" would be wrong because it would mean:', ['the sole one', 'one of a kind / unusual', 'last', 'extra'], 1, 'false-friend'),
  q('In English, a "formidable" opponent is:', ['friendly', 'impressive or feared', 'ordinary', 'late'], 1, 'false-friend'),
  q('"Deception" means:', ['disappointment', 'misleading someone', 'a reception', 'fatigue'], 1, 'false-friend'),
  q('An "opportunity" is not the same as a "possibility". An opportunity is:', ['any chance that might happen', 'a favourable chance you can take', 'a risk', 'a rumour'], 1, 'false-friend'),
  q('In the US, "college" usually means:', ['high school', 'university-level education', 'a boarding house', 'primary school'], 1, 'false-friend'),
  q('You "pass" an exam; you do not "succeed an exam". Which is correct?', ['He succeeded the exam.', 'He passed the exam.', 'He succeeded to the exam.', 'He has success the exam.'], 1, 'false-friend'),
  q('Remind vs remember: "___ me to call operations."', ['Remember', 'Remind', 'Recall', 'Remain'], 1, 'false-friend'),
  q('You "earn" a salary; you "win" a competition. Which is correct?', ['She won 3,000 euros a month.', 'She earned 3,000 euros a month.', 'She gained a salary of win.', 'She won her wage.'], 1, 'false-friend'),
  q('Lend vs borrow: "Could you ___ me your headset?"', ['borrow', 'lend', 'rent', 'loaned'], 1, 'false-friend'),
  q('Say vs tell: "He ___ us the gate had changed."', ['said', 'told', 'talked', 'spoke'], 1, 'false-friend'),
  q('Wait / expect / hope: "We ___ to be airborne by 14:00." (planned, likely)', ['wait', 'expect', 'hope', 'attend'], 1, 'false-friend'),
  q('Affect vs effect: "Fatigue can ___ judgement."', ['effect', 'affect', 'affects to', 'effect on'], 1, 'false-friend'),
  q('Advice vs advise: "She gave me good ___."', ['advise', 'advice', 'advices', 'advising'], 1, 'false-friend'),
  q('Principle vs principal: "The ___ reason was fuel."', ['principle', 'principal', 'principled', 'principally'], 1, 'false-friend'),
  q('Quiet vs quite: "The cabin was ___ after pushback."', ['quite', 'quiet', 'quietly', 'quit'], 1, 'false-friend'),
  q('Fewer vs less: "___ passengers boarded than expected."', ['Less', 'Fewer', 'Lesser', 'Least'], 1, 'false-friend'),
  q('Economic vs economical: "An ___ engine burns less fuel."', ['economic', 'economical', 'economy', 'economist'], 1, 'false-friend'),
  q('Effective vs efficient: "The procedure was ___: it solved the problem."', ['efficient', 'effective', 'effect', 'affected'], 1, 'false-friend'),
  q('Historic vs historical: "It was a ___ first for the airline."', ['historical', 'historic', 'history', 'historian'], 1, 'false-friend'),
  q('Lie vs lay: "You should ___ down if you feel dizzy."', ['lay', 'lie', 'laid', 'lain'], 1, 'false-friend'),
  q('Loose vs lose: "Don\'t ___ your approach plate."', ['loose', 'lose', 'loss', 'lost'], 1, 'false-friend'),
  q('Its vs it\'s: "The aircraft has ___ own APU."', ['it\'s', 'its', 'its\'', 'it'], 1, 'false-friend'),

  // ---- Collocations ----
  q('We need to ___ a decision before noon.', ['make', 'do', 'take', 'have'], 0, 'collocation'),
  q('Please ___ attention to the safety card.', ['make', 'pay', 'give', 'put'], 1, 'collocation'),
  q('They will ___ a meeting at 08:00.', ['make', 'hold', 'do', 'pose'], 1, 'collocation'),
  q('She ___ a photo of the departure board.', ['made', 'took', 'did', 'had'], 1, 'collocation'),
  q('We cannot ___ the deadline.', ['touch', 'meet', 'win', 'catch'], 1, 'collocation'),
  q('He ___ a risk by departing with a short fuel figure.', ['made', 'ran', 'did', 'put'], 1, 'collocation'),
  q('The airline ___ a warning about volcanic ash.', ['did', 'issued', 'made', 'posed'], 1, 'collocation'),
  q('I need to ___ for a visa.', ['apply', 'ask', 'demand', 'require'], 0, 'collocation'),
  q('The delay ___ of three separate faults.', ['consisted', 'contained', 'composed', 'included in'], 0, 'collocation'),
  q('Success ___ on preparation.', ['depends', 'depends of', 'depends to', 'depends at'], 0, 'collocation'),
  q('She succeeded ___ getting the slot.', ['to', 'in', 'at', 'for'], 1, 'collocation'),
  q('He failed ___ notice the MEL item.', ['in', 'to', 'at', 'for'], 1, 'collocation'),
  q('I\'m not very good ___ mental arithmetic.', ['in', 'at', 'on', 'for'], 1, 'collocation'),
  q('She is keen ___ long-haul flying.', ['at', 'on', 'in', 'for'], 1, 'collocation'),
  q('We ___ a conclusion after the debrief.', ['took', 'drew', 'made', 'put'], 1, 'collocation'),
  q('___ rain delayed the inbound.', ['Strong', 'Heavy', 'Hard', 'Big'], 1, 'collocation'),
  q('I always ___ my promises.', ['save', 'keep', 'hold', 'stay'], 1, 'collocation'),
  q('He ___ a cold after the wet walk-around.', ['took', 'caught', 'had taken', 'picked'], 1, 'collocation'),
  q('They ___ business with several lessors.', ['make', 'do', 'have', 'work'], 1, 'collocation'),
  q('Please ___ a look at this NOTAM.', ['make', 'take', 'have', 'do'], 1, 'collocation'),
  q('The fog ___ a threat to the morning wave.', ['made', 'posed', 'did', 'put'], 1, 'collocation'),
  q('Passengers ___ the aircraft through the jetway.', ['entered in', 'boarded', 'embarked in', 'mounted'], 1, 'collocation'),
  q('I need to ___ this report before I leave.', ['file', 'fill', 'save', 'pose'], 0, 'collocation'),
  q('She ___ an exam next Monday.', ['passes', 'sits', 'does', 'gives'], 1, 'collocation'),

  // ---- Trouver l'erreur (autre façon de lire la phrase) ----
  q('Which part is wrong? "If I would have known, I would have stayed."', ['If', 'would have known', 'I would have', 'stayed'], 1, 'error'),
  q('Which part is wrong? "The informations we received were inaccurate."', ['The', 'informations', 'we received', 'were inaccurate'], 1, 'error'),
  q('Which part is wrong? "She suggested us to leave earlier."', ['She', 'suggested us to leave', 'earlier', 'No error'], 1, 'error'),
  q('Which part is wrong? "I am living here since 2018."', ['I', 'am living', 'here', 'since 2018'], 1, 'error'),
  q('Which part is wrong? "Despite of the fog, we departed."', ['Despite of', 'the fog', 'we', 'departed'], 0, 'error'),
  q('Which part is wrong? "She is the most tall of the two pilots."', ['She is', 'the most tall', 'of the two', 'pilots'], 1, 'error'),
  q('Which part is wrong? "I look forward to meet you."', ['I', 'look forward', 'to meet', 'you'], 2, 'error'),
  q('Which part is wrong? "Neither of the runways are long enough."', ['Neither of', 'the runways', 'are', 'long enough'], 2, 'error'),
  q('Which part is wrong? "She didn\'t used to like night flights."', ['She', 'didn\'t used', 'to like', 'night flights'], 1, 'error'),
  q('Which part is wrong? "We discussed about the new procedure."', ['We', 'discussed about', 'the new', 'procedure'], 1, 'error'),
  q('Which part is wrong? "I\'m agreeing with you on this point."', ['I\'m agreeing', 'with you', 'on this', 'point'], 0, 'error'),
  q('Which part is wrong? "He has went to the briefing room."', ['He', 'has went', 'to the', 'briefing room'], 1, 'error'),
  q('Which part is wrong? "The news are not encouraging."', ['The news', 'are', 'not', 'encouraging'], 1, 'error'),
  q('Which part is wrong? "I explained him the problem."', ['I', 'explained him', 'the', 'problem'], 1, 'error'),
  q('Which part is wrong? "She is married with a pilot."', ['She is', 'married with', 'a', 'pilot'], 1, 'error'),
  q('Which part is wrong? "I\'ll phone you when I will arrive."', ['I\'ll phone', 'you', 'when I will arrive', 'No error'], 2, 'error'),
  q('Which part is wrong? "He stopped to smoke last year." (meaning: he quit)', ['He', 'stopped to smoke', 'last year', 'No error'], 1, 'error'),
  q('Which part is wrong? "There is too much people in the queue."', ['There is', 'too much people', 'in the', 'queue'], 1, 'error'),
  q('Which part is wrong? "I prefer flying than driving."', ['I prefer', 'flying', 'than', 'driving'], 2, 'error'),
  q('Which part is wrong? "Between you and I, the slot looks tight."', ['Between', 'you and I', 'the slot', 'looks tight'], 1, 'error'),
  q('Which part is wrong? "Each of the pilots have a valid licence."', ['Each of', 'the pilots', 'have', 'a valid licence'], 2, 'error'),
  q('Which part is wrong? "I asked him where was the gate."', ['I asked him', 'where was the gate', 'No error', 'the gate'], 1, 'error'),

  // ---- Paraphrase / sens (lire pour le sens, pas le trou) ----
  q('Closest meaning: "The flight was called off owing to fog."', ['cancelled because of fog', 'delayed until the fog lifted', 'diverted around the fog', 'held because fog was forecast'], 0, 'paraphrase'),
  q('Closest meaning: "She barely made the briefing."', ['She missed it', 'She almost missed it', 'She skipped it', 'She ran it'], 1, 'paraphrase'),
  q('Closest meaning: "We might as well push now."', ['We must not push', 'There is little reason not to push', 'We will push later', 'Pushing is forbidden'], 1, 'paraphrase'),
  q('Closest meaning: "I couldn\'t help noticing the MEL."', ['I failed to notice it', 'I noticed it even though I didn\'t try to', 'I refused to notice it', 'I was told not to notice it'], 1, 'paraphrase'),
  q('Closest meaning: "The captain put off the decision."', ['cancelled it', 'postponed it', 'announced it', 'delegated it'], 1, 'paraphrase'),
  q('Closest meaning: "He takes after his father."', ['looks after him', 'resembles him', 'replaces him', 'follows him to work'], 1, 'paraphrase'),
  q('Closest meaning: "Let\'s get this over with."', ['Let\'s postpone it', 'Let\'s finish it (even if it\'s unpleasant)', 'Let\'s start it tomorrow', 'Let\'s cancel it'], 1, 'paraphrase'),
  q('Closest meaning: "I\'m afraid we\'re looking at a long delay."', ['I am frightened of delays', 'Unfortunately a long delay seems likely', 'I fear flying', 'We are searching for a delay'], 1, 'paraphrase'),
  q('Closest meaning: "She came up with a workaround."', ['she arrived with tools', 'she invented a solution', 'she climbed to the cockpit', 'she complained'], 1, 'paraphrase'),
  q('Closest meaning: "The figures don\'t add up."', ['the numbers are inconsistent', 'we must add more fuel', 'the sum is too small', 'we should count passengers again only'], 0, 'paraphrase'),
  q('Closest meaning: "He is by no means ready."', ['he is almost ready', 'he is not ready at all', 'he is ready in some ways', 'he will be ready soon'], 1, 'paraphrase'),
  q('Closest meaning: "We ran short of time."', ['we had more time than needed', 'we did not have enough time', 'time passed slowly', 'we stopped the clock'], 1, 'paraphrase'),
  q('Closest meaning: "On second thoughts, hold the push."', ['after reconsidering, don\'t push yet', 'push twice', 'think while pushing', 'push immediately'], 0, 'paraphrase'),
  q('Closest meaning: "The weather is bound to improve."', ['it might improve', 'it is certain, or very likely, to improve', 'it is forbidden to improve', 'it improved already'], 1, 'paraphrase'),
  q('Closest meaning: "I take your point."', ['I will take notes', 'I understand your argument', 'I disagree fully', 'I will point at you'], 1, 'paraphrase'),
  q('Closest meaning: "She saw through the excuse."', ['she believed it', 'she understood it was not genuine', 'she ignored it', 'she wrote it down'], 1, 'paraphrase'),
  q('Closest meaning: "We\'re cutting it fine."', ['we have plenty of margin', 'we have very little margin', 'we are cancelling', 'we are early'], 1, 'paraphrase'),
  q('Closest meaning: "He turned down the offer."', ['he reduced the volume', 'he refused it', 'he accepted it later', 'he postponed it'], 1, 'paraphrase'),
  q('Closest meaning: "The inbound is running behind."', ['it is early', 'it is late', 'it is pushing back', 'it is overhead'], 1, 'paraphrase'),
  q('Closest meaning: "I\'ll take it from here."', ['I will start from this airport', 'I will continue and handle the rest', 'I will take this aircraft away', 'I will copy the procedure'], 1, 'paraphrase'),
  q('Closest meaning: "That\'s neither here nor there."', ['it is irrelevant', 'it is nearby', 'it is classified', 'it is urgent'], 0, 'paraphrase'),
  q('Closest meaning: "She kept her temper."', ['she stayed angry', 'she did not lose her calm', 'she raised her voice', 'she left the room'], 1, 'paraphrase'),
];

const PASSAGES: { text: string; questions: Omit<AnglaisItem, 'kind' | 'passage'>[] }[] = [
  ...MORE_PASSAGES,
  {
    text: 'Owing to a technical issue identified during the walk-around, flight AF1842 to Lisbon will not depart at the scheduled time. Engineering has requested a part that is not available on site; it is being driven from a nearby station and is expected within ninety minutes. Passengers already on board will be invited to return to the terminal, where vouchers for refreshments will be issued. A new departure time will be announced as soon as the aircraft is released. Connecting passengers should speak to the transfer desk before leaving the gate area.',
    questions: [
      {
        stem: 'According to the text, why is the flight delayed?',
        choices: ['Bad weather in Lisbon', 'A technical problem found before departure', 'A missing crew member', 'Airport congestion'],
        correct: 1,
      },
      {
        stem: 'What should connecting passengers do?',
        choices: ['Stay seated on the aircraft', 'Go to baggage reclaim immediately', 'Contact the transfer desk before leaving the gate area', 'Call engineering'],
        correct: 2,
      },
      {
        stem: 'In this text, "released" is closest to:',
        choices: ['freed from a contract', 'declared fit to depart', 'cancelled', 'sold'],
        correct: 1,
      },
    ],
  },
  {
    text: 'All crew must complete the online dangerous-goods refresher before the last day of the month. The module takes about forty minutes and cannot be paused once started, so set aside an uninterrupted slot. A score of 80% is required; you may sit the test twice. Failure to complete the module on time will result in being removed from the roster until the certificate is valid again. Questions about access codes should be sent to training@airline.example, not to your base captain.',
    questions: [
      {
        stem: 'What happens if a crew member misses the deadline?',
        choices: ['A fine is deducted from pay', 'They cannot be rostered until certified again', 'They must repeat initial training', 'Nothing; it is optional'],
        correct: 1,
      },
      {
        stem: 'Which statement is true?',
        choices: ['The module can be paused at any time', 'You get unlimited attempts', 'You need 80% and may try twice', 'Ask your base captain for the access code'],
        correct: 2,
      },
      {
        stem: 'The tone of the memo is mainly:',
        choices: ['informal and joking', 'procedural and compulsory', 'advertising a course', 'a personal apology'],
        correct: 1,
      },
    ],
  },
  {
    text: 'Low-visibility procedures are in force until at least 11:00 local. Landings are restricted to Runway 26L; 26R remains closed for rubber removal. Taxi times from the cargo apron may exceed twenty-five minutes. Operators are advised to add fuel for a possible hold of up to twelve minutes. If the RVR falls below 300 metres, arrivals will be diverted to the alternate published in the briefing pack. Crews should not request 26R even if it appears clear on the visual dock.',
    questions: [
      {
        stem: 'Which runway may be used for landing?',
        choices: ['26R only', '26L only', 'Either 26L or 26R', 'Neither; the airport is closed'],
        correct: 1,
      },
      {
        stem: 'What should operators plan extra fuel for?',
        choices: ['A possible hold of up to twelve minutes', 'A diversion to another country', 'De-icing on 26R', 'A second approach on 26R'],
        correct: 0,
      },
      {
        stem: 'If RVR drops below 300 m, traffic will:',
        choices: ['use 26R', 'hold indefinitely', 'divert to the published alternate', 'cancel all flights'],
        correct: 2,
      },
    ],
  },
  {
    text: 'The cadet scheme is designed for applicants who already hold a solid academic record and a genuine motivation for airline operations. Shortlisted candidates complete an online assessment weekend covering reasoning, English, and aviation knowledge. Those who pass are invited to a later assessment centre. The company stresses that English is not a memory test of irregular verbs alone: assessors look for the ability to follow a written brief, extract what matters, and answer under time pressure. Preparation that only drills gap-fills is therefore incomplete.',
    questions: [
      {
        stem: 'What does the company say English should demonstrate?',
        choices: ['Perfect British accent', 'The ability to follow a brief and answer under time pressure', 'Knowledge of every irregular verb', 'Pilot licence theory'],
        correct: 1,
      },
      {
        stem: 'According to the text, gap-fill drilling alone is:',
        choices: ['sufficient', 'forbidden', 'incomplete preparation', 'the main exam format'],
        correct: 2,
      },
      {
        stem: '"Shortlisted" candidates are those who:',
        choices: ['failed the first step', 'were selected to go further', 'already work for the airline', 'hold an ATPL'],
        correct: 1,
      },
    ],
  },
  {
    text: 'I am writing regarding yesterday\'s flight from Lyon. We boarded on time, but then sat at the gate for almost an hour with no explanation. When an announcement finally came, it was in French only, although several passengers around me were clearly not French speakers. The cabin temperature was uncomfortably high. I do not expect compensation so much as an acknowledgement and a clearer policy on bilingual updates during long holds. I would appreciate a reply within ten working days.',
    questions: [
      {
        stem: 'The writer\'s main complaint is about:',
        choices: ['lost baggage', 'poor communication during a long hold, and heat', 'a cancelled flight', 'rude security staff'],
        correct: 1,
      },
      {
        stem: 'What does the writer want most?',
        choices: ['A large refund', 'An acknowledgement and better bilingual announcements', 'A free upgrade', 'The captain\'s name'],
        correct: 1,
      },
      {
        stem: '"Acknowledgement" here means:',
        choices: ['a payment', 'recognition that the problem occurred', 'a legal admission of guilt', 'a new ticket'],
        correct: 1,
      },
    ],
  },
  {
    text: 'Jet lag is not simply tiredness: it is a mismatch between your body clock and local time. Eastbound trips tend to be harder than westbound ones because they shorten the day. Useful habits include getting daylight in the morning at destination, avoiding long naps late in the afternoon, and being cautious with caffeine after lunch. Sleeping tablets may help some people on the first night, but they do not reset the clock by themselves. Hydration matters more than most travellers think; cabin air is dry and mild dehydration worsens grogginess.',
    questions: [
      {
        stem: 'Why are eastbound trips often harder?',
        choices: ['They lengthen the day', 'They shorten the day', 'They always involve more sectors', 'Cabins are louder going east'],
        correct: 1,
      },
      {
        stem: 'According to the text, sleeping tablets:',
        choices: ['fully reset the body clock', 'are useless', 'may help the first night but do not reset the clock alone', 'must be taken with caffeine'],
        correct: 2,
      },
      {
        stem: 'What does the author say about hydration?',
        choices: ['It is overrated', 'It matters more than people think', 'Only water after landing helps', 'Coffee replaces water'],
        correct: 1,
      },
    ],
  },
  {
    text: 'Night maintenance on stand 41 will close the inner taxi lane between 22:30 and 05:00 for three consecutive nights, starting Monday. Towing to the hangar must be completed before 22:15. Any aircraft still on the stand after that time will remain until morning, which may disrupt the first wave. The work cannot be postponed: a structural inspection is overdue. Please brief dispatch and the night engineer in person; an email was sent last week but several teams reported they had not seen it.',
    questions: [
      {
        stem: 'What is the latest time to finish towing?',
        choices: ['22:30', '22:15', '05:00', 'Monday noon'],
        correct: 1,
      },
      {
        stem: 'Why must the work go ahead?',
        choices: ['A union rule', 'A structural inspection is overdue', 'The hangar is empty', 'Noise restrictions'],
        correct: 1,
      },
      {
        stem: 'Why does the writer also want an in-person brief?',
        choices: ['Email is forbidden', 'Some teams missed last week\'s email', 'The CEO requested it', 'Radios are down'],
        correct: 1,
      },
    ],
  },
  {
    text: 'The airline has signed a letter of intent for twenty-four single-aisle aircraft, with purchase rights for twelve more. Deliveries would begin in 2029 if the board gives final approval in November. Management argues the type burns less fuel per seat than the oldest jets in the current fleet, which is essential if carbon costs keep rising. Unions have asked whether the order means slower hiring of cadets. The company answered that growth and retirements should still require new pilots, but it declined to publish numbers.',
    questions: [
      {
        stem: 'How many aircraft are firmly covered by the letter of intent?',
        choices: ['Twelve', 'Twenty-four', 'Thirty-six', 'The text does not say'],
        correct: 1,
      },
      {
        stem: 'When could deliveries start, if approved?',
        choices: ['This year', 'November this year', '2029', 'After carbon costs fall'],
        correct: 2,
      },
      {
        stem: 'What did the company refuse to do?',
        choices: ['Talk to unions', 'Publish hiring numbers', 'Order any aircraft', 'Retire old jets'],
        correct: 1,
      },
    ],
  },
  {
    text: 'If you are number two in a sequence of four aircraft taxiing to 26L, do not overtake unless ATC explicitly clears you. The aircraft ahead may be holding short for a wake-turbulence gap you cannot see from the flight deck. Switching to ground frequency before the transfer point creates a gap in the picture for the controller. Read back holds and runway crossing clearances in full. If you are unsure whether a clearance was for you, ask; assuming it was is how incursions start.',
    questions: [
      {
        stem: 'When may you overtake the aircraft ahead?',
        choices: ['If you are faster', 'Never', 'Only if ATC explicitly clears you', 'After switching frequency'],
        correct: 2,
      },
      {
        stem: 'Why might the aircraft ahead be holding?',
        choices: ['Fuel leak', 'A wake-turbulence gap you cannot see', 'Customs', 'A broken nosewheel'],
        correct: 1,
      },
      {
        stem: 'What should you do if you are unsure a clearance was for you?',
        choices: ['Assume it was', 'Ask', 'Continue anyway', 'Switch frequency'],
        correct: 1,
      },
    ],
  },
  {
    text: 'The assessment centre begins with a group exercise: twelve candidates discuss how to allocate a limited training-budget across simulators, language support, and wellbeing. Examiners watch whether you listen, whether you build on other people\'s points, and whether you can disagree without shutting someone down. Speaking more than the others is not a score in itself. In the afternoon, a one-to-one interview probes motivation and how you handled a real setback. Answers that sound memorised tend to fall apart when the interviewer asks "Can you give another example?"',
    questions: [
      {
        stem: 'What do examiners watch for in the group exercise?',
        choices: ['Who speaks the most', 'Listening, building on points, and disagreeing respectfully', 'Perfect grammar only', 'Who knows the budget figures'],
        correct: 1,
      },
      {
        stem: 'Why do memorised answers often fail?',
        choices: ['They are too short', 'A follow-up like "another example" exposes them', 'English is not allowed', 'They are always off-topic'],
        correct: 1,
      },
      {
        stem: '"Setback" is closest to:',
        choices: ['a promotion', 'a difficulty or failure you had to deal with', 'a bonus', 'a roster'],
        correct: 1,
      },
    ],
  },
];

function shuffleItem(item: AnglaisItem): AnglaisItem {
  const indexed = item.choices.map((choice, i) => ({ choice, i }));
  const shuffled = shuffle(indexed);
  const correct = shuffled.findIndex((x) => x.i === item.correct);
  return {
    ...item,
    choices: shuffled.map((x) => x.choice) as [string, string, string, string],
    correct,
  };
}

function take<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

function insertBlock<T>(base: T[], block: T[]): T[] {
  if (block.length === 0) return shuffle(base);
  const pos = Math.floor(Math.random() * (base.length + 1));
  return [...base.slice(0, pos), ...block, ...base.slice(pos)];
}

function readingItemsFromPassage(
  passage: (typeof PASSAGES)[number],
): AnglaisItem[] {
  return passage.questions.map((item) => ({
    ...item,
    kind: 'reading' as const,
    passage: passage.text,
  }));
}

export function allAnglaisItems(): AnglaisItem[] {
  const reading = PASSAGES.flatMap(readingItemsFromPassage);
  return [...CLASSIC_ANGLAIS_BANK, ...EXTRA_ANGLAIS_BANK, ...reading];
}

export function pickAnglaisQuestions(count: number): AnglaisItem[] {
  const n = Math.max(1, count);
  const passageCount = n >= 40 ? 2 : n >= 16 ? 1 : 0;
  const reading: AnglaisItem[] = [];
  for (const passage of shuffle(PASSAGES)) {
    if (reading.length / 3 >= passageCount) break;
    const block = readingItemsFromPassage(passage);
    if (reading.length + block.length > n) continue;
    reading.push(...block);
    if (Math.floor(reading.length / 3) >= passageCount) break;
  }

  const remaining = n - reading.length;
  const pools: Record<string, AnglaisItem[]> = {
    classic: [...CLASSIC_ANGLAIS_BANK],
    tense: EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'tense'),
    structure: EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'structure'),
    'false-friend': EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'false-friend'),
    collocation: EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'collocation'),
    error: EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'error'),
    paraphrase: EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'paraphrase'),
    connector: EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'connector'),
    inference: EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'inference'),
    register: EXTRA_ANGLAIS_BANK.filter((i) => i.kind === 'register'),
  };

  const weights: [string, number][] = [
    ['classic', 0.18],
    ['tense', 0.12],
    ['structure', 0.10],
    ['false-friend', 0.11],
    ['collocation', 0.09],
    ['error', 0.09],
    ['paraphrase', 0.09],
    ['connector', 0.08],
    ['inference', 0.08],
    ['register', 0.06],
  ];

  const standalone: AnglaisItem[] = [];
  const used = new Set<string>();
  for (const [kind, w] of weights) {
    const want = Math.max(0, Math.round(remaining * w));
    for (const item of take(pools[kind], want)) {
      if (used.has(item.stem) || standalone.length >= remaining) continue;
      used.add(item.stem);
      standalone.push(item);
    }
  }

  if (standalone.length < remaining) {
    const leftover = shuffle(
      [...CLASSIC_ANGLAIS_BANK, ...EXTRA_ANGLAIS_BANK].filter((i) => !used.has(i.stem)),
    );
    for (const item of leftover) {
      if (standalone.length >= remaining) break;
      used.add(item.stem);
      standalone.push(item);
    }
  }

  return insertBlock(standalone.slice(0, remaining), reading)
    .slice(0, n)
    .map(shuffleItem);
}
