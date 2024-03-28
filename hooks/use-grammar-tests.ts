import { useMutation } from '@apollo/client';

import { handleAddGrammarRuleUpdate } from './helpers/grammar-tests';
import { ADD_GRAMMAR_TEST_MUTATION } from '../graphql/mutations/grammar-tests';
import {
  ExpectedGrammarTestResult,
  GrammarTestWithRelations
} from '@prisma/client';

function useGrammarTests() {
  const [addGrammarTest] = useMutation(ADD_GRAMMAR_TEST_MUTATION);

  function addTest(formData: GrammarTestWithRelations, cb: () => void): void {
    // add type names
    const data = {
      ...formData,
      __typename: 'GrammarTest',
      expected: formData.expected.map(
        (expected: ExpectedGrammarTestResult) => ({
          ...expected,
          __typename: 'ExpectedGrammarTestResult'
        })
      )
    };

    // remove optimistic id
    const input = {
      reference: formData.reference,
      expected: formData.expected.map(
        ({ type, value }: ExpectedGrammarTestResult) => ({
          type,
          value
        })
      )
    };

    addGrammarTest({
      optimisticResponse: {
        addGrammarTest: { ...data }
      },
      variables: { input },
      update: (cache, res) =>
        handleAddGrammarRuleUpdate(cache, res, formData, cb)
    });
  }

  return {
    addTest
  };
}
export default useGrammarTests;
