/* ==========================================================================
   data.js — starter content and option catalogues
   ========================================================================== */

const PARTS_OF_SPEECH = [
  'noun','plural noun','verb','adjective','adverb','phrasal verb','idiom',
  'preposition','conjunction','pronoun','determiner','exclamation','phrase'
];

/* Cambridge groups its B1 vocabulary under these headings, and a word can be
   filed under one of them as well as sitting in a deck: a deck is what you
   chose to study, a topic is what the word is about. */
const TOPICS = [
  'Clothes and Accessories', 'Colours', 'Communications and Technology',
  'Education', 'Entertainment and Media', 'Environment', 'Food and Drink',
  'Health, Medicine and Exercise', 'Hobbies and Leisure', 'House and Home',
  'Language', 'Places: Buildings', 'Places: Countryside',
  'Places: Town and City', 'Services', 'Shopping', 'Sport',
  'The Natural World', 'Time', 'Travel and Transport', 'Weather',
  'Work and Jobs'
];

const THEMES = [
  { id:'dark',     name:'Dark',     colors:['#0e1014','#16191f','#272c37'] },
  { id:'light',    name:'Light',    colors:['#f5f6f8','#ffffff','#e3e6ec'] },
  { id:'midnight', name:'Midnight', colors:['#080b16','#0e1424','#1e2942'] },
  { id:'nord',     name:'Nord',     colors:['#2e3440','#3d4655','#4a5466'] },
  { id:'forest',   name:'Forest',   colors:['#0d1512','#1a2922','#25392e'] },
  { id:'sepia',    name:'Sepia',    colors:['#f3ead9','#fdf8ee','#e0d2b8'] },
  { id:'rose',     name:'Rose',     colors:['#fcf5f6','#ffffff','#f0dde0'] },
  { id:'mono',     name:'Mono',     colors:['#0c0c0c','#141414','#282828'] },
  { id:'plum',     name:'Plum',     colors:['#120e1a','#191424','#302543'] },
  { id:'ember',    name:'Ember',    colors:['#14100d','#1c1714','#372c23'] },
  { id:'mist',     name:'Mist',     colors:['#eef2f7','#ffffff','#ccd8e6'] }
];

const ACCENTS = [
  { id:'indigo',  name:'Indigo',  hex:'#6366f1' },
  { id:'blue',    name:'Blue',    hex:'#3b82f6' },
  { id:'teal',    name:'Teal',    hex:'#14b8a6' },
  { id:'emerald', name:'Emerald', hex:'#10b981' },
  { id:'amber',   name:'Amber',   hex:'#f59e0b' },
  { id:'rose',    name:'Rose',    hex:'#f43f5e' },
  { id:'violet',  name:'Violet',  hex:'#8b5cf6' },
  { id:'slate',   name:'Slate',   hex:'#64748b' },
  { id:'cyan',    name:'Cyan',    hex:'#06b6d4' },
  { id:'lime',    name:'Lime',    hex:'#84cc16' },
  { id:'fuchsia', name:'Fuchsia', hex:'#d946ef' }
];

const FONTS = [
  { id:'sans',     name:'Sans',     sample:'Aa' },
  { id:'rounded',  name:'Rounded',  sample:'Aa' },
  { id:'serif',    name:'Serif',    sample:'Aa' },
  { id:'humanist', name:'Humanist', sample:'Aa' },
  { id:'mono',     name:'Mono',     sample:'Aa' },
  { id:'slab',     name:'Slab',     sample:'Aa' },
  { id:'grotesk',  name:'Grotesk',  sample:'Aa' },
  { id:'clear',    name:'Times',    sample:'Aa' }
];

/* --------------------------------------------------------------------------
   Starter decks. Every entry: term, pos, definition, example, translation,
   The example sentence always contains the term so that cloze
   ("fill in the blank") practice works out of the box.
   -------------------------------------------------------------------------- */
const STARTER_DECKS = [
  {
    name: 'Everyday Essentials',
    emoji: '☕',
    description: 'High-frequency words for daily conversation, work and small talk (B1).',
    cards: [
      { term:'reliable', pos:'adjective', definition:'Able to be trusted to do what is expected or promised.', example:'She is the most reliable person on the team — she never misses a deadline.', translation:'güvenilir' },
      { term:'rely', pos:'verb', definition:'To depend on someone or something to do what is needed.', example:'You can rely on her to finish the job on time.', translation:'güvenmek, bel bağlamak',
        collocations:['rely on someone','rely heavily on'], related:[{kind:'family',text:'reliable'},{kind:'syn',text:'depend on'}] },
      { term:'reliability', pos:'noun', definition:'How far something can be trusted to work every time.', example:'The reliability of the data was questioned.', translation:'güvenilirlik',
        related:[{kind:'family',text:'reliable'}] },
      { term:'reliably', pos:'adverb', definition:'In a way that can be trusted to happen every time.', example:'The train reliably arrives at seven.', translation:'güvenilir biçimde',
        related:[{kind:'family',text:'reliable'}] },
      { term:'afford', pos:'verb', definition:'To have enough money or time for something.', example:'We cannot afford a new car this year.', translation:'(parasal olarak) gücü yetmek' },
      { term:'commute', pos:'noun', definition:'The regular journey between home and work.', example:'My commute takes about forty minutes each way.', translation:'işe gidiş-geliş yolculuğu' },
      { term:'overwhelmed', pos:'adjective', definition:'Feeling unable to cope because there is too much to deal with.', example:'I felt completely overwhelmed by the number of emails.', translation:'bunalmış, altında ezilmiş' },
      { term:'errand', pos:'noun', definition:'A short trip to do a small job, usually for someone else.', example:'I have a few errands to run before the shops close.', translation:'ufak iş, ayak işi' },
      { term:'postpone', pos:'verb', definition:'To move an event to a later time.', example:'They decided to postpone the meeting until Friday.', translation:'ertelemek' },
      { term:'straightforward', pos:'adjective', definition:'Easy to understand or do; not complicated.', example:'The instructions were straightforward, so it only took ten minutes.', translation:'anlaşılır, basit' },
      { term:'appreciate', pos:'verb', definition:'To be grateful for something, or to recognise its value.', example:'I really appreciate everything you have done for me.', translation:'minnettar olmak, kıymetini bilmek' },
      { term:'spare', pos:'adjective', definition:'Kept in case it is needed; extra.', example:'Keep a spare key with your neighbour.', translation:'yedek' },
      { term:'chore', pos:'noun', definition:'A routine household task.', example:'We split the chores: he cooks and I do the dishes.', translation:'ev işi' },
      { term:'crowded', pos:'adjective', definition:'Full of people, leaving little space.', example:'The train was so crowded that I had to stand.', translation:'kalabalık' },
      { term:'borrow', pos:'verb', definition:'To take and use something belonging to someone else, intending to return it.', example:'Can I borrow your charger for a minute?', translation:'ödünç almak' },
      { term:'deadline', pos:'noun', definition:'The latest time by which something must be finished.', example:'The deadline for the report is Monday morning.', translation:'son teslim tarihi' },
      { term:'convenient', pos:'adjective', definition:'Useful because it suits your needs or saves trouble.', example:'Would three o’clock be convenient for you?', translation:'uygun, elverişli' },
      { term:'complain', pos:'verb', definition:'To say that you are annoyed or unhappy about something.', example:'Several guests complained about the noise.', translation:'şikâyet etmek' },
      { term:'exhausted', pos:'adjective', definition:'Extremely tired.', example:'After the flight I was completely exhausted.', translation:'bitkin, çok yorgun' },
      { term:'neighbourhood', pos:'noun', definition:'The area of a town where you live and the people in it.', example:'They moved to a quieter neighbourhood near the park.', translation:'mahalle, semt' },
      { term:'afford to', pos:'phrase', definition:'To be able to risk doing something without bad consequences.', example:'We cannot afford to lose another customer.', translation:'göze alabilmek' },
      { term:'refund', pos:'noun', definition:'Money paid back to a customer.', example:'They gave me a full refund for the damaged bag.', translation:'para iadesi' },
      { term:'reschedule', pos:'verb', definition:'To arrange a new time for something.', example:'Could we reschedule our call to tomorrow?', translation:'yeniden planlamak' },
      { term:'grateful', pos:'adjective', definition:'Feeling thankful for something someone did.', example:'I am grateful for all the help you gave me last week.', translation:'minnettar' },
      { term:'occasionally', pos:'adverb', definition:'Sometimes, but not often.', example:'We occasionally have dinner at that little Italian place.', translation:'ara sıra' },
      { term:'struggle', pos:'verb', definition:'To try very hard to do something difficult.', example:'He struggled to explain the idea in English.', translation:'zorlanmak, mücadele etmek' },
      { term:'worth it', pos:'phrase', definition:'Good enough to justify the money, time or effort spent.', example:'The tickets were expensive, but the concert was worth it.', translation:'değer, buna değer' }
    ]
  },
  {
    name: 'Academic & Formal English',
    emoji: '🎓',
    description: 'Vocabulary for essays, reports, exams and professional writing (B2–C1).',
    cards: [
      { term:'significant', pos:'adjective', definition:'Large or important enough to have an effect or be noticed.', example:'The study found a significant improvement in reading speed.', translation:'önemli, kayda değer',
        collocations:['a significant increase','a significant difference','statistically significant'], related:[{kind:'syn',text:'considerable'},{kind:'ant',text:'negligible'}] },
      { term:'assume', pos:'verb', definition:'To accept something as true without proof.', example:'We should not assume that the results apply to every group.', translation:'varsaymak' },
      { term:'evidence', pos:'noun', definition:'Facts or information showing whether something is true.', example:'There is little evidence to support that claim.', translation:'kanıt' },
      { term:'nevertheless', pos:'adverb', definition:'In spite of what has just been said.', example:'The sample was small; nevertheless, the findings are useful.', translation:'yine de, buna rağmen' },
      { term:'implement', pos:'verb', definition:'To put a plan or decision into effect.', example:'The company will implement the new policy in March.', translation:'uygulamaya koymak',
        collocations:['implement a policy','implement a plan','implement changes'] },
      { term:'consequently', pos:'adverb', definition:'As a result of something.', example:'Costs rose sharply; consequently, prices went up.', translation:'sonuç olarak, bu yüzden' },
      { term:'crucial', pos:'adjective', definition:'Extremely important because it affects the outcome.', example:'Sleep plays a crucial role in memory formation.', translation:'çok önemli, kritik',
        collocations:['play a crucial role','a crucial factor','crucially important'], related:[{kind:'syn',text:'vital'}] },
      { term:'demonstrate', pos:'verb', definition:'To show clearly that something exists or is true.', example:'The results demonstrate a clear link between the two factors.', translation:'göstermek, ortaya koymak' },
      { term:'sufficient', pos:'adjective', definition:'As much as is needed.', example:'We do not have sufficient data to draw a conclusion.', translation:'yeterli' },
      { term:'furthermore', pos:'adverb', definition:'In addition to what has already been said.', example:'The method is fast; furthermore, it is inexpensive.', translation:'ayrıca, dahası' },
      { term:'contribute', pos:'verb', definition:'To help cause a result, or to give something to a shared effort.', example:'Poor diet can contribute to a range of health problems.', translation:'katkıda bulunmak' },
      { term:'subsequent', pos:'adjective', definition:'Happening after something else.', example:'The error was corrected in subsequent editions of the book.', translation:'sonraki, müteakip' },
      { term:'comprehensive', pos:'adjective', definition:'Including everything that is relevant; complete.', example:'The report gives a comprehensive overview of the market.', translation:'kapsamlı' },
      { term:'emphasise', pos:'verb', definition:'To give special importance or attention to something.', example:'The author emphasises the need for further research.', translation:'vurgulamak' },
      { term:'considerable', pos:'adjective', definition:'Large in size, amount or importance.', example:'The project required a considerable amount of time.', translation:'hatırı sayılır, epeyce' },
      { term:'inevitable', pos:'adjective', definition:'Certain to happen and impossible to avoid.', example:'Some delay was inevitable given the scale of the work.', translation:'kaçınılmaz' },
      { term:'perspective', pos:'noun', definition:'A particular way of thinking about something.', example:'From an economic perspective, the decision makes sense.', translation:'bakış açısı' },
      { term:'analyse', pos:'verb', definition:'To examine something in detail in order to understand it.', example:'The team analysed the results over three months.', translation:'çözümlemek, incelemek',
        collocations:['analyse the data','analyse the results'], related:[{kind:'family',text:'analysis'}] },
      { term:'analysis', pos:'noun', definition:'A detailed examination of something.', example:'Her analysis of the survey was thorough.', translation:'analiz, çözümleme',
        collocations:['carry out an analysis','a detailed analysis'], related:[{kind:'family',text:'analyse'}] },
      { term:'analytical', pos:'adjective', definition:'Using careful, step-by-step examination.', example:'He has an analytical mind and spots patterns quickly.', translation:'analitik, çözümleyici',
        related:[{kind:'family',text:'analyse'}] },
      { term:'analytically', pos:'adverb', definition:'In a careful, step-by-step way.', example:'She approached the problem analytically.', translation:'analitik biçimde',
        related:[{kind:'family',text:'analytical'}] },
      { term:'significance', pos:'noun', definition:'The importance or meaning of something.', example:'They discussed the significance of the findings.', translation:'önem, anlam',
        related:[{kind:'family',text:'significant'}] },
      { term:'significantly', pos:'adverb', definition:'By an amount large enough to matter.', example:'Scores improved significantly after the change.', translation:'önemli ölçüde',
        related:[{kind:'family',text:'significant'}] },
      { term:'undermine', pos:'verb', definition:'To weaken something gradually.', example:'Repeated errors undermine the credibility of the study.', translation:'zayıflatmak, baltalamak',
        collocations:['undermine confidence','undermine credibility','undermine an argument'], related:[{kind:'syn',text:'weaken'},{kind:'ant',text:'strengthen'}] },
      { term:'object', pos:'noun', sense:'a thing', definition:'A thing that can be seen or touched.', example:'The telescope revealed a faint object near the horizon.', translation:'nesne, cisim',
        collocations:['a moving object','an inanimate object'] },
      { term:'object', pos:'noun', sense:'an aim', definition:'The purpose of an action or plan.', example:'The object of the exercise is to reduce waiting times.', translation:'amaç, hedef',
        collocations:['the object of the exercise'], related:[{kind:'syn',text:'purpose'}] },
      { term:'object', pos:'verb', sense:'to protest', definition:'To say that you disagree with or disapprove of something.', example:'Several residents objected to the proposed development.', translation:'itiraz etmek, karşı çıkmak',
        collocations:['object to a proposal','strongly object'], related:[{kind:'syn',text:'protest'},{kind:'ant',text:'approve'}] },
      { term:'feasible', pos:'adjective', definition:'Possible to do easily or conveniently.', example:'It is not feasible to interview every participant twice.', translation:'yapılabilir, uygulanabilir' },
      { term:'discrepancy', pos:'noun', definition:'A difference between things that should be the same.', example:'There was a discrepancy between the two sets of figures.', translation:'tutarsızlık, uyuşmazlık' },
      { term:'arguably', pos:'adverb', definition:'Used to say something can be reasonably argued.', example:'This is arguably the most influential paper in the field.', translation:'tartışmalı olarak, muhtemelen' },
      { term:'prioritise', pos:'verb', definition:'To decide which things are most important and deal with them first.', example:'We need to prioritise the tasks with the closest deadlines.', translation:'önceliklendirmek' }
    ]
  },
  {
    name: 'Phrasal Verbs & Idioms',
    emoji: '🧩',
    description: 'Natural, spoken English that textbooks often skip.',
    cards: [
      { term:'put off', pos:'phrasal verb', definition:'To delay something until later.', example:'Stop putting off the dentist appointment.', translation:'ertelemek' },
      { term:'figure out', pos:'phrasal verb', definition:'To understand or solve something after thinking.', example:'It took me an hour to figure out how the app works.', translation:'çözmek, anlamak' },
      { term:'run out of', pos:'phrasal verb', definition:'To use all of something so that none is left.', example:'We have run out of coffee again.', translation:'tükenmek, bitmek' },
      { term:'look forward to', pos:'phrasal verb', definition:'To feel pleased about something that is going to happen.', example:'I am looking forward to seeing you next month.', translation:'dört gözle beklemek' },
      { term:'get along with', pos:'phrasal verb', definition:'To have a friendly relationship with someone.', example:'She gets along with everyone in the office.', translation:'iyi geçinmek' },
      { term:'come up with', pos:'phrasal verb', definition:'To think of an idea, plan or solution.', example:'He came up with a clever way to cut costs.', translation:'(fikir) bulmak, ortaya atmak' },
      { term:'give up', pos:'phrasal verb', definition:'To stop trying, or to stop a habit.', example:'Do not give up now — you are almost there.', translation:'pes etmek, vazgeçmek' },
      { term:'take over', pos:'phrasal verb', definition:'To take control of something.', example:'A larger firm took over the company last year.', translation:'devralmak' },
      { term:'turn down', pos:'phrasal verb', sense:'to refuse', definition:'To refuse an offer or invitation.', example:'She turned down the job because of the commute.', translation:'reddetmek',
        collocations:['turn down an offer','turn down an invitation','turn down a job'], related:[{kind:'syn',text:'reject'},{kind:'ant',text:'accept'}] },
      { term:'turn down', pos:'phrasal verb', sense:'to lower', definition:'To reduce the volume, heat or power of something.', example:'Could you turn down the music a little?', translation:'kısmak, azaltmak',
        collocations:['turn down the volume','turn down the heating'] },
      { term:'work out', pos:'phrasal verb', sense:'to turn out well', definition:'To develop in a good or successful way in the end.', example:'Do not worry — everything will work out in the end.', translation:'yoluna girmek',
        collocations:['work out well','work out for the best'] },
      { term:'work out', pos:'phrasal verb', sense:'to exercise', definition:'To do physical exercise to keep fit.', example:'He works out at the gym three mornings a week.', translation:'spor yapmak, antrenman yapmak',
        collocations:['work out at the gym','work out regularly'] },
      { term:'work out', pos:'phrasal verb', sense:'to calculate', definition:'To find an answer by thinking or calculating.', example:'I could not work out how much the trip would cost.', translation:'hesaplamak, çözmek',
        collocations:['work out the cost','work out a solution'], related:[{kind:'syn',text:'figure out'}] },
      { term:'bring up', pos:'phrasal verb', sense:'to mention', definition:'To start talking about a subject.', example:'He brought up the budget problem during the meeting.', translation:'(konu) açmak',
        collocations:['bring up a subject','bring up a point','bring up an issue'], related:[{kind:'syn',text:'raise'}] },
      { term:'bring up', pos:'phrasal verb', sense:'to raise a child', definition:'To look after a child until they are grown.', example:'She was brought up by her grandparents in Izmir.', translation:'yetiştirmek, büyütmek',
        collocations:['bring up a child','be brought up in'] },
      { term:'catch up', pos:'phrasal verb', sense:'to reach the same level', definition:'To reach someone or something that is ahead of you.', example:'She missed two weeks and had to catch up with the class.', translation:'yetişmek, açığı kapatmak',
        collocations:['catch up with the class','catch up on work','catch up on sleep'] },
      { term:'catch up', pos:'phrasal verb', sense:'to exchange news', definition:'To talk with someone you have not seen for a while.', example:'Let us catch up over coffee this weekend.', translation:'hasret gidermek, sohbet etmek',
        collocations:['catch up over coffee','catch up with an old friend'] },
      { term:'once in a blue moon', pos:'idiom', definition:'Very rarely.', example:'He calls his brother once in a blue moon.', translation:'kırk yılda bir' },
      { term:'the last straw', pos:'idiom', definition:'The final small problem that makes a situation unbearable.', example:'Losing the file was the last straw — he resigned that day.', translation:'bardağı taşıran son damla' },
      { term:'get the hang of', pos:'idiom', definition:'To learn how to do something with practice.', example:'It looks hard, but you will get the hang of it quickly.', translation:'püf noktasını kapmak' },
      { term:'call it a day', pos:'idiom', definition:'To stop working for the day.', example:'We have done enough — let us call it a day.', translation:'paydos etmek' },
      { term:'on the same page', pos:'idiom', definition:'In agreement, sharing the same understanding.', example:'Before we start, let us make sure everyone is on the same page.', translation:'aynı fikirde olmak' },
      { term:'a piece of cake', pos:'idiom', definition:'Something very easy to do.', example:'The exam was a piece of cake compared with last year.', translation:'çocuk oyuncağı' },
      { term:'break the ice', pos:'idiom', definition:'To say or do something to reduce tension between strangers.', example:'He told a joke to break the ice at the start of the meeting.', translation:'buzları eritmek' },
      { term:'cut corners', pos:'idiom', definition:'To do something badly or cheaply to save time or money.', example:'They cut corners on safety and it cost them dearly.', translation:'kestirmeden gitmek, işi savsaklamak' }
    ]
  }
];

/* --------------------------------------------------------------------------
   Starter content that changed after schema 1.

   A collection created before that upgrade already exists in the browser, and
   the starter decks are only ever dealt to an empty one — so those learners
   would keep the old cards forever. This table lets the upgrade reach them,
   without ever overwriting something they have since edited themselves.

   The new wording is not repeated here: everything is looked up in
   STARTER_DECKS above, so there is one source of truth for the content.
   -------------------------------------------------------------------------- */
/* Bumped whenever the starter decks gain or correct content. It is deliberately
   NOT the schema version: the schema can be stamped by a release that carries no
   content change, and then a content upgrade written later could never reach the
   collections that release had already stamped. This counter only ever moves when
   the words themselves move. */
const STARTER_REVISION = 2;

const STARTER_UPGRADES = {
  /* Cards that used to squeeze two or three meanings into one definition.
     `oldDefinition` is exactly what shipped — a card whose definition still
     reads that way has not been touched, so it is safe to repair. It keeps
     its id, its schedule and its example, and becomes the sense that its
     example sentence was already showing; the other senses are added beside it. */
  splits: [
    { term: 'turn down', oldDefinition: 'To refuse an offer, or to reduce volume.',        becomes: 'to refuse' },
    { term: 'work out',  oldDefinition: 'To end well, or to exercise, or to calculate.',   becomes: 'to turn out well' },
    { term: 'bring up',  oldDefinition: 'To mention a subject, or to raise a child.',      becomes: 'to mention' },
    { term: 'catch up',  oldDefinition: 'To reach the same level, or to exchange news.',   becomes: 'to exchange news' }
  ],

  /* Words whose wording did not change but which gained collocations or
     relations. Only empty fields are filled in. */
  enrich: ['undermine', 'significant', 'implement', 'crucial'],

  /* Words the starter decks did not contain at all. Added only to a starter
     deck that is still there and does not already have the word. */
  additions: [
    { deck: 'Academic & Formal English', term: 'object' },
    /* Three word families, each hung on a word the starter decks already had,
       so an existing collection sees its own words gain a family. */
    { deck: 'Everyday Essentials', term: 'rely' },
    { deck: 'Everyday Essentials', term: 'reliability' },
    { deck: 'Everyday Essentials', term: 'reliably' },
    { deck: 'Academic & Formal English', term: 'analyse' },
    { deck: 'Academic & Formal English', term: 'analysis' },
    { deck: 'Academic & Formal English', term: 'analytical' },
    { deck: 'Academic & Formal English', term: 'analytically' },
    { deck: 'Academic & Formal English', term: 'significance' },
    { deck: 'Academic & Formal English', term: 'significantly' }
  ]
};
