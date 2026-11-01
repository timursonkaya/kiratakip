import type { Prisma } from '@prisma/client';

/** Include owners (with their owner record) when fetching a unit. */
export const unitWithOwners = {
  owners: {
    include: { owner: true },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  },
} satisfies Prisma.UnitInclude;

/** Include units (with their unit + property) when fetching an owner. */
export const ownerWithUnits = {
  units: {
    include: {
      unit: { include: { property: true } },
    },
    orderBy: [{ isPrimary: 'desc' }, { id: 'asc' }],
  },
} satisfies Prisma.OwnerInclude;