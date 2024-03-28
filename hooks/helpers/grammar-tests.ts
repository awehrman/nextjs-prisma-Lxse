import { ApolloCache, FetchResult } from '@apollo/client';
import _ from 'lodash';

import { GET_ALL_GRAMMAR_TESTS_QUERY } from 'graphql/queries/grammar-tests';
import {
  ExpectedGrammarTestResult,
  GrammarTestWithRelations
} from '@prisma/client';

export const handleAddGrammarRuleUpdate = (
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  cache: ApolloCache<any>,
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  res: Omit<FetchResult<any>, 'context'>,
  input: GrammarTestWithRelations
) => {
  const isOptimisticResponse =
    !res.data.addGrammarTest?.id || res.data.addGrammarTest.id === '-1';
  const grammarTests: GrammarTestWithRelations | null = cache.readQuery({
    query: GET_ALL_GRAMMAR_TESTS_QUERY
  });
  let tests = [...(grammarTests?.tests ?? [])];
  const optimisticExpectationIds: string[] = [];
  if (isOptimisticResponse) {
    tests.push({
      id: '-1',
      ...input,
      expected: input.expected.map((expected: ExpectedGrammarTestResult) => ({
        ...expected,
        __typename: 'ExpectedGrammarTestResult'
      })),
      __typename: 'GrammarTest'
    });
  } else {
    tests = tests.map((test: GrammarTestWithRelations) => {
      if (test.id === '-1') {
        return {
          ...test,
          expected: test.expected.map(
            (def: ExpectedGrammarTestResult, index: number) => {
              if (def.id.includes('OPTIMISTIC')) {
                optimisticExpectationIds.push(def.id);
                return {
                  ...def,
                  id: res.data.addGrammarTest.expected[index].id
                };
              }
              return def;
            }
          ),
          id: res.data.addGrammarTest.id
        };
      }
      return test;
    });
  }

  const data = { tests };

  cache.writeQuery({
    query: GET_ALL_GRAMMAR_TESTS_QUERY,
    data
  });
};
