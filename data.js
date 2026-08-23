/* ==========================================================================
   data.js — starter content and option catalogues
   ========================================================================== */

const PARTS_OF_SPEECH = [
  'noun','verb','adjective','adverb','phrasal verb','idiom','preposition',
  'conjunction','pronoun','determiner','interjection','phrase'
];

const THEMES = [
  { id:'dark',     name:'Dark',     colors:['#0e1014','#16191f','#272c37'] },
  { id:'light',    name:'Light',    colors:['#f5f6f8','#ffffff','#e3e6ec'] },
  { id:'midnight', name:'Midnight', colors:['#080b16','#0e1424','#1e2942'] },
  { id:'nord',     name:'Nord',     colors:['#2e3440','#3d4655','#4a5466'] },
  { id:'forest',   name:'Forest',   colors:['#0d1512','#1a2922','#25392e'] },
  { id:'sepia',    name:'Sepia',    colors:['#f3ead9','#fdf8ee','#e0d2b8'] },
  { id:'rose',     name:'Rose',     colors:['#fcf5f6','#ffffff','#f0dde0'] },
  { id:'mono',     name:'Mono',     colors:['#0c0c0c','#141414','#282828'] }
];

const ACCENTS = [
  { id:'indigo',  name:'Indigo',  hex:'#6366f1' },
  { id:'blue',    name:'Blue',    hex:'#3b82f6' },
  { id:'teal',    name:'Teal',    hex:'#14b8a6' },
  { id:'emerald', name:'Emerald', hex:'#10b981' },
  { id:'amber',   name:'Amber',   hex:'#f59e0b' },
  { id:'rose',    name:'Rose',    hex:'#f43f5e' },
  { id:'violet',  name:'Violet',  hex:'#8b5cf6' },
  { id:'slate',   name:'Slate',   hex:'#64748b' }
];

const FONTS = [
  { id:'sans',     name:'Sans',     sample:'Aa' },
  { id:'rounded',  name:'Rounded',  sample:'Aa' },
  { id:'serif',    name:'Serif',    sample:'Aa' },
  { id:'humanist', name:'Humanist', sample:'Aa' },
  { id:'mono',     name:'Mono',     sample:'Aa' }
];

/* --------------------------------------------------------------------------
   Starter decks. Every entry: term, pos, definition, example, translation,
   category. The example sentence always contains the term so that cloze
   ("fill in the blank") practice works out of the box.
   -------------------------------------------------------------------------- */
const STARTER_DECKS = [
  {
    name: 'Everyday Essentials',
    emoji: '☕',
    description: 'High-frequency words for daily conversation, work and small talk (B1).',
    cards: [
      { term:'reliable', pos:'adjective', definition:'Able to be trusted to do what is expected or promised.', example:'She is the most reliable person on the team — she never misses a deadline.', translation:'güvenilir', category:'Character' },
      { term:'afford', pos:'verb', definition:'To have enough money or time for something.', example:'We cannot afford a new car this year.', translation:'(parasal olarak) gücü yetmek', category:'Money' },
      { term:'commute', pos:'noun', definition:'The regular journey between home and work.', example:'My commute takes about forty minutes each way.', translation:'işe gidiş-geliş yolculuğu', category:'Work' },
      { term:'overwhelmed', pos:'adjective', definition:'Feeling unable to cope because there is too much to deal with.', example:'I felt completely overwhelmed by the number of emails.', translation:'bunalmış, altında ezilmiş', category:'Feelings' },
      { term:'errand', pos:'noun', definition:'A short trip to do a small job, usually for someone else.', example:'I have a few errands to run before the shops close.', translation:'ufak iş, ayak işi', category:'Daily Life' },
      { term:'postpone', pos:'verb', definition:'To move an event to a later time.', example:'They decided to postpone the meeting until Friday.', translation:'ertelemek', category:'Work' },
      { term:'straightforward', pos:'adjective', definition:'Easy to understand or do; not complicated.', example:'The instructions were straightforward, so it only took ten minutes.', translation:'anlaşılır, basit', category:'Description' },
      { term:'appreciate', pos:'verb', definition:'To be grateful for something, or to recognise its value.', example:'I really appreciate everything you have done for me.', translation:'minnettar olmak, kıymetini bilmek', category:'Feelings' },
      { term:'spare', pos:'adjective', definition:'Kept in case it is needed; extra.', example:'Keep a spare key with your neighbour.', translation:'yedek', category:'Daily Life' },
      { term:'chore', pos:'noun', definition:'A routine household task.', example:'We split the chores: he cooks and I do the dishes.', translation:'ev işi', category:'Daily Life' },
      { term:'crowded', pos:'adjective', definition:'Full of people, leaving little space.', example:'The train was so crowded that I had to stand.', translation:'kalabalık', category:'Travel' },
      { term:'borrow', pos:'verb', definition:'To take and use something belonging to someone else, intending to return it.', example:'Can I borrow your charger for a minute?', translation:'ödünç almak', category:'Daily Life' },
      { term:'deadline', pos:'noun', definition:'The latest time by which something must be finished.', example:'The deadline for the report is Monday morning.', translation:'son teslim tarihi', category:'Work' },
      { term:'convenient', pos:'adjective', definition:'Useful because it suits your needs or saves trouble.', example:'Would three o’clock be convenient for you?', translation:'uygun, elverişli', category:'Description' },
      { term:'complain', pos:'verb', definition:'To say that you are annoyed or unhappy about something.', example:'Several guests complained about the noise.', translation:'şikâyet etmek', category:'Communication' },
      { term:'exhausted', pos:'adjective', definition:'Extremely tired.', example:'After the flight I was completely exhausted.', translation:'bitkin, çok yorgun', category:'Feelings' },
      { term:'neighbourhood', pos:'noun', definition:'The area of a town where you live and the people in it.', example:'They moved to a quieter neighbourhood near the park.', translation:'mahalle, semt', category:'Places' },
      { term:'afford to', pos:'phrase', definition:'To be able to risk doing something without bad consequences.', example:'We cannot afford to lose another customer.', translation:'göze alabilmek', category:'Work' },
      { term:'refund', pos:'noun', definition:'Money paid back to a customer.', example:'They gave me a full refund for the damaged bag.', translation:'para iadesi', category:'Money' },
      { term:'reschedule', pos:'verb', definition:'To arrange a new time for something.', example:'Could we reschedule our call to tomorrow?', translation:'yeniden planlamak', category:'Work' },
      { term:'grateful', pos:'adjective', definition:'Feeling thankful for something someone did.', example:'I am grateful for all the help you gave me last week.', translation:'minnettar', category:'Feelings' },
      { term:'occasionally', pos:'adverb', definition:'Sometimes, but not often.', example:'We occasionally have dinner at that little Italian place.', translation:'ara sıra', category:'Time' },
      { term:'struggle', pos:'verb', definition:'To try very hard to do something difficult.', example:'He struggled to explain the idea in English.', translation:'zorlanmak, mücadele etmek', category:'Feelings' },
      { term:'worth it', pos:'phrase', definition:'Good enough to justify the money, time or effort spent.', example:'The tickets were expensive, but the concert was worth it.', translation:'değer, buna değer', category:'Opinion' }
    ]
  },
  {
    name: 'Academic & Formal English',
    emoji: '🎓',
    description: 'Vocabulary for essays, reports, exams and professional writing (B2–C1).',
    cards: [
      { term:'significant', pos:'adjective', definition:'Large or important enough to have an effect or be noticed.', example:'The study found a significant improvement in reading speed.', translation:'önemli, kayda değer', category:'Analysis',
        collocations:['a significant increase','a significant difference','statistically significant'], related:[{kind:'syn',text:'considerable'},{kind:'ant',text:'negligible'}] },
      { term:'assume', pos:'verb', definition:'To accept something as true without proof.', example:'We should not assume that the results apply to every group.', translation:'varsaymak', category:'Reasoning' },
      { term:'evidence', pos:'noun', definition:'Facts or information showing whether something is true.', example:'There is little evidence to support that claim.', translation:'kanıt', category:'Research' },
      { term:'nevertheless', pos:'adverb', definition:'In spite of what has just been said.', example:'The sample was small; nevertheless, the findings are useful.', translation:'yine de, buna rağmen', category:'Linking' },
      { term:'implement', pos:'verb', definition:'To put a plan or decision into effect.', example:'The company will implement the new policy in March.', translation:'uygulamaya koymak', category:'Business',
        collocations:['implement a policy','implement a plan','implement changes'] },
      { term:'consequently', pos:'adverb', definition:'As a result of something.', example:'Costs rose sharply; consequently, prices went up.', translation:'sonuç olarak, bu yüzden', category:'Linking' },
      { term:'crucial', pos:'adjective', definition:'Extremely important because it affects the outcome.', example:'Sleep plays a crucial role in memory formation.', translation:'çok önemli, kritik', category:'Analysis',
        collocations:['play a crucial role','a crucial factor','crucially important'], related:[{kind:'syn',text:'vital'}] },
      { term:'demonstrate', pos:'verb', definition:'To show clearly that something exists or is true.', example:'The results demonstrate a clear link between the two factors.', translation:'göstermek, ortaya koymak', category:'Research' },
      { term:'sufficient', pos:'adjective', definition:'As much as is needed.', example:'We do not have sufficient data to draw a conclusion.', translation:'yeterli', category:'Quantity' },
      { term:'furthermore', pos:'adverb', definition:'In addition to what has already been said.', example:'The method is fast; furthermore, it is inexpensive.', translation:'ayrıca, dahası', category:'Linking' },
      { term:'contribute', pos:'verb', definition:'To help cause a result, or to give something to a shared effort.', example:'Poor diet can contribute to a range of health problems.', translation:'katkıda bulunmak', category:'Reasoning' },
      { term:'subsequent', pos:'adjective', definition:'Happening after something else.', example:'The error was corrected in subsequent editions of the book.', translation:'sonraki, müteakip', category:'Time' },
      { term:'comprehensive', pos:'adjective', definition:'Including everything that is relevant; complete.', example:'The report gives a comprehensive overview of the market.', translation:'kapsamlı', category:'Description' },
      { term:'emphasise', pos:'verb', definition:'To give special importance or attention to something.', example:'The author emphasises the need for further research.', translation:'vurgulamak', category:'Communication' },
      { term:'considerable', pos:'adjective', definition:'Large in size, amount or importance.', example:'The project required a considerable amount of time.', translation:'hatırı sayılır, epeyce', category:'Quantity' },
      { term:'inevitable', pos:'adjective', definition:'Certain to happen and impossible to avoid.', example:'Some delay was inevitable given the scale of the work.', translation:'kaçınılmaz', category:'Description' },
      { term:'perspective', pos:'noun', definition:'A particular way of thinking about something.', example:'From an economic perspective, the decision makes sense.', translation:'bakış açısı', category:'Opinion' },
      { term:'undermine', pos:'verb', definition:'To weaken something gradually.', example:'Repeated errors undermine the credibility of the study.', translation:'zayıflatmak, baltalamak', category:'Analysis',
        collocations:['undermine confidence','undermine credibility','undermine an argument'], related:[{kind:'syn',text:'weaken'},{kind:'ant',text:'strengthen'}] },
      { term:'object', pos:'noun', sense:'a thing', definition:'A thing that can be seen or touched.', example:'The telescope revealed a faint object near the horizon.', translation:'nesne, cisim', category:'Science',
        collocations:['a moving object','an inanimate object'] },
      { term:'object', pos:'noun', sense:'an aim', definition:'The purpose of an action or plan.', example:'The object of the exercise is to reduce waiting times.', translation:'amaç, hedef', category:'Analysis',
        collocations:['the object of the exercise'], related:[{kind:'syn',text:'purpose'}] },
      { term:'object', pos:'verb', sense:'to protest', definition:'To say that you disagree with or disapprove of something.', example:'Several residents objected to the proposed development.', translation:'itiraz etmek, karşı çıkmak', category:'Debate',
        collocations:['object to a proposal','strongly object'], related:[{kind:'syn',text:'protest'},{kind:'ant',text:'approve'}] },
      { term:'feasible', pos:'adjective', definition:'Possible to do easily or conveniently.', example:'It is not feasible to interview every participant twice.', translation:'yapılabilir, uygulanabilir', category:'Planning' },
      { term:'discrepancy', pos:'noun', definition:'A difference between things that should be the same.', example:'There was a discrepancy between the two sets of figures.', translation:'tutarsızlık, uyuşmazlık', category:'Analysis' },
      { term:'arguably', pos:'adverb', definition:'Used to say something can be reasonably argued.', example:'This is arguably the most influential paper in the field.', translation:'tartışmalı olarak, muhtemelen', category:'Opinion' },
      { term:'prioritise', pos:'verb', definition:'To decide which things are most important and deal with them first.', example:'We need to prioritise the tasks with the closest deadlines.', translation:'önceliklendirmek', category:'Planning' }
    ]
  },
  {
    name: 'Phrasal Verbs & Idioms',
    emoji: '🧩',
    description: 'Natural, spoken English that textbooks often skip.',
    cards: [
      { term:'put off', pos:'phrasal verb', definition:'To delay something until later.', example:'Stop putting off the dentist appointment.', translation:'ertelemek', category:'Time' },
      { term:'figure out', pos:'phrasal verb', definition:'To understand or solve something after thinking.', example:'It took me an hour to figure out how the app works.', translation:'çözmek, anlamak', category:'Thinking' },
      { term:'run out of', pos:'phrasal verb', definition:'To use all of something so that none is left.', example:'We have run out of coffee again.', translation:'tükenmek, bitmek', category:'Daily Life' },
      { term:'look forward to', pos:'phrasal verb', definition:'To feel pleased about something that is going to happen.', example:'I am looking forward to seeing you next month.', translation:'dört gözle beklemek', category:'Feelings' },
      { term:'get along with', pos:'phrasal verb', definition:'To have a friendly relationship with someone.', example:'She gets along with everyone in the office.', translation:'iyi geçinmek', category:'Relationships' },
      { term:'come up with', pos:'phrasal verb', definition:'To think of an idea, plan or solution.', example:'He came up with a clever way to cut costs.', translation:'(fikir) bulmak, ortaya atmak', category:'Thinking' },
      { term:'give up', pos:'phrasal verb', definition:'To stop trying, or to stop a habit.', example:'Do not give up now — you are almost there.', translation:'pes etmek, vazgeçmek', category:'Effort' },
      { term:'take over', pos:'phrasal verb', definition:'To take control of something.', example:'A larger firm took over the company last year.', translation:'devralmak', category:'Business' },
      { term:'turn down', pos:'phrasal verb', sense:'to refuse', definition:'To refuse an offer or invitation.', example:'She turned down the job because of the commute.', translation:'reddetmek', category:'Decisions',
        collocations:['turn down an offer','turn down an invitation','turn down a job'], related:[{kind:'syn',text:'reject'},{kind:'ant',text:'accept'}] },
      { term:'turn down', pos:'phrasal verb', sense:'to lower', definition:'To reduce the volume, heat or power of something.', example:'Could you turn down the music a little?', translation:'kısmak, azaltmak', category:'Daily Life',
        collocations:['turn down the volume','turn down the heating'] },
      { term:'work out', pos:'phrasal verb', sense:'to turn out well', definition:'To develop in a good or successful way in the end.', example:'Do not worry — everything will work out in the end.', translation:'yoluna girmek', category:'Life',
        collocations:['work out well','work out for the best'] },
      { term:'work out', pos:'phrasal verb', sense:'to exercise', definition:'To do physical exercise to keep fit.', example:'He works out at the gym three mornings a week.', translation:'spor yapmak, antrenman yapmak', category:'Health',
        collocations:['work out at the gym','work out regularly'] },
      { term:'work out', pos:'phrasal verb', sense:'to calculate', definition:'To find an answer by thinking or calculating.', example:'I could not work out how much the trip would cost.', translation:'hesaplamak, çözmek', category:'Thinking',
        collocations:['work out the cost','work out a solution'], related:[{kind:'syn',text:'figure out'}] },
      { term:'bring up', pos:'phrasal verb', sense:'to mention', definition:'To start talking about a subject.', example:'He brought up the budget problem during the meeting.', translation:'(konu) açmak', category:'Communication',
        collocations:['bring up a subject','bring up a point','bring up an issue'], related:[{kind:'syn',text:'raise'}] },
      { term:'bring up', pos:'phrasal verb', sense:'to raise a child', definition:'To look after a child until they are grown.', example:'She was brought up by her grandparents in Izmir.', translation:'yetiştirmek, büyütmek', category:'Relationships',
        collocations:['bring up a child','be brought up in'] },
      { term:'catch up', pos:'phrasal verb', sense:'to reach the same level', definition:'To reach someone or something that is ahead of you.', example:'She missed two weeks and had to catch up with the class.', translation:'yetişmek, açığı kapatmak', category:'Learning',
        collocations:['catch up with the class','catch up on work','catch up on sleep'] },
      { term:'catch up', pos:'phrasal verb', sense:'to exchange news', definition:'To talk with someone you have not seen for a while.', example:'Let us catch up over coffee this weekend.', translation:'hasret gidermek, sohbet etmek', category:'Relationships',
        collocations:['catch up over coffee','catch up with an old friend'] },
      { term:'once in a blue moon', pos:'idiom', definition:'Very rarely.', example:'He calls his brother once in a blue moon.', translation:'kırk yılda bir', category:'Frequency' },
      { term:'the last straw', pos:'idiom', definition:'The final small problem that makes a situation unbearable.', example:'Losing the file was the last straw — he resigned that day.', translation:'bardağı taşıran son damla', category:'Feelings' },
      { term:'get the hang of', pos:'idiom', definition:'To learn how to do something with practice.', example:'It looks hard, but you will get the hang of it quickly.', translation:'püf noktasını kapmak', category:'Learning' },
      { term:'call it a day', pos:'idiom', definition:'To stop working for the day.', example:'We have done enough — let us call it a day.', translation:'paydos etmek', category:'Work' },
      { term:'on the same page', pos:'idiom', definition:'In agreement, sharing the same understanding.', example:'Before we start, let us make sure everyone is on the same page.', translation:'aynı fikirde olmak', category:'Communication' },
      { term:'a piece of cake', pos:'idiom', definition:'Something very easy to do.', example:'The exam was a piece of cake compared with last year.', translation:'çocuk oyuncağı', category:'Difficulty' },
      { term:'break the ice', pos:'idiom', definition:'To say or do something to reduce tension between strangers.', example:'He told a joke to break the ice at the start of the meeting.', translation:'buzları eritmek', category:'Communication' },
      { term:'cut corners', pos:'idiom', definition:'To do something badly or cheaply to save time or money.', example:'They cut corners on safety and it cost them dearly.', translation:'kestirmeden gitmek, işi savsaklamak', category:'Work' }
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
  additions: [{ deck: 'Academic & Formal English', term: 'object' }]
};
