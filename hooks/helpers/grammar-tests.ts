import { ApolloCache, FetchResult } from '@apollo/client';
import _ from 'lodash';

import { GET_ALL_GRAMMAR_TESTS_QUERY } from 'graphql/queries/grammar-tests';
import { GrammarTestWithRelations } from '@prisma/client';

export const handleAddGrammarRuleUpdate = (
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  cache: ApolloCache<any>,
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  res: Omit<FetchResult<any>, 'context'>,
  input: GrammarTestWithRelations
) => {
  const isOptimisticResponse = res.data.addGrammarTest.id === '-1';
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const tests: any | null = cache.readQuery({
    query: GET_ALL_GRAMMAR_TESTS_QUERY
  });

  console.log({ tests });

  // let grammarTests = [...(tests?.grammarTests ?? [])];
  // const optimisticExpectationIds: string[] = [];
  // if (isOptimisticResponse) {
  //   grammarTests.push({
  //     ...input,
  //     definitions: input.definitions.map((def: ExpectedGrammarTestResult) => ({
  //       ...def,
  //       __typename: 'ExpectedGrammarTestResult'
  //     })),
  //     __typename: 'ParserRule'
  //   });
  // } else {
  //   grammarTests = grammarTests.map((rule: ParserRuleWithRelations) => {
  //     if (rule.id === '-1') {
  //       return {
  //         ...rule,
  //         expected: rule.expected.map(
  //           (def: ExpectedGrammarTestResult, index: number) => {
  //             if (def.id.includes('OPTIMISTIC')) {
  //               optimisticExpectationIds.push(def.id);
  //               return {
  //                 ...def,
  //                 id: res.data.addGrammarTest.expected[index].id
  //               };
  //             }
  //             return def;
  //           }
  //         ),
  //         id: res.data.addGrammarTest.id
  //       };
  //     }
  //     return rule;
  //   });
  // }

  // const data = { grammarTests };
  // cache.writeQuery({
  //   query: GET_ALL_GRAMMAR_TESTS_QUERY,
  //   data
  // });
  // TODO
  // if (!isOptimisticResponse) {
  //   // evict any optimism trails from the cache
  //   cache.evict({
  //     id: 'GrammarTest:-1'
  //   });
  //   for (const id of optimisticExpectationIds) {
  //     cache.evict({
  //       id: `GrammarTestExpectationId:${id}`
  //     });
  // }
  // }
};
