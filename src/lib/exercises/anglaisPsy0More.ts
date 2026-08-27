function q(
  stem: string,
  choices: [string, string, string, string],
  correct: number,
  kind:
    | 'tense'
    | 'structure'
    | 'false-friend'
    | 'collocation'
    | 'error'
    | 'paraphrase'
    | 'connector'
    | 'inference'
    | 'register',
) {
  return { stem, choices, correct, kind };
}

/** Items plus difficiles / autre mode de lecture — completer la banque principale. */
export const MORE_EXTRA_ANGLAIS_BANK = [
  // ---- Temps / aspect ----
  q('This time next week they ___ the type rating.', ['start', 'will start', 'will be starting', 'started'], 2, 'tense'),
  q('I would rather she ___ the radios during taxi.', ['handles', 'handled', 'to handle', 'handling'], 1, 'tense'),
  q('The moment the fog ___, we will start the engines.', ['will lift', 'lifts', 'lifted', 'would lift'], 1, 'tense'),
  q('He ___ the walk-around when the engineer called him back.', ['just finished', 'had just finished', 'has just finished', 'finishes'], 1, 'tense'),
  q('I ___ to call you, but the radio failed.', ['meant', 'was meaning', 'have meant', 'mean'], 0, 'tense'),
  q('She ___ three sectors by the time you arrive.', ['will fly', 'will have flown', 'flies', 'is flying'], 1, 'tense'),
  q('If you ___ into icing, report it immediately.', ['will fly', 'fly', 'flew', 'would fly'], 1, 'tense'),
  q('I wish the slot ___ later.', ['is', 'were', 'will be', 'has been'], 1, 'tense'),
  q('They ___ on this MEL item for hours; it still is not closed.', ['work', 'are working', 'have been working', 'had worked'], 2, 'tense'),
  q('Scarcely ___ the chocks in when the bus arrived.', ['we put', 'had we put', 'we had put', 'did we putted'], 1, 'tense'),
  q('I ___ you were already on frequency.', ['didn\'t realise', 'haven\'t realised', 'hadn\'t been realise', 'am not realising'], 0, 'tense'),
  q('By the time the spare arrived, we ___ for two hours.', ['waited', 'have waited', 'had been waiting', 'are waiting'], 2, 'tense'),
  q('She asked whether we ___ a later slot.', ['can get', 'could get', 'will get', 'getting'], 1, 'tense'),
  q('If it ___ for the hold, we would have been on time.', ['was not', 'were not', 'had not been', 'is not'], 2, 'tense'),
  q('I ___ this approach twice before today.', ['flew', 'have flown', 'had fly', 'am flying'], 1, 'tense'),
  q('He behaves as though he ___ the chief pilot.', ['is', 'were', 'has been', 'will be'], 1, 'tense'),
  q('Passengers ___ smoke in the cabin at any time.', ['mustn\'t', 'mustn\'t to', 'don\'t have', 'needn\'t to'], 0, 'tense'),
  q('I would have signed if I ___ the discrepancy.', ['saw', 'have seen', 'had seen', 'would see'], 2, 'tense'),
  q('Next time you ___ through CDG, try the shorter taxi.', ['will go', 'go', 'went', 'are go'], 1, 'tense'),
  q('The light ___ for ten minutes before anyone noticed.', ['flashed', 'has flashed', 'had been flashing', 'is flashing'], 2, 'tense'),

  // ---- Structure ----
  q('I\'d prefer ___ the radios myself.', ['you handle', 'to handle', 'handling', 'handle'], 1, 'structure'),
  q('Under no circumstances ___ the MEL be ignored.', ['the crew should', 'should the crew', 'the crew', 'does the crew'], 1, 'structure'),
  q('Little ___ that the inbound was already on the ground.', ['we knew', 'did we know', 'we did knew', 'we know'], 1, 'structure'),
  q('It was not until dusk ___ they found the leak.', ['that', 'when', 'then', 'which'], 0, 'structure'),
  q('The spare, ___ was ordered yesterday, still has not arrived.', ['who', 'which', 'what', 'where'], 1, 'structure'),
  q('___ happens, do not cross the hold-short line.', ['Whatever', 'Whenever', 'Wherever', 'However much'], 0, 'structure'),
  q('She is the only one ___ the procedure by heart.', ['which knows', 'who knows', 'that know', 'knows who'], 1, 'structure'),
  q('We had the APU ___ during the turnaround.', ['to run', 'running', 'run', 'ran'], 2, 'structure'),
  q('There is no point ___ now; the slot is gone.', ['to wait', 'waiting', 'wait', 'in wait'], 1, 'structure'),
  q('He is rumoured ___ the company last month.', ['to leave', 'to have left', 'leaving', 'left'], 1, 'structure'),
  q('___ we to divert, the alternate has fuel.', ['Should', 'Would', 'If', 'Were'], 3, 'structure'),
  q('The sooner we push, ___ we get the slot.', ['better', 'the better', 'the best', 'more better'], 1, 'structure'),
  q('I object to ___ treated as optional.', ['be', 'being', 'been', 'have been'], 1, 'structure'),
  q('They made us ___ the module again.', ['to sit', 'sit', 'sitting', 'sat'], 1, 'structure'),
  q('It is vital that every item ___ checked.', ['is', 'be', 'was', 'being'], 1, 'structure'),
  q('___ I known about the fog, I would have tankered.', ['Had', 'Have', 'Did', 'If'], 0, 'structure'),
  q('This is the hangar ___ we store the winter kits.', ['which', 'where', 'who', 'what'], 1, 'structure'),
  q('She has two brothers, both of ___ are engineers.', ['who', 'whom', 'which', 'them'], 1, 'structure'),
  q('___ anyone object, we will file the plan as drafted.', ['Should', 'Would', 'May', 'Shall'], 0, 'structure'),
  q('He is too tired ___ another sector.', ['for fly', 'to fly', 'flying', 'that he flies'], 1, 'structure'),

  // ---- Faux amis ----
  q('In a French CV, a "stage" is usually an ___, not a theatre platform.', ['internship', 'stage play', 'engine stage', 'boarding gate'], 0, 'false-friend'),
  q('She has ten years\' ___ on jets; that is not a lab test.', ['experiment', 'experience', 'expertise test', 'essai'], 1, 'false-friend'),
  q('They ran an ___ in the simulator to test the new drill.', ['experience', 'experiment', 'expertise', 'essai'], 1, 'false-friend'),
  q('"Ignore" in English means you deliberately pay no attention. French "ignorer" often means:', ['to insult', 'not to know', 'to delay', 'to cancel'], 1, 'false-friend'),
  q('A "phrase" in English is a group of words. A full "phrase" in French is usually a:', ['sentence', 'paragraph', 'title', 'verb only'], 0, 'false-friend'),
  q('To "assist" someone is to help them. To be present at a meeting is to ___ it.', ['assist at', 'attend', 'assist to', 'help at'], 1, 'false-friend'),
  q('"Hazard" in English is a danger. French "hasard" is closer to:', ['chance', 'fuel', 'delay', 'anger'], 0, 'false-friend'),
  q('A hotel "caution" in French is a deposit. In English "caution" is mainly a:', ['warning', 'refund', 'receipt', 'password'], 0, 'false-friend'),
  q('"Fabric" is cloth. A factory is not a fabric; a factory is a:', ['plant / works', 'library', 'runway', 'roster'], 0, 'false-friend'),
  q('"Habit" is a custom. Clothes are not "habits"; they are:', ['clothes', 'customs', 'habits wear', 'uniforms only'], 0, 'false-friend'),
  q('If you are "engaged" to someone, you are ___. If a line is engaged, it is ___.', ['hired / free', 'betrothed / busy', 'angry / late', 'trained / empty'], 1, 'false-friend'),
  q('"Magazine" is a publication. A shop is not a magazine; a shop is a:', ['store', 'journal', 'hangar', 'brief'], 0, 'false-friend'),
  q('French "préjudice" (harm) is not English "prejudice". Prejudice is:', ['a bias', 'an injury', 'a delay', 'a tax'], 0, 'false-friend'),
  q('To "achieve" a result is to succeed in getting it. It does not mean merely to:', ['finish something with no result implied', 'reach a goal', 'accomplish a target', 'obtain a result'], 0, 'false-friend'),
  q('An "agenda" in English is a meeting list of topics. A diary for appointments is a:', ['diary / calendar', 'agenda book always', 'roster only', 'NOTAM'], 0, 'false-friend'),
  q('"Chef" in English is a cook. Your line manager is your:', ['chef', 'boss / manager', 'cook', 'captain always'], 1, 'false-friend'),
  q('"Injury" is physical harm. An insult is not an injury in ordinary English; an insult is:', ['an offensive remark', 'a broken bone', 'a delay', 'a fine'], 0, 'false-friend'),
  q('To "resume" work is to start again. A CV is a "résumé". Which is correct after a hold?', ['We resumed taxi.', 'We résumé taxi.', 'We recovered taxi the hold.', 'We assumed taxi.'], 0, 'false-friend'),
  q('"Location" is a place. Renting a car is not "location"; it is:', ['hire / rental', 'a location', 'a delay', 'a briefing'], 0, 'false-friend'),
  q('French "complet" (full, no seats) is not "complete". "The flight is complete" would sound like:', ['it is finished / whole', 'it is full of passengers', 'it is delayed', 'it is cancelled'], 0, 'false-friend'),
  q('"Important" and "significant" overlap, but "an important person" is not always "a significant person". "Significant" stresses:', ['being a VIP', 'meaning or effect', 'being late', 'being polite'], 1, 'false-friend'),
  q('To "pass a remark" can mean to make a comment. To succeed in a test you ___ it.', ['succeed', 'pass', 'win', 'have reason'], 1, 'false-friend'),
  q('"Actuellement" is "currently", not "actually". "Actually" is closest to:', ['in fact', 'now', 'soon', 'maybe'], 0, 'false-friend'),
  q('A "conference" is a meeting. The telephone feature is a "call". Which is correct?', ['I am in a meeting.', 'I am in conference the phone.', 'I make a conference to him.', 'I am on meeting.'], 0, 'false-friend'),
  q('"Blessé" after an accident is "injured", not "blessed". Blessed means:', ['holy / fortunate', 'hurt', 'late', 'angry'], 0, 'false-friend'),

  // ---- Collocations ----
  q('They ___ an agreement after a long negotiation.', ['did', 'reached', 'made up', 'put'], 1, 'collocation'),
  q('Please ___ me a favour and bring the spare headset.', ['make', 'do', 'give', 'have'], 1, 'collocation'),
  q('The captain ___ the blame for the late push.', ['made', 'took', 'did', 'had'], 1, 'collocation'),
  q('We must ___ action before the slot expires.', ['make', 'take', 'do', 'put'], 1, 'collocation'),
  q('She ___ a speech at the safety day.', ['made', 'did', 'said', 'spoke'], 0, 'collocation'),
  q('I don\'t ___ a chance of getting that roster.', ['stand', 'sit', 'keep', 'hold'], 0, 'collocation'),
  q('The airline ___ a surcharge for extra bags.', ['does', 'makes', 'puts', 'imposes'], 3, 'collocation'),
  q('He ___ his word and arrived at 05:00.', ['kept', 'held', 'saved', 'took'], 0, 'collocation'),
  q('We ___ sight of the field in the haze.', ['lost', 'missed', 'left', 'dropped'], 0, 'collocation'),
  q('The delay ___ havoc with connections.', ['made', 'played', 'did', 'put'], 1, 'collocation'),
  q('Don\'t ___ rumours in the crew room.', ['fuel', 'fire', 'burn', 'oil'], 0, 'collocation'),
  q('They ___ a complaint with the handling agent.', ['did', 'lodged', 'put', 'said'], 1, 'collocation'),
  q('I need to ___ my English before the centre.', ['raise', 'brush up', 'grow', 'higher'], 1, 'collocation'),
  q('The fog ___ in just after dawn.', ['set', 'put', 'made', 'took'], 0, 'collocation'),
  q('She ___ a habit of checking the MEL twice.', ['made', 'did', 'took', 'got'], 0, 'collocation'),
  q('We ___ the risk of a long taxi into the fuel plan.', ['took account of', 'took account', 'made account of', 'did account'], 0, 'collocation'),
  q('He ___ notice of the revised minima.', ['took', 'made', 'had', 'did'], 0, 'collocation'),
  q('The company ___ a profit last quarter.', ['did', 'made', 'won', 'had done'], 1, 'collocation'),
  q('___ a rest before the night sector.', ['Make', 'Do', 'Have', 'Take'], 3, 'collocation'),
  q('They ___ talks with the union on Friday.', ['held', 'did', 'made', 'said'], 0, 'collocation'),

  // ---- Erreurs ----
  q('Which part is wrong? "I am used to get up at four."', ['I am', 'used to get', 'up at', 'four'], 1, 'error'),
  q('Which part is wrong? "She recommended me to apply."', ['She', 'recommended me to apply', 'No error', 'apply'], 1, 'error'),
  q('Which part is wrong? "The police is coming." (meaning: officers)', ['The police', 'is', 'coming', 'No error'], 1, 'error'),
  q('Which part is wrong? "I have been to London last week."', ['I', 'have been', 'to London', 'last week'], 1, 'error'),
  q('Which part is wrong? "He is knowing the answer."', ['He', 'is knowing', 'the', 'answer'], 1, 'error'),
  q('Which part is wrong? "We arrived to the airport at six."', ['We', 'arrived to', 'the airport', 'at six'], 1, 'error'),
  q('Which part is wrong? "It depends of the weather."', ['It', 'depends of', 'the', 'weather'], 1, 'error'),
  q('Which part is wrong? "I look forward to hear from you."', ['I', 'look forward', 'to hear', 'from you'], 2, 'error'),
  q('Which part is wrong? "She is good in English."', ['She is', 'good in', 'English', 'No error'], 1, 'error'),
  q('Which part is wrong? "I have difficulty to sleep after a night flight."', ['I have', 'difficulty to sleep', 'after a', 'night flight'], 1, 'error'),
  q('Which part is wrong? "Despite the fact the fog, we departed."', ['Despite', 'the fact the fog', 'we', 'departed'], 1, 'error'),
  q('Which part is wrong? "I look forward for your reply."', ['I', 'look forward', 'for', 'your reply'], 2, 'error'),
  q('Which part is wrong? "One of the aircraft are still on stand."', ['One of', 'the aircraft', 'are', 'still on stand'], 2, 'error'),
  q('Which part is wrong? "I am agree with the plan."', ['I', 'am agree', 'with the', 'plan'], 1, 'error'),
  q('Which part is wrong? "She entered in the cockpit."', ['She', 'entered in', 'the', 'cockpit'], 1, 'error'),
  q('Which part is wrong? "We discussed about fuel."', ['We', 'discussed about', 'fuel', 'No error'], 1, 'error'),
  q('Which part is wrong? "I didn\'t see nothing unusual."', ['I', 'didn\'t see nothing', 'unusual', 'No error'], 1, 'error'),
  q('Which part is wrong? "The both runways are wet."', ['The both', 'runways', 'are', 'wet'], 0, 'error'),
  q('Which part is wrong? "He is the more experienced as the two."', ['He is', 'the more experienced as', 'the two', 'No error'], 1, 'error'),
  q('Which part is wrong? "I told to him the gate number."', ['I', 'told to him', 'the gate', 'number'], 1, 'error'),

  // ---- Paraphrase ----
  q('Closest meaning: "We are in the same boat."', ['we share the same situation', 'we fly the same type', 'we sit in one boat', 'we agree on everything'], 0, 'paraphrase'),
  q('Closest meaning: "It goes without saying that safety comes first."', ['it is so obvious it need not be stated', 'nobody talks about safety', 'safety is optional', 'we must say it twice'], 0, 'paraphrase'),
  q('Closest meaning: "She is bound to be tired after that sector."', ['she is very likely to be tired', 'she is forbidden to be tired', 'she is tied up', 'she refused to be tired'], 0, 'paraphrase'),
  q('Closest meaning: "The spare is out of the question."', ['it cannot be considered', 'it is outside the hangar', 'someone asked a question', 'it is available'], 0, 'paraphrase'),
  q('Closest meaning: "He made light of the delay."', ['he treated it as unimportant', 'he turned the lights off', 'he cancelled the flight', 'he measured the delay'], 0, 'paraphrase'),
  q('Closest meaning: "I could do with a rest."', ['I would like / need a rest', 'I finished a rest', 'I cannot rest', 'I refuse to rest'], 0, 'paraphrase'),
  q('Closest meaning: "The figures are on the high side."', ['they are rather high', 'they are too low', 'they are exact', 'they are missing'], 0, 'paraphrase'),
  q('Closest meaning: "Let us split the difference."', ['meet halfway', 'cancel both offers', 'double the number', 'ignore the number'], 0, 'paraphrase'),
  q('Closest meaning: "That is beside the point."', ['it is irrelevant', 'it is next to the aircraft', 'it is the main issue', 'it is classified'], 0, 'paraphrase'),
  q('Closest meaning: "She got away with a warning."', ['she received only a warning, not worse', 'she escaped the airport', 'she warned everyone', 'she cancelled the warning'], 0, 'paraphrase'),
  q('Closest meaning: "We will cross that bridge when we come to it."', ['deal with it only when it happens', 'divert to another airfield now', 'build a new taxiway', 'ignore future problems forever'], 0, 'paraphrase'),
  q('Closest meaning: "He is snowed under with reports."', ['he has far too much work', 'he is at a snowy airport', 'he lost the reports', 'he enjoys writing'], 0, 'paraphrase'),
  q('Closest meaning: "The idea fell through."', ['it failed / did not happen', 'it was approved', 'it fell off the table', 'it was postponed only by one hour'], 0, 'paraphrase'),
  q('Closest meaning: "I will take your word for it."', ['I will believe you without proof', 'I will write your words down', 'I refuse to believe you', 'I will tell the captain'], 0, 'paraphrase'),
  q('Closest meaning: "The meeting dragged on."', ['it lasted longer than it should', 'it was cancelled', 'it started early', 'it was very short'], 0, 'paraphrase'),
  q('Closest meaning: "She is up to the job."', ['she is capable of doing it', 'she is tired of the job', 'she is late for the job', 'she refused the job'], 0, 'paraphrase'),
  q('Closest meaning: "We had better leave some margin."', ['it would be wise to leave some margin', 'we already left too much', 'margin is forbidden', 'we must leave immediately'], 0, 'paraphrase'),
  q('Closest meaning: "He talked the agent into a later slot."', ['he persuaded the agent', 'he insulted the agent', 'he ignored the agent', 'he paid a fine'], 0, 'paraphrase'),
  q('Closest meaning: "The inbound is few and far between at this hour."', ['there are not many inbounds now', 'inbounds are very close', 'all inbounds are cancelled', 'the inbound is on final'], 0, 'paraphrase'),
  q('Closest meaning: "I will sit this one out."', ['I will not take part this time', 'I will sit in the jump seat', 'I will delay the flight', 'I will lead the meeting'], 0, 'paraphrase'),

  // ---- Articulateurs (logique du discours, pas un trou de vocabulaire isolé) ----
  q('___ the short notice, eight people volunteered.', ['Despite', 'Although', 'However', 'Whereas'], 0, 'connector'),
  q('We will go ahead ___ the weather holds.', ['provided', 'unless', 'despite', 'although'], 0, 'connector'),
  q('He is quiet, ___ he is not shy.', ['yet', 'so', 'because', 'despite'], 0, 'connector'),
  q('___ you object, I will send the pack tonight.', ['Unless', 'Provided', 'Despite', 'Whereas'], 0, 'connector'),
  q('The inbound is late; ___ we will miss the slot.', ['therefore', 'although', 'despite', 'unless'], 0, 'connector'),
  q('She trained in France, ___ he trained in the UK.', ['whereas', 'despite', 'unless', 'therefore'], 0, 'connector'),
  q('Take a torch ___ the power fails.', ['in case', 'unless', 'so that', 'despite'], 0, 'connector'),
  q('___ being tired, she flew the sector.', ['Despite', 'Although', 'However', 'Because'], 0, 'connector'),
  q('___ she was tired, she flew the sector.', ['Although', 'Despite', 'However', 'In spite'], 0, 'connector'),
  q('We stayed ___ the weather deteriorated.', ['even though', 'despite', 'however', 'in case'], 0, 'connector'),
  q('You can use the spare ___ it is serviceable.', ['as long as', 'as soon as', 'as well as', 'as far as it'], 0, 'connector'),
  q('Call me ___ you land.', ['as soon as', 'as long as', 'as well as', 'as if'], 0, 'connector'),
  q('He left early ___ miss the traffic.', ['so as to', 'so that', 'in case', 'despite'], 0, 'connector'),
  q('Speak slowly ___ everyone can follow.', ['so that', 'so as to', 'despite', 'unless'], 0, 'connector'),
  q('___ the delay, we still made the connection.', ['Notwithstanding', 'Because', 'Unless', 'So'], 0, 'connector'),
  q('The procedure is new, ___ effective.', ['if', 'albeit', 'unless', 'despite'], 1, 'connector'),
  q('I agree with the plan. ___, the timing is tight.', ['That said', 'Despite', 'Unless', 'Whereas'], 0, 'connector'),
  q('___ of the fog, departures continued.', ['Regardless', 'Regard', 'Regarded', 'Regarding of'], 0, 'connector'),
  q('___ fuel is short, we will still attempt one hold. (hypothetical)', ['Even if', 'Even though', 'Despite', 'Unless'], 0, 'connector'),
  q('___ fuel was short, we attempted one hold. (it really was short)', ['Even though', 'Even if', 'Despite', 'Unless'], 0, 'connector'),
  q('Do not push ___ you receive a clearance.', ['until', 'by', 'during', 'while'], 0, 'connector'),
  q('The pack is useful, ___ incomplete.', ['if', 'albeit', 'unless', 'despite of'], 1, 'connector'),
  q('___ you hear otherwise, assume 26L.', ['Unless', 'Despite', 'Because', 'So that'], 0, 'connector'),
  q('We filed extra fuel ___ a possible hold.', ['in case of', 'in case', 'unless', 'despite of'], 0, 'connector'),
  q('She accepted, ___ she had doubts.', ['even if', 'even though', 'despite', 'however'], 1, 'connector'),

  // ---- Inference ----
  q('Only four of the twelve candidates held a CPL. What must be true?', ['Eight candidates did not hold a CPL', 'All twelve held a CPL', 'None held a CPL', 'Four held an ATPL'], 0, 'inference'),
  q('The stand is still occupied, so the inbound cannot have departed yet. Conclusion:', ['The inbound is still here', 'The inbound has left', 'The stand is empty', 'ATC closed the airport'], 0, 'inference'),
  q('She must have seen the NOTAM; she changed the fuel figure. The speaker means:', ['It is reasonable to conclude she saw it', 'She ignored the NOTAM', 'NOTAMs are optional', 'She did not change the fuel'], 0, 'inference'),
  q('He can\'t have finished the walk-around: the chocks are still in. Conclusion:', ['He has almost certainly not finished', 'He finished hours ago', 'Chocks prove nothing', 'The aircraft has departed'], 0, 'inference'),
  q('Few passengers complained, but those who did were very angry. This means:', ['A small number complained, and strongly', 'Nobody complained', 'Everyone was angry', 'Most people complained mildly'], 0, 'inference'),
  q('The captain is yet to sign the tech log. This means:', ['The captain has not signed it so far', 'The captain signed it yesterday', 'Someone else must sign', 'The log is optional'], 0, 'inference'),
  q('We barely had time to refuel. This means:', ['We had almost too little time', 'We had plenty of time', 'We did not refuel', 'Refuelling was cancelled'], 0, 'inference'),
  q('All crew except the first officer had completed the module. Therefore:', ['The first officer had not completed it', 'Nobody completed it', 'Only the first officer completed it', 'Everyone completed it'], 0, 'inference'),
  q('If the fog lifts, we will depart. The fog has not lifted. What follows?', ['We cannot conclude that we have departed', 'We have definitely departed', 'We will never depart', 'The airport is permanently closed'], 0, 'inference'),
  q('No sooner had we parked than the bus arrived. This means:', ['The bus arrived immediately after parking', 'The bus was hours late', 'We never parked', 'The bus arrived first'], 0, 'inference'),
  q('She hardly spoke during the debrief. This means:', ['She said very little', 'She spoke a great deal', 'She was absent', 'She led the debrief'], 0, 'inference'),
  q('There is little chance of a slot before noon. This means:', ['A slot before noon is unlikely', 'A slot is certain', 'Noon is impossible in all cases', 'There are many slots'], 0, 'inference'),
  q('He failed to notice the MEL item. This means:', ['He did not notice it', 'He noticed it late', 'He wrote the MEL', 'He cancelled the MEL'], 0, 'inference'),
  q('The flight is due to leave at 14:00. This means:', ['It is scheduled to leave then', 'It has already left', 'It will not leave', 'It left at 14:00 yesterday'], 0, 'inference'),
  q('Neither runway is dry. This means:', ['Both runways are not dry', 'One runway is dry', 'Both are dry', 'The airport has only one runway'], 0, 'inference'),
  q('She would have called if she had been delayed. She did not call. The best conclusion:', ['She was probably not delayed', 'She was delayed', 'She lost her phone for sure', 'The flight was cancelled'], 0, 'inference'),
  q('At most three simulators are free. This means:', ['No more than three are free', 'At least three are free', 'Exactly three are free', 'None are free'], 0, 'inference'),
  q('Candidates must hold a passport valid for six months. A passport with five months left is:', ['not enough', 'enough', 'better than six months', 'irrelevant'], 0, 'inference'),
  q('I have yet to meet the chief pilot. This means:', ['I still have not met the chief pilot', 'I met the chief pilot yesterday', 'The chief pilot does not exist', 'I refuse to meet the chief pilot'], 0, 'inference'),
  q('The delay was anything but short. This means:', ['The delay was not short', 'The delay was short', 'There was no delay', 'The delay was cancelled'], 0, 'inference'),
  q('Not all of the packs were complete. This means:', ['At least one pack was incomplete', 'Every pack was incomplete', 'Every pack was complete', 'There were no packs'], 0, 'inference'),
  q('She left too recently to have landed already. Conclusion:', ['She has probably not landed yet', 'She has certainly landed', 'She never left', 'Landing is impossible today'], 0, 'inference'),
  q('Anyone who holds a type rating may apply. Jane has no type rating. Therefore:', ['The rule does not allow Jane to apply on that basis', 'Jane must apply', 'Jane already applied', 'Type ratings are optional for Jane only'], 0, 'inference'),
  q('The memo was issued on Monday and revised on Thursday. What must be true?', ['A later version exists than Monday\'s', 'Monday\'s memo was never sent', 'Thursday\'s revision was ignored', 'No memo exists'], 0, 'inference'),
  q('Hardly anyone passed on the first attempt. This means:', ['Almost nobody passed first time', 'Almost everybody passed first time', 'Nobody sat the test', 'Everyone passed later'], 0, 'inference'),

  // ---- Registre / fonction ----
  q('Would you mind sending the pack before 18:00? The speaker is:', ['making a polite request', 'giving a harsh order', 'apologising', 'refusing'], 0, 'register'),
  q('You might want to double-check the MEL. Closest function:', ['a suggestion', 'a celebration', 'a refusal', 'an apology'], 0, 'register'),
  q('I am afraid we cannot accept that MEL. The speaker is:', ['refusing politely', 'agreeing', 'asking a question', 'thanking someone'], 0, 'register'),
  q('Most formal way to ask a colleague to send a file:', ['I should be grateful if you could send the file.', 'Send the file now.', 'Can you send it?', 'Chuck me the file.'], 0, 'register'),
  q('Least formal:', ['Could you possibly send it?', 'Would you mind sending it?', 'Chuck us the pack, will you?', 'I would appreciate it if you could send it.'], 2, 'register'),
  q('I am sorry for the late reply. Function:', ['apology', 'warning', 'invitation', 'order'], 0, 'register'),
  q('Let us put this on hold until Monday. Function:', ['postponing a decision', 'cancelling forever', 'agreeing fully', 'blaming someone'], 0, 'register'),
  q('With respect, I do not share that view. Function:', ['polite disagreement', 'strong agreement', 'a joke', 'a request for coffee'], 0, 'register'),
  q('Most appropriate in a complaint letter:', ['I would like to draw your attention to yesterday\'s delay.', 'You guys messed up.', 'Whatever.', 'Lol nice delay.'], 0, 'register'),
  q('"I take your point, but we still need a spare." Function:', ['acknowledging, then contrasting', 'refusing to listen', 'changing the subject to weather', 'ending the briefing'], 0, 'register'),
  q('Please find attached the briefing pack. Typical of:', ['a formal email', 'a cockpit shout', 'a joke', 'a refusal'], 0, 'register'),
  q('You are to remain on stand until further notice. Function:', ['an instruction', 'a suggestion', 'a question', 'thanks'], 0, 'register'),
  q('I was wondering whether you had a slot this afternoon. Function:', ['a polite enquiry', 'an accusation', 'a refusal', 'a weather report'], 0, 'register'),
  q('Best match for a written company notice:', ['Staff shall complete the module by Friday.', 'Please maybe do it.', 'Do it if you like.', 'Yo complete that.'], 0, 'register'),
  q('"Would you like me to take the radios?" Function:', ['offering', 'ordering', 'complaining', 'refusing'], 0, 'register'),
  q('Which is too blunt for a first email to training?', ['Could you confirm the date of the centre?', 'Send dates now.', 'I want dates.', 'Dates!!!'], 0, 'register'),
  q('"Thanks all the same." after a refused favour means:', ['thanks, even though it did not happen', 'thanks, I accept', 'I am angry', 'please do it anyway'], 0, 'register'),
  q('I regret to inform you that the course is full. Tone:', ['formal bad news', 'informal joke', 'an order to leave', 'a weather update'], 0, 'register'),
  q('Mind the step. Function:', ['warning', 'apology', 'invitation to sit', 'refusal'], 0, 'register'),
  q('Which request is the most tentative?', ['I don\'t suppose you could move the slot, could you?', 'Move the slot.', 'Move it now.', 'You must move the slot.'], 0, 'register'),
];

export const MORE_PASSAGES: { text: string; questions: { stem: string; choices: [string, string, string, string]; correct: number }[] }[] = [
  {
    text: 'Please note that airside driving permits issued before 2024 will no longer be accepted from 1 October. Holders must book a refresher on the training portal; the session lasts two hours and includes a short written test. Permits are not transferable. If you drive a contractor vehicle, your company safety officer must countersign the application. Questions received after 17:00 will be handled the next working day.',
    questions: [
      {
        stem: 'What happens on 1 October?',
        choices: ['Old permits stop being accepted', 'The airport closes', 'All tests are cancelled', 'Contractors may share permits'],
        correct: 0,
      },
      {
        stem: 'Who must countersign if you drive a contractor vehicle?',
        choices: ['The captain', 'Your company safety officer', 'ATC', 'Any colleague'],
        correct: 1,
      },
      {
        stem: 'In this notice, "transferable" means the permit can be:',
        choices: ['given to someone else', 'renewed online', 'used on any airport', 'printed twice'],
        correct: 0,
      },
    ],
  },
  {
    text: 'I would be grateful if you could clarify item 4 of yesterday\'s roster change. The published version shows me operating the return from Nice, but the crew app still lists a standby start at 11:30. I have already arranged childcare on the assumption I would fly. If standby is correct, please say so as soon as possible so I can reverse those arrangements. I apologise for the short notice of this email; I only saw the mismatch this morning.',
    questions: [
      {
        stem: 'What is the writer\'s problem?',
        choices: ['Two sources disagree about the duty', 'The flight to Nice is cancelled', 'Childcare is forbidden', 'The app never works'],
        correct: 0,
      },
      {
        stem: 'Why does the writer mention childcare?',
        choices: ['To explain why a quick confirmation matters', 'To ask the company to pay for it', 'To refuse all standbys', 'To complain about Nice'],
        correct: 0,
      },
      {
        stem: '"Mismatch" here means:',
        choices: ['two pieces of information that do not agree', 'a lost bag', 'a delayed aircraft', 'a typing course'],
        correct: 0,
      },
    ],
  },
  {
    text: 'Several operators have reported an increase in laser incidents on finals to 26L after dusk. If a laser is seen, do not stare at the source; protect your vision, consider transferring control, and report the time, colour, and approximate origin to ATC when workload allows. Do not manoeuvre aggressively solely to escape the beam. A standard report form is available on the safety intranet and should be filed before going off duty if you are able to do so.',
    questions: [
      {
        stem: 'What should crews not do if a laser is seen?',
        choices: ['Stare at the source and manoeuvre aggressively just to escape it', 'Report to ATC later', 'Protect their vision', 'Consider transferring control'],
        correct: 0,
      },
      {
        stem: 'When should the written report be filed, if possible?',
        choices: ['Before going off duty', 'The following month', 'Only if police ask', 'Never; radio is enough'],
        correct: 0,
      },
      {
        stem: 'The phrase "when workload allows" implies:',
        choices: ['safety flying tasks come first', 'ATC must wait forever', 'the report is optional always', 'lasers are not serious'],
        correct: 0,
      },
    ],
  },
  {
    text: 'The new rostering tool will go live on Sunday at 02:00. Expected downtime is forty minutes. During that window, published rosters remain valid; do not assume a blank screen means you are free. Pairing disputes must still be sent to crew-control@airline.example, not posted in the social channel. A short video tutorial is on the portal. Staff who cannot log in after 03:00 should wait fifteen minutes before calling the helpdesk, which will be busy.',
    questions: [
      {
        stem: 'If the screen is blank at 02:20, you should:',
        choices: ['treat the last published roster as still valid', 'assume you have the day off', 'call the CEO', 'post in the social channel'],
        correct: 0,
      },
      {
        stem: 'Where should pairing disputes go?',
        choices: ['crew-control email', 'the social channel', 'the video tutorial comments', 'ATC'],
        correct: 0,
      },
      {
        stem: 'Why wait fifteen minutes before calling the helpdesk after 03:00?',
        choices: ['It is expected to be busy', 'The phone is forbidden', 'Sunday calls are unpaid', 'The tool never works'],
        correct: 0,
      },
    ],
  },
  {
    text: 'A recent study of short-haul fatigue found that early starts combined with long taxi-outs predicted more minor errors in the last hour of duty than late finishes of the same length. The authors do not claim that late duties are harmless; they argue that commuting before dawn deserves as much attention as night landings. Airlines in the sample that offered a nearby crew hotel for duties beginning before 05:30 saw fewer self-reported lapses. The sample was small, and the paper calls for a larger follow-up.',
    questions: [
      {
        stem: 'According to the study, which pairing was more strongly linked to late-duty minor errors?',
        choices: ['Early starts with long taxi-outs', 'Late finishes only', 'Night landings only', 'Hotel stays'],
        correct: 0,
      },
      {
        stem: 'What do the authors say about late duties?',
        choices: ['They are not claimed to be harmless', 'They are always worse', 'They should be banned', 'They predict no errors'],
        correct: 0,
      },
      {
        stem: 'Why is the conclusion cautious?',
        choices: ['The sample was small and more research is requested', 'The authors work for hotels', 'No errors were found', 'Taxi-outs were never long'],
        correct: 0,
      },
    ],
  },
  {
    text: 'This is a reminder that electronic devices larger than a mobile phone must be stowed for taxi, take-off and landing on this fleet. Seat-pocket storage is not approved for laptops. If a passenger refuses after a clear explanation, inform the captain; do not enter into an argument in the aisle. Medical devices are treated case by case under the current exemption list, which cabin crew can open from the EFB. A photograph of a stowed bag is not required.',
    questions: [
      {
        stem: 'Where must a laptop not be put for take-off?',
        choices: ['In the seat pocket', 'In approved stowage', 'In the overhead bin if that is approved', 'With medical devices always'],
        correct: 0,
      },
      {
        stem: 'If a passenger still refuses after an explanation, cabin crew should:',
        choices: ['inform the captain rather than argue in the aisle', 'take the device by force', 'photograph the bag', 'ignore the rule'],
        correct: 0,
      },
      {
        stem: '"Case by case" means:',
        choices: ['each situation is judged individually', 'all medical devices are banned', 'all medical devices are allowed', 'only doctors decide'],
        correct: 0,
      },
    ],
  },
  {
    text: 'Candidates invited to the assessment centre should bring a valid passport, the original of their highest academic diploma, and a printed copy of the online application. Digital copies on a phone will not be accepted at the document desk. Dress is business-like; a suit is not compulsory but sportswear is not appropriate. Lunch is provided. If you require an adjustment for a documented disability, write to assessments@airline.example at least five working days in advance. Late arrivals of more than fifteen minutes will not be admitted.',
    questions: [
      {
        stem: 'What will the document desk refuse?',
        choices: ['Diplomas shown only on a phone', 'A printed application', 'A passport', 'An original diploma'],
        correct: 0,
      },
      {
        stem: 'How should candidates dress?',
        choices: ['Business-like; sportswear is not appropriate', 'A suit is compulsory', 'Sportswear is required', 'Uniform only'],
        correct: 0,
      },
      {
        stem: 'A candidate arriving 20 minutes late will:',
        choices: ['not be admitted', 'sit a shorter test', 'start after lunch', 'be given extra time'],
        correct: 0,
      },
    ],
  },
  {
    text: 'Engineering has closed the left-hand pack for this aircraft under MEL 21-02. The remaining pack is serviceable. Dispatch is permitted provided the cruise altitude does not exceed FL310 and the cabin altitude remains within the stated limits. A mechanical diversion is not required solely because of this MEL, but crews should brief a strategy if the remaining pack degrades. The defect must be cleared within ten calendar days of the original entry. Passengers need not be informed unless the cabin environment becomes uncomfortable.',
    questions: [
      {
        stem: 'What altitude restriction applies?',
        choices: ['Cruise not above FL310', 'No restriction', 'Must stay below 10,000 ft', 'Must cruise at FL350'],
        correct: 0,
      },
      {
        stem: 'Must passengers always be told about this MEL?',
        choices: ['No, unless the cabin becomes uncomfortable', 'Yes, before boarding', 'Yes, after landing only', 'Only if they ask twice'],
        correct: 0,
      },
      {
        stem: 'How long may the defect remain?',
        choices: ['Ten calendar days from the original entry', 'Until the next C check', 'Twenty-four hours only', 'Indefinitely'],
        correct: 0,
      },
    ],
  },
  {
    text: 'The winter schedule adds two rotations to Edinburgh and drops the late Marseille. Crew who lose a pairing as a result will be offered reassignment in the same bid period; they will not be placed on unpaid leave. Language of service on the new Edinburgh sectors remains English and French. Hotel standards are unchanged. A Q&A session will be held on Teams at 16:00 on Thursday; questions sent in advance will be taken first. The presentation slides will be posted afterwards, so attendance is useful but not mandatory.',
    questions: [
      {
        stem: 'What happens to crew who lose a pairing?',
        choices: ['They get another pairing in the same bid period', 'They go on unpaid leave', 'They must leave the company', 'They only fly Marseille'],
        correct: 0,
      },
      {
        stem: 'Is the Teams session compulsory?',
        choices: ['No; slides will be posted afterwards', 'Yes, for all crew', 'Yes, for Edinburgh crew only', 'No, and no slides will exist'],
        correct: 0,
      },
      {
        stem: '"Drops the late Marseille" means the airline will:',
        choices: ['stop operating that late Marseille flight', 'add more Marseille flights', 'delay Marseille forever', 'move Marseille to Edinburgh'],
        correct: 0,
      },
    ],
  },
  {
    text: 'When you read a passenger announcement, the aim is not to recast every sentence into literary English. Listeners are tired, noisy, and standing in an aisle. Short clauses, one idea at a time, and words they already know will carry more than a perfectly elegant paragraph they cannot follow. That is also how many preselection English papers now work: a notice or an email, then questions on what is required, what is implied, and what a word means in that text — not on whether you remember an obscure irregular verb.',
    questions: [
      {
        stem: 'According to the text, a good announcement should mainly be:',
        choices: ['short and easy to follow in noise', 'as literary as possible', 'full of rare verbs', 'read without pauses'],
        correct: 0,
      },
      {
        stem: 'The author says many English papers now resemble:',
        choices: ['notices or emails plus questions on meaning', 'only gap-fill grammar', 'a speaking test only', 'a translation of irregular verbs'],
        correct: 0,
      },
      {
        stem: '"Carry more" in this text is closest to:',
        choices: ['communicate more effectively', 'weigh more', 'last longer in the air', 'cost more'],
        correct: 0,
      },
    ],
  },
];
