import { prisma } from './prisma';
import type { Settings } from '@prisma/client';

/** Gets (or lazily creates) the single-row Settings/progress record. */
export async function getOrCreateSettings(): Promise<Settings> {
  return prisma.settings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: { id: 'singleton' },
  });
}
