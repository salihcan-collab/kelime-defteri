import { PrismaClient } from '@prisma/client';
import { findWordSpans, serializeSpans } from '../src/lib/highlight';

const prisma = new PrismaClient();

const SAMPLE_CARDS = [
  {
    vocabulary: 'resilient',
    ipa: '/rɪˈzɪliənt/',
    definitionEn: 'Able to withstand or recover quickly from difficult conditions.',
    definitionTr: 'Zorluklardan çabuk toparlanabilen, dirençli.',
    partOfSpeech: 'ADJECTIVE' as const,
    mnemonic: 'Picture a RE-SILIENT rubber ball — no matter how hard it\'s thrown down, it bounces right back up.',
    collocations: 'remain resilient, resilient economy, emotionally resilient',
    tags: ['emotions', 'toefl'],
    examples: [
      'Despite losing her job, she remained remarkably resilient and found new opportunities within weeks.',
      'Coral reefs are surprisingly resilient, recovering from storm damage over a few seasons.',
    ],
  },
  {
    vocabulary: 'meticulous',
    ipa: '/məˈtɪkjʊləs/',
    definitionEn: 'Showing great attention to detail; very careful and precise.',
    definitionTr: 'Titiz, ayrıntılara büyük özen gösteren.',
    partOfSpeech: 'ADJECTIVE' as const,
    mnemonic: 'A MET-ICULOUS chef weighs every single ingredient on a tiny scale before cooking.',
    collocations: 'meticulous planning, meticulous attention to detail, meticulous researcher',
    tags: ['business', 'academic'],
    examples: [
      'The architect was meticulous about every measurement on the blueprint.',
      'Her meticulous notes made it easy for the team to pick up the project.',
    ],
  },
  {
    vocabulary: 'ambiguous',
    ipa: '/æmˈbɪɡjuəs/',
    definitionEn: 'Open to more than one interpretation; not having one obvious meaning.',
    definitionTr: 'Belirsiz, birden fazla anlama gelebilen.',
    partOfSpeech: 'ADJECTIVE' as const,
    mnemonic: 'AMBI- means "both" — like AMBIdextrous uses both hands, an AMBIguous sentence has two meanings.',
    collocations: 'ambiguous statement, morally ambiguous, deliberately ambiguous',
    tags: ['academic'],
    examples: [
      'The contract\'s wording was ambiguous, so both sides interpreted it differently.',
      'His ambiguous answer left us more confused than before.',
    ],
  },
  {
    vocabulary: 'give up',
    ipa: '/ɡɪv ʌp/',
    definitionEn: 'To stop trying to do something; to quit.',
    definitionTr: 'Vazgeçmek, pes etmek.',
    partOfSpeech: 'VERB' as const,
    mnemonic: 'You GIVE your effort UP into the air and let it go — you stop holding on.',
    collocations: 'give up smoking, never give up, give up on a dream',
    tags: ['phrasal-verbs', 'daily-life'],
    examples: ['She refused to give up on her dream of becoming a pilot.', 'Don\'t give up now — you\'re almost at the finish line.'],
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
        definitionEn: sample.definitionEn,
        definitionTr: sample.definitionTr,
        partOfSpeech: sample.partOfSpeech,
        mnemonic: sample.mnemonic,
        collocations: sample.collocations,
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
        examples: {
          create: sample.examples.map((text, i) => ({
            text,
            order: i,
            source: 'USER',
            highlightSpans: serializeSpans(findWordSpans(text, sample.vocabulary)),
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
