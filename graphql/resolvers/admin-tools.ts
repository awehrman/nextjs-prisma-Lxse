import { EvernoteSession, GenericResponse } from '@prisma/client';
import { AppContext } from '../context';

import { importSeed } from 'prisma/seeds/parser-rules';
import { getDefaultEvernoteSessionResponse } from './helpers/evernote-session';

type ResetDatabaseArgs = {
  userId: string;
};

export const resetDatabase = async (
  _root: unknown,
  args: ResetDatabaseArgs,
  ctx: AppContext
): Promise<EvernoteSession> => {
  const { prisma } = ctx;
  const { userId } = args;
  const response: EvernoteSession = getDefaultEvernoteSessionResponse(userId);

  try {
    await prisma.instructionLine.deleteMany({});
    await prisma.parsedSegment.deleteMany({});
    await prisma.ingredientLine.deleteMany({});
    await prisma.alternateName.deleteMany({});
    await prisma.ingredient.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.recipe.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.tag.deleteMany({});
  } catch (err) {
    response.error = `${err}`;
  }
  return response;
};

export const resetParserRules = async (
  _root: unknown,
  _args: unknown,
  ctx: AppContext
): Promise<GenericResponse> => {
  console.log('resetParserRules');
  const { prisma } = ctx;
  const response: GenericResponse = {};

  try {
    await prisma.parserRuleDefinition.deleteMany({});
    await prisma.parserRule.deleteMany({});
  } catch (err) {
    console.log({ err });
    response.error = `${err}`;
  }
  return response;
};

export const seedBasicParserRules = async (
  _root: unknown,
  _args: unknown,
  ctx: AppContext
): Promise<GenericResponse> => {
  const response: GenericResponse = {};

  try {
    await importSeed(ctx);
  } catch (err) {
    response.error = `${err}`;
  }
  return response;
};
