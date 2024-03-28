import { gql } from '@apollo/client';

export const GrammarTestInput = gql`
  input GrammarTestInput {
    id
    reference
    expected {
      id
      value
      type
      grammarTestId
    }
  }
`;
