import { PrismaClient } from '@prisma/client';
import { findWordSpans, serializeSpans } from '../src/lib/highlight';

const prisma = new PrismaClient();

type SampleMeaning = {
  partOfSpeech: 'NOUN' | 'VERB' | 'ADJECTIVE' | 'ADVERB' | 'PREPOSITION' | 'CONJUNCTION' | 'PRONOUN' | 'INTERJECTION' | 'PHRASAL_VERB';
  ipa?: string;
  label?: string;
  cefr?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  definitionEn: string;
  definitionTr: string;
  synonyms?: string;
  antonyms?: string;
  tags: string[];
  examples: string[];
};

type SampleCard = {
  vocabulary: string;
  ipa: string;
  mnemonic: string;
  collocations: string;
  meanings: SampleMeaning[];
};

const SAMPLE_CARDS: SampleCard[] = [
  {
    vocabulary: 'resilient',
    ipa: '/rɪˈzɪliənt/',
    mnemonic: 'Picture a RE-SILIENT rubber ball — no matter how hard it\'s thrown down, it bounces right back up.',
    collocations: 'remain resilient, resilient economy, emotionally resilient',
    meanings: [
      {
        partOfSpeech: 'ADJECTIVE',
        cefr: 'C1',
        definitionEn: 'Able to withstand or recover quickly from difficult conditions.',
        definitionTr: 'Zorluklardan çabuk toparlanabilen, dirençli.',
        synonyms: 'tough, hardy, adaptable, durable',
        antonyms: 'fragile, vulnerable',
        tags: ['emotions', 'toefl'],
        examples: [
          'Despite losing her job, she remained remarkably resilient and found new opportunities within weeks.',
          'Coral reefs are surprisingly resilient, recovering from storm damage over a few seasons.',
        ],
      },
    ],
  },
  {
    vocabulary: 'meticulous',
    ipa: '/məˈtɪkjʊləs/',
    mnemonic: 'A MET-ICULOUS chef weighs every single ingredient on a tiny scale before cooking.',
    collocations: 'meticulous planning, meticulous attention to detail, meticulous researcher',
    meanings: [
      {
        partOfSpeech: 'ADJECTIVE',
        cefr: 'C1',
        definitionEn: 'Showing great attention to detail; very careful and precise.',
        definitionTr: 'Titiz, ayrıntılara büyük özen gösteren.',
        synonyms: 'precise, thorough, painstaking',
        antonyms: 'careless, sloppy',
        tags: ['business', 'academic'],
        examples: [
          'The architect was meticulous about every measurement on the blueprint.',
          'Her meticulous notes made it easy for the team to pick up the project.',
        ],
      },
    ],
  },
  {
    vocabulary: 'ambiguous',
    ipa: '/æmˈbɪɡjuəs/',
    mnemonic: 'AMBI- means "both" — like AMBIdextrous uses both hands, an AMBIguous sentence has two meanings.',
    collocations: 'ambiguous statement, morally ambiguous, deliberately ambiguous',
    meanings: [
      {
        partOfSpeech: 'ADJECTIVE',
        cefr: 'C1',
        definitionEn: 'Open to more than one interpretation; not having one obvious meaning.',
        definitionTr: 'Belirsiz, birden fazla anlama gelebilen.',
        synonyms: 'vague, unclear, equivocal',
        antonyms: 'clear, unambiguous, explicit',
        tags: ['academic'],
        examples: [
          'The contract\'s wording was ambiguous, so both sides interpreted it differently.',
          'His ambiguous answer left us more confused than before.',
        ],
      },
    ],
  },
  {
    vocabulary: 'give up',
    ipa: '/ɡɪv ʌp/',
    mnemonic: 'You GIVE your effort UP into the air and let it go — you stop holding on.',
    collocations: 'give up smoking, never give up, give up on a dream',
    meanings: [
      {
        partOfSpeech: 'PHRASAL_VERB',
        cefr: 'A2',
        definitionEn: 'To stop trying to do something; to quit.',
        definitionTr: 'Vazgeçmek, pes etmek.',
        synonyms: 'quit, abandon, surrender',
        antonyms: 'persevere, persist',
        tags: ['phrasal-verbs', 'daily-life'],
        examples: [
          'She refused to give up on her dream of becoming a pilot.',
          'Don\'t give up now — you\'re almost at the finish line.',
        ],
      },
    ],
  },
  {
    // Two-sense showcase across *different* parts of speech — stress and
    // pronunciation shift with word class, so each part-of-speech header
    // carries its own ipa override, and each sense keeps its own
    // synonyms/antonyms/tags since "a thing" and "to protest" share
    // nothing worth tagging the same way.
    vocabulary: 'object',
    ipa: '/ˈɒbdʒɪkt/',
    mnemonic: 'The stress moves: an OBject is a THING (stress up front); to obJECT is to push back (stress jumps to the end).',
    collocations: 'object of desire, direct object, object strongly, object to a proposal',
    meanings: [
      {
        partOfSpeech: 'NOUN',
        ipa: '/ˈɒbdʒɪkt/',
        label: 'THING',
        cefr: 'A2',
        definitionEn: 'A thing that can be seen or touched but is not alive.',
        definitionTr: 'Cansız, elle tutulur bir şey.',
        synonyms: 'item, thing, article',
        tags: ['grammar'],
        examples: ['There was a strange object lying on the table.'],
      },
      {
        partOfSpeech: 'NOUN',
        ipa: '/ˈɒbdʒɪkt/',
        label: 'PURPOSE',
        cefr: 'B2',
        definitionEn: 'The goal or aim of an action or effort.',
        definitionTr: 'Bir eylemin veya çabanın amacı, hedefi.',
        synonyms: 'goal, aim, purpose, objective',
        tags: ['academic'],
        examples: ['Her main object in life was to help others.'],
      },
      {
        partOfSpeech: 'VERB',
        ipa: '/əbˈdʒɛkt/',
        cefr: 'B1',
        definitionEn: 'To express disapproval of or disagreement with something.',
        definitionTr: 'Bir şeye itiraz etmek, karşı çıkmak.',
        synonyms: 'protest, oppose, disagree',
        antonyms: 'agree, accept, consent',
        tags: ['grammar', 'debate'],
        examples: [
          'Several residents objected to the new construction plan.',
          'I object to being spoken to in that tone.',
        ],
      },
    ],
  },
  {
    // Three senses within the *same* part of speech — showcases the
    // a/b/c sub-sense lettering inside a single "phrasal verb" header,
    // each with its own synonyms and tags even though the part of speech
    // matches.
    vocabulary: 'make out',
    ipa: '/meɪk aʊt/',
    mnemonic: 'You have to "make out" shapes in the fog before you can "make out" what someone means, or make out okay despite the fog.',
    collocations: 'make out a figure in the distance, make out fine, make out with someone',
    meanings: [
      {
        partOfSpeech: 'PHRASAL_VERB',
        label: 'PERCEIVE',
        cefr: 'B2',
        definitionEn: 'To manage to see, hear, or understand something with difficulty.',
        definitionTr: 'Güçlükle görmek, duymak veya anlamak; seçebilmek.',
        synonyms: 'discern, distinguish, detect',
        tags: ['phrasal-verbs'],
        examples: ['Through the fog, we could just make out the shape of the lighthouse.'],
      },
      {
        partOfSpeech: 'PHRASAL_VERB',
        label: 'FARE',
        cefr: 'B2',
        definitionEn: 'To manage or fare in a situation (informal, especially American English).',
        definitionTr: 'Bir durumda idare etmek, başarılı olmak (gündelik dilde).',
        synonyms: 'manage, cope, fare',
        tags: ['phrasal-verbs', 'daily-life'],
        examples: ['How did you make out on your final exams?'],
      },
      {
        partOfSpeech: 'PHRASAL_VERB',
        label: 'KISS',
        cefr: 'B2',
        definitionEn: 'To kiss and touch someone in a romantic/sexual way (informal).',
        definitionTr: 'Sarılıp öpüşmek (gündelik/argo dilde).',
        synonyms: 'smooch, neck',
        tags: ['phrasal-verbs', 'informal'],
        examples: ['They were making out on the porch when the lights came on.'],
      },
    ],
  },
];

/**
 * Seeds sample cards for a real user, since cards now always belong to
 * someone (see the User model). There's no anonymous/global seed anymore
 * — sign up (or log in) first, then run `npm run db:seed`.
 *
 * By default it seeds the first account it finds. Pass an email to target
 * a specific one: `npm run db:seed -- you@example.com`.
 */
async function main() {
  const targetEmail = process.argv[2];

  const user = targetEmail
    ? await prisma.user.findUnique({ where: { email: targetEmail.toLowerCase() } })
    : await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!user) {
    console.log(
      targetEmail
        ? `No account found for ${targetEmail}. Sign up in the app first, then re-run this.`
        : 'No accounts exist yet. Sign up in the app first (at /signup), then re-run `npm run db:seed`.',
    );
    return;
  }

  console.log(`Seeding sample cards for ${user.email}…`);

  for (const sample of SAMPLE_CARDS) {
    const existing = await prisma.card.findFirst({ where: { userId: user.id, vocabulary: sample.vocabulary } });
    if (existing) continue;

    // Tags live on each sense now, so resolve/upsert them per meaning.
    const meaningsWithTagIds = await Promise.all(
      sample.meanings.map(async (meaning) => {
        const tagIds = await Promise.all(
          meaning.tags.map(async (name) => {
            const tag = await prisma.tag.upsert({
              where: { userId_name: { userId: user.id, name } },
              update: {},
              create: { userId: user.id, name },
            });
            return tag.id;
          }),
        );
        return { meaning, tagIds };
      }),
    );

    await prisma.card.create({
      data: {
        userId: user.id,
        vocabulary: sample.vocabulary,
        ipa: sample.ipa,
        mnemonic: sample.mnemonic,
        collocations: sample.collocations,
        meanings: {
          create: meaningsWithTagIds.map(({ meaning, tagIds }, mi) => ({
            order: mi,
            partOfSpeech: meaning.partOfSpeech,
            ipa: meaning.ipa ?? null,
            label: meaning.label ?? null,
            cefr: meaning.cefr ?? null,
            definitionEn: meaning.definitionEn,
            definitionTr: meaning.definitionTr,
            synonyms: meaning.synonyms ?? null,
            antonyms: meaning.antonyms ?? null,
            tags: { create: tagIds.map((tagId) => ({ tagId })) },
            examples: {
              create: meaning.examples.map((text, i) => ({
                text,
                order: i,
                source: 'USER',
                highlightSpans: serializeSpans(findWordSpans(text, sample.vocabulary)),
              })),
            },
          })),
        },
      },
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
