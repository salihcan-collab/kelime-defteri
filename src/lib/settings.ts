import { prisma } from './prisma';
import type { Settings } from '@prisma/client';

/** Gets (or lazily creates) a user's Settings/progress row. */
export async function getOrCreateSettings(userId: string): Promise<Settings> {
  return prisma.settings.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}
