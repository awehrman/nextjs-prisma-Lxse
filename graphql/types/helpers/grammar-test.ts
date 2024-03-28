import {
  ExpectedGrammarTestResult,
  GrammarTestWithRelations,
  Prisma
} from '@prisma/client';
import { AppContext } from '../../context';
import { ArgsValue, SourceValue } from 'nexus/dist/core';

function createExpectedCreateMany(expected: ExpectedGrammarTestResult[]) {
  return {
    createMany: {
      data: expected
    }
  };
}

export const addGrammarTest = async (
  _source: SourceValue<'Mutation'>,
  args: ArgsValue<'Mutation', 'addGrammarTest'>,
  ctx: AppContext
): Promise<GrammarTestWithRelations> => {
  const { prisma } = ctx;
  const { input } = args;
  console.log('addGrammarTest', { input });
  const { reference, expected = [] } = input as GrammarTestWithRelations;

  const data: Prisma.GrammarTestCreateInput = {
    reference,
    expected: createExpectedCreateMany(expected)
  };

  const response: GrammarTestWithRelations = {};
  try {
    const result = await prisma.grammarTest.create({
      data,
      select: {
        id: true,
        expected: {
          select: {
            id: true,
            type: true,
            value: true,
            grammarTestId: true
          }
        }
      }
    });
    response.id = result.id;
    response.expected = result.expected;
  } catch (e) {
    console.error(e);
    throw new Error('An error occurred in addGrammarTest.');
  }
  return response;
};
