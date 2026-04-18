import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks route as not requiring JWT (e.g. login, refresh). Used when a global JWT guard is enabled. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
