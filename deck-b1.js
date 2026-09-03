/* ==========================================================================
   B1 Preliminary — the Cambridge vocabulary list as a deck.

   Cambridge publishes the list as words and parts of speech; everything a card
   needs beyond that is written here. Where Cambridge printed an example of its
   own it is kept, because it shows the sense the exam expects.

   Every card follows the same rules, and tools/check-b1.js enforces them:
     · the example contains the term as it is written on the card
     · the definition is plain English, at most 30 words, no abbreviations
     · the translation gives the 2-3 renderings Turkish actually uses
     · collocations are set phrases that contain the word — never padding
     · family members are separate dictionary words, not inflections
   ========================================================================== */
const B1_DECK = {
  name: 'B1 Preliminary',
  emoji: '🎓',
  description: 'The Cambridge B1 Preliminary vocabulary list (August 2025) — every word, with a definition, an example, a translation and its word family.',
  cards: [

    { term:'able', pos:'adjective', tags:['Language'], definition:'Having the skill, strength or opportunity to do something.',
      example:'She was able to answer every question without looking at her notes.',
      translation:'muktedir, yapabilen', collocations:['be able to'],
      related:[{kind:'ant',text:'unable'},{kind:'family',text:'ability'},{kind:'family',text:'disabled'}] },

    { term:'absolutely', pos:'adverb', definition:'Completely, or used to agree strongly with someone.',
      example:'The movie was absolutely awful.',
      translation:'kesinlikle, tamamen', collocations:['absolutely right','absolutely not'],
      related:[{kind:'syn',text:'completely'},{kind:'syn',text:'totally'},{kind:'family',text:'absolute'}] },

    { term:'accent', pos:'noun', definition:'The way someone pronounces words, showing where they come from.',
      example:'She has a beautiful French accent.',
      translation:'aksan, şive', collocations:['a strong accent','a foreign accent'],
      related:[{kind:'family',text:'accentuate'}] },

    { term:'access', pos:'noun', tags:['Communications and Technology'], definition:'The right or the means to enter a place or use something.',
      example:'The flat has easy access to the city centre.',
      translation:'erişim, giriş', collocations:['internet access','disabled access','access to'],
      related:[{kind:'family',text:'accessible'},{kind:'family',text:'accessory'}] },

    { term:'accident', pos:'noun', tags:['Health, Medicine and Exercise'], definition:'Something bad that happens without anyone planning it, often hurting someone.',
      example:'He broke his arm in a cycling accident.',
      translation:'kaza', collocations:['a car accident','by accident','have an accident'],
      related:[{kind:'family',text:'accidental'},{kind:'family',text:'accidentally'}] },

    { term:'achieve', pos:'verb', definition:'To succeed in doing something after working for it.',
      example:'She worked for years to achieve her ambition of running a restaurant.',
      translation:'başarmak, elde etmek', collocations:['achieve a goal','achieve success'],
      related:[{kind:'syn',text:'accomplish'},{kind:'family',text:'achievement'}] },

    { term:'actually', pos:'adverb', definition:'In fact, or used to correct what someone believes.',
      example:'She seems a bit strict at first, but she is actually very nice.',
      translation:'aslında, gerçekten', collocations:[],
      related:[{kind:'syn',text:'really'},{kind:'syn',text:'in fact'},{kind:'family',text:'actual'}] },

    { term:'admire', pos:'verb', definition:'To respect someone, or to look at something and enjoy how good it is.',
      example:'I admire the way she stays calm when everything goes wrong.',
      translation:'hayran olmak, takdir etmek', collocations:['admire someone for something'],
      related:[{kind:'family',text:'admiration'},{kind:'family',text:'admirable'}] },

    { term:'advice', pos:'noun', definition:'An opinion about what someone should do.',
      example:'My teacher gave me some useful advice about the exam.',
      translation:'tavsiye, öğüt', collocations:['give advice','take advice','a piece of advice'],
      related:[{kind:'family',text:'advise'},{kind:'family',text:'adviser'}],
      notes:'Uncountable: "some advice", "a piece of advice" — never "an advice" or "advices".' },

    { term:'advise', pos:'verb', definition:'To tell someone what you think they should do.',
      example:'The doctor advised him to rest for a week.',
      translation:'tavsiye etmek, öğüt vermek', collocations:['advise someone to do something','strongly advise'],
      related:[{kind:'family',text:'advice'},{kind:'family',text:'adviser'}],
      notes:'The verb is spelt with an s and the noun (advice) with a c.' },

    { term:'afford', pos:'verb', definition:'To have enough money or time for something.',
      example:'We cannot afford a holiday this year.',
      translation:'gücü yetmek, parası yetmek', collocations:['can afford','afford to do something'],
      related:[{kind:'family',text:'affordable'}],
      notes:'Almost always used with can, could or be able to.' },

    { term:'ancient', pos:'adjective', definition:'From a time thousands of years ago, or very old indeed.',
      example:'We spent the morning walking round an ancient Greek temple.',
      translation:'antik, kadim, çok eski', collocations:['ancient history','ancient ruins'],
      related:[{kind:'ant',text:'modern'}] },

    { term:'announce', pos:'verb', definition:'To tell people about something officially or publicly.',
      example:'The airline announced that the flight would be two hours late.',
      translation:'duyurmak, ilan etmek', collocations:['announce a decision'],
      related:[{kind:'family',text:'announcement'},{kind:'family',text:'announcer'}] },

    { term:'annoyed', pos:'adjective', tags:['Language'], definition:'A little angry about something.',
      example:'She was annoyed that nobody had told her about the change.',
      translation:'kızgın, sinirlenmiş, canı sıkkın', collocations:['annoyed with someone','annoyed about something'],
      related:[{kind:'syn',text:'irritated'},{kind:'family',text:'annoy'},{kind:'family',text:'annoying'}],
      notes:'Annoyed is how you feel; annoying is what causes it.' },

    { term:'answer', pos:'noun', tags:['Language'], sense:'a reply', definition:'What you say or write when someone asks you something.',
      example:'I wrote to them last month but I am still waiting for an answer.',
      translation:'cevap, yanıt, karşılık', collocations:['the right answer','give an answer'],
      related:[{kind:'syn',text:'reply'},{kind:'syn',text:'response'},{kind:'ant',text:'question'}] },

    { term:'answer', pos:'verb', tags:['Language'], sense:'to reply', definition:'To say or write something back to someone who has asked you.',
      example:'Please answer the question in your own words.',
      translation:'cevaplamak, yanıtlamak', collocations:['answer a question','answer the phone','answer the door'],
      related:[{kind:'syn',text:'reply'},{kind:'family',text:'answerphone'}] },

    { term:'apologise', pos:'verb', definition:'To say that you are sorry for something you have done.',
      example:'He apologised for arriving so late.',
      translation:'özür dilemek', collocations:['apologise for something','apologise to someone'],
      related:[{kind:'family',text:'apology'}],
      notes:'British spelling. American English writes apologize.' },

    { term:'appointment', pos:'noun', tags:['Time'], definition:'An arrangement to meet someone at a particular time.',
      example:'I have a dental appointment at four o’clock.',
      translation:'randevu', collocations:['make an appointment','a doctor’s appointment'],
      related:[{kind:'family',text:'appoint'}],
      notes:'For meeting a doctor or a client. A meeting with a friend is a date or arrangement, not an appointment.' },

    { term:'argue', pos:'verb', tags:['Language'], definition:'To disagree with someone, often angrily.',
      example:'They argue about money almost every week.',
      translation:'tartışmak, kavga etmek', collocations:['argue with someone','argue about something'],
      related:[{kind:'family',text:'argument'}] },

    { term:'arrange', pos:'verb', definition:'To plan something, or to put things in a particular order.',
      example:'Could you arrange a meeting for Thursday morning?',
      translation:'ayarlamak, düzenlemek', collocations:['arrange a meeting','arrange to meet'],
      related:[{kind:'syn',text:'organise'},{kind:'family',text:'arrangement'}] },

    { term:'at least', pos:'phrase', definition:'Not less than a number, or used to mention one good thing in a bad situation.',
      example:'It rained all week, but at least the hotel was comfortable.',
      translation:'en azından, hiç değilse', collocations:[],
      related:[{kind:'ant',text:'at most'}] },

    { term:'attend', pos:'verb', definition:'To go to an event, a class or a meeting.',
      example:'All the students must attend the first lecture.',
      translation:'katılmak, devam etmek', collocations:['attend a meeting','attend a course'],
      related:[{kind:'family',text:'attendance'}],
      notes:'More formal than go to. You attend a meeting — no preposition after it.' },

    { term:'autumn', pos:'noun', tags:['Time'], definition:'The season between summer and winter, when leaves fall.',
      example:'The forest is beautiful in autumn.',
      translation:'sonbahar, güz', collocations:['in autumn','last autumn'],
      related:[{kind:'family',text:'season'}],
      notes:'British English. American English says fall.' },

    { term:'avoid', pos:'verb', definition:'To stay away from something, or to stop something from happening.',
      example:'We left early to avoid the traffic.',
      translation:'kaçınmak, sakınmak', collocations:['avoid doing something'],
      related:[{kind:'family',text:'unavoidable'}],
      notes:'Followed by the -ing form: "avoid making mistakes", never "avoid to make".' },

    { term:'background', pos:'noun', sense:'behind', definition:'The part of a view or a picture that is furthest away.',
      example:'You can see the mountains in the background of the photo.',
      translation:'arka plan, fon', collocations:['in the background'],
      related:[{kind:'ant',text:'foreground'}] },

    { term:'background', pos:'noun', sense:'experience', definition:'Someone’s family, education and past experience.',
      example:'She has a background in engineering.',
      translation:'geçmiş, özgeçmiş, altyapı', collocations:['a background in something','family background'],
      related:[{kind:'syn',text:'experience'}] },

    { term:'bargain', pos:'noun', tags:['Shopping'], definition:'Something bought for much less than it is worth.',
      example:'At that price the bike was a real bargain.',
      translation:'kelepir, ucuzluk', collocations:['a real bargain','a bargain price'],
      related:[{kind:'syn',text:'a good deal'}] },

    { term:'belong', pos:'verb', definition:'To be owned by someone, or to be in the right place.',
      example:'These keys belong to my brother.',
      translation:'ait olmak', collocations:['belong to someone'],
      related:[{kind:'family',text:'belongings'}] },

    { term:'borrow', pos:'verb', definition:'To take something from someone and give it back later.',
      example:'Can I borrow your pen for a minute?',
      translation:'ödünç almak', collocations:['borrow money','borrow something from someone'],
      related:[{kind:'ant',text:'lend'}],
      notes:'You borrow from someone; they lend to you. The two are opposite directions.' },

    { term:'break down', pos:'phrasal verb', definition:'To stop working, used of a machine or a vehicle.',
      example:'The car has broken down.',
      translation:'bozulmak, arızalanmak', collocations:[],
      related:[{kind:'family',text:'breakdown'}] },

    { term:'brief', pos:'adjective', definition:'Lasting a short time, or using few words.',
      example:'She gave a brief description of what had happened.',
      translation:'kısa, özlü', collocations:['a brief visit','in brief'],
      related:[{kind:'syn',text:'short'},{kind:'family',text:'briefly'}] },

    { term:'bring up', pos:'phrasal verb', sense:'to raise a child', definition:'To look after a child until it is grown up.',
      example:'She was brought up in London.',
      translation:'yetiştirmek, büyütmek', collocations:[],
      related:[{kind:'syn',text:'raise'},{kind:'family',text:'upbringing'}] },

    { term:'careful', pos:'adjective', tags:['Language'], definition:'Giving attention to what you are doing so that nothing goes wrong.',
      example:'Be careful with that knife.',
      translation:'dikkatli, özenli', collocations:['be careful','careful with something'],
      related:[{kind:'ant',text:'careless'},{kind:'family',text:'care'},{kind:'family',text:'carefully'}] },

    { term:'cheap', pos:'adjective', tags:['Shopping'], definition:'Costing little money.',
      example:'We found a cheap hotel near the station.',
      translation:'ucuz, hesaplı', collocations:['a cheap flight','dirt cheap'],
      related:[{kind:'ant',text:'expensive'},{kind:'family',text:'cheaply'}] },

    { term:'cheers', pos:'exclamation', definition:'Said when raising a glass, and in British English also for thank you or goodbye.',
      example:'Cheers! Here is to your new job.',
      translation:'şerefe, sağlığına', collocations:[],
      related:[{kind:'family',text:'cheerful'}],
      notes:'Informal. In Britain it also means thanks or bye.' },

    { term:'clothes', pos:'plural noun', tags:['Clothes and Accessories'], definition:'The things people wear, such as shirts, trousers and coats.',
      example:'I need to buy some warm clothes for the winter.',
      translation:'giysiler, kıyafetler, elbiseler', collocations:['put on clothes','take off clothes'],
      related:[{kind:'family',text:'clothing'},{kind:'family',text:'cloth'}],
      notes:'Always plural: "clothes are", never "a clothes". One item is "a piece of clothing".' },

    { term:'complain', pos:'verb', tags:['Shopping'], definition:'To say that you are not happy about something.',
      example:'She complained to the manager about the noise.',
      translation:'şikayet etmek, yakınmak', collocations:['complain about something','complain to someone'],
      related:[{kind:'family',text:'complaint'}] },

    { term:'confident', pos:'adjective', tags:['Language'], definition:'Sure that you can do something well, or sure that something is true.',
      example:'He is confident that he will pass the exam.',
      translation:'kendine güvenen, emin', collocations:['confident about something','feel confident'],
      related:[{kind:'family',text:'confidence'},{kind:'ant',text:'nervous'}] },

    { term:'crowded', pos:'adjective', definition:'Full of people, with little room to move.',
      example:'The train was so crowded that we had to stand.',
      translation:'kalabalık', collocations:['a crowded street','crowded with people'],
      related:[{kind:'family',text:'crowd'}] },

    { term:'deal with', pos:'phrasal verb', definition:'To take action about a problem, or to do business with someone.',
      example:'I have had some problems to deal with.',
      translation:'ilgilenmek, halletmek, uğraşmak', collocations:['deal with a problem'],
      related:[{kind:'syn',text:'handle'}] },

    { term:'delay', pos:'noun', tags:['Travel and Transport'], definition:'A time when something happens later than it should.',
      example:'There was a long delay at the airport.',
      translation:'gecikme, rötar', collocations:['a long delay','without delay'],
      related:[{kind:'syn',text:'hold-up'},{kind:'ant',text:'punctuality'}] },

    { term:'deliver', pos:'verb', tags:['Travel and Transport'], definition:'To take goods or letters to the place where they have been sent.',
      example:'They deliver the newspaper before seven every morning.',
      translation:'teslim etmek, dağıtmak', collocations:['deliver a parcel','deliver a message'],
      related:[{kind:'family',text:'delivery'}] },

    { term:'describe', pos:'verb', definition:'To say what someone or something is like.',
      example:'Can you describe the man you saw?',
      translation:'tarif etmek, betimlemek, anlatmak', collocations:['describe something to someone'],
      related:[{kind:'family',text:'description'}] },

    { term:'disappointed', pos:'adjective', tags:['Language'], definition:'Unhappy because something was not as good as you hoped.',
      example:'We were disappointed with the hotel.',
      translation:'hayal kırıklığına uğramış', collocations:['disappointed with something','disappointed that'],
      related:[{kind:'family',text:'disappoint'},{kind:'family',text:'disappointing'},{kind:'family',text:'disappointment'}],
      notes:'You are disappointed; the thing is disappointing.' },

    { term:'discover', pos:'verb', definition:'To find something, or to learn something you did not know.',
      example:'Scientists have discovered a new kind of insect in the forest.',
      translation:'keşfetmek, bulmak', collocations:['discover that'],
      related:[{kind:'family',text:'discovery'}] },

    { term:'earn', pos:'verb', tags:['Work and Jobs'], definition:'To get money by working, or to get something by deserving it.',
      example:'She earns more than her brother.',
      translation:'kazanmak', collocations:['earn money','earn a living'],
      related:[{kind:'family',text:'earnings'}],
      notes:'Earn is for work; win is for competitions and prizes.' },

    { term:'embarrassed', pos:'adjective', tags:['Language'], definition:'Feeling uncomfortable and shy because of something you have done.',
      example:'I felt embarrassed when I forgot her name.',
      translation:'utanmış, mahcup', collocations:['embarrassed about something'],
      related:[{kind:'family',text:'embarrass'},{kind:'family',text:'embarrassing'},{kind:'family',text:'embarrassment'}] },

    { term:'encourage', pos:'verb', definition:'To give someone the confidence or the reason to do something.',
      example:'My parents encouraged me to study abroad.',
      translation:'teşvik etmek, cesaretlendirmek', collocations:['encourage someone to do something'],
      related:[{kind:'ant',text:'discourage'},{kind:'family',text:'encouragement'}] },

    { term:'environment', pos:'noun', tags:['The Natural World'], definition:'The air, water and land around us, or the conditions someone lives and works in.',
      example:'Plastic waste is doing real harm to the environment.',
      translation:'çevre, ortam', collocations:['protect the environment','a working environment'],
      related:[{kind:'family',text:'environmental'},{kind:'syn',text:'surroundings'}] },

    { term:'give up', pos:'phrasal verb', definition:'To stop doing something, especially something you did regularly.',
      example:'Has David given up playing tennis?',
      translation:'bırakmak, vazgeçmek', collocations:['give up smoking'],
      related:[{kind:'syn',text:'quit'}] }
  ]
};
