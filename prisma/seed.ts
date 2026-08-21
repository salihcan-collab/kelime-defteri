import { PrismaClient } from '@prisma/client';
import { findWordSpans, serializeSpans } from '../src/lib/highlight';

const prisma = new PrismaClient();

type SampleMeaning = {
  partOfSpeech: 'NOUN' | 'VERB' | 'ADJECTIVE' | 'ADVERB' | 'PREPOSITION' | 'CONJUNCTION' | 'PRONOUN' | 'INTERJECTION' | 'PHRASAL_VERB';
  definitionEn: string;
  definitionTr: string;
  examples: string[];
};

type SampleCard = {
  vocabulary: string;
  ipa: string;
  mnemonic: string;
  collocations: string;
  synonyms?: string;
  antonyms?: string;
  tags: string[];
  meanings: SampleMeaning[];
};

const SAMPLE_CARDS: SampleCard[] = [
  {
    vocabulary: 'resilient',
    ipa: '/rɪˈzɪliənt/',
    mnemonic: 'Picture a RE-SILIENT rubber ball — no matter how hard it\'s thrown down, it bounces right back up.',
    collocations: 'remain resilient, resilient economy, emotionally resilient',
    synonyms: 'tough, hardy, adaptable, durable',
    antonyms: 'fragile, vulnerable',
    tags: ['emotions', 'toefl'],
    meanings: [
      {
        partOfSpeech: 'ADJECTIVE',
        definitionEn: 'Able to withstand or recover quickly from difficult conditions.',
        definitionTr: 'Zorluklardan çabuk toparlanabilen, dirençli.',
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
    synonyms: 'precise, thorough, painstaking',
    antonyms: 'careless, sloppy',
    tags: ['business', 'academic'],
    meanings: [
      {
        partOfSpeech: 'ADJECTIVE',
        definitionEn: 'Showing great attention to detail; very careful and precise.',
        definitionTr: 'Titiz, ayrıntılara büyük özen gösteren.',
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
    synonyms: 'vague, unclear, equivocal',
    antonyms: 'clear, unambiguous, explicit',
    tags: ['academic'],
    meanings: [
      {
        partOfSpeech: 'ADJECTIVE',
        definitionEn: 'Open to more than one interpretation; not having one obvious meaning.',
        definitionTr: 'Belirsiz, birden fazla anlama gelebilen.',
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
    synonyms: 'quit, abandon, surrender',
    antonyms: 'persevere, persist',
    tags: ['phrasal-verbs', 'daily-life'],
    meanings: [
      {
        partOfSpeech: 'PHRASAL_VERB',
        definitionEn: 'To stop trying to do something; to quit.',
        definitionTr: 'Vazgeçmek, pes etmek.',
        examples: [
          'She refused to give up on her dream of becoming a pilot.',
          'Don\'t give up now — you\'re almost at the finish line.',
        ],
      },
    ],
  },
  {
    vocabulary: 'object',
    ipa: '/ˈɒbdʒɪkt/ (noun), /əbˈdʒɛkt/ (verb)',
    mnemonic: 'The stress moves: an OBject is a THING (stress up front); to obJECT is to push back (stress jumps to the end).',
    collocations: 'object of desire, direct object, object strongly, object to a proposal',
    tags: ['grammar', 'academic'],
    meanings: [
      {
        partOfSpeech: 'NOUN',
        definitionEn: 'A thing that can be seen or touched but is not alive; also, the target or goal of an action or feeling.',
        definitionTr: 'Cansız, elle tutulur bir şey; ayrıca bir eylemin veya duygunun hedefi.',
        examples: [
          'There was a strange object lying on the table.',
          'Her main object in life was to help others.',
        ],
      },
      {
        partOfSpeech: 'VERB',
        definitionEn: 'To express disapproval of or disagreement with something.',
        definitionTr: 'Bir şeye itiraz etmek, karşı çıkmak.',
        examples: [
          'Several residents objected to the new construction plan.',
          'I object to being spoken to in that tone.',
        ],
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

    const tagIds = await Promise.all(
      sample.tags.map(async (name) => {
        const tag = await prisma.tag.upsert({
          where: { userId_name: { userId: user.id, name } },
          update: {},
          create: { userId: user.id, name },
        });
        return tag.id;
      }),
    );

    await prisma.card.create({
      data: {
        userId: user.id,
        vocabulary: sample.vocabulary,
        ipa: sample.ipa,
        mnemonic: sample.mnemonic,
        collocations: sample.collocations,
        synonyms: sample.synonyms ?? null,
        antonyms: sample.antonyms ?? null,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        meanings: {
          create: sample.meanings.map((meaning, mi) => ({
            order: mi,
            partOfSpeech: meaning.partOfSpeech,
            definitionEn: meaning.definitionEn,
            definitionTr: meaning.definitionTr,
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
