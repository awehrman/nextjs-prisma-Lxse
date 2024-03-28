import { gql } from '@apollo/client';

export const ADD_GRAMMAR_TEST_MUTATION = gql`
  mutation ADD_GRAMMAR_TEST_MUTATION($input: GrammarTestInput) {
    addGrammarTest(input: $input) {
      id
      expected {
        id
        type
        value
      }
    }
  }
`;
