import { enumType, extendType, inputObjectType, objectType } from 'nexus';

import { addGrammarTest } from './helpers/grammar-test';

export const GrammarTestDefinitionInput = inputObjectType({
  name: 'GrammarTestDefinitionInput',
  definition(t) {
    t.nullable.string('id');
    t.field('type', {
      type: 'GrammarTypeEnum'
    });
    t.nonNull.string('value');
    t.nullable.string('grammarTestId');
  }
});

export const GrammarTestInput = inputObjectType({
  name: 'GrammarTestInput',
  definition(t) {
    t.nullable.string('id');
    t.nonNull.string('reference');
    t.list.field('expected', {
      type: GrammarTestDefinitionInput
    });
  }
});

export const GrammarTypeEnum = enumType({
  name: 'GrammarTypeEnum',
  members: ['INGREDIENT', 'AMOUNT', 'UNIT', 'DESCRIPTORS', 'COMMENTS', 'OTHER']
});

export const ExpectedGrammarTest = objectType({
  name: 'ExpectedGrammarTest',
  definition(t) {
    t.string('id');
    t.field('type', {
      type: 'GrammarTypeEnum'
    });
    t.nonNull.string('value');
  }
});

export const GrammarTest = objectType({
  name: 'GrammarTest',
  definition(t) {
    t.string('id');
    // t.string('createdAt');
    // t.string('updatedAt');
    t.nonNull.string('reference');
    t.list.field('expected', {
      type: 'ExpectedGrammarTest'
    });
  }
});

// Queries
export const GrammarTestQuery = extendType({
  type: 'Query',
  definition(t) {
    t.list.field('tests', {
      type: 'GrammarTest',
      resolve: async (_root, _args, ctx) => {
        const tests = await ctx.prisma.grammarTest.findMany({
          // take: 20,
          select: {
            id: true,
            reference: true,
            expected: {
              select: {
                id: true,
                type: true,
                value: true
              }
            }
          }
        });
        return tests;
      }
    });
  }
});

// Mutations
export const AddGrammarTestMutation = extendType({
  type: 'Mutation',
  definition(t) {
    t.field('addGrammarTest', {
      type: 'GrammarTest',
      args: { input: GrammarTestInput },
      resolve: addGrammarTest
    });
  }
});
