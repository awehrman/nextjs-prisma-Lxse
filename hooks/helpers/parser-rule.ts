import { ApolloCache, ApolloQueryResult, FetchResult } from '@apollo/client';
import Prisma, {
  ExpectedGrammarTestResult,
  GrammarTestWithRelations
} from '@prisma/client';
import _ from 'lodash';
import peggy, { Parser } from 'peggy';

import {
  GET_PARSER_RULE_QUERY,
  GET_ALL_PARSER_RULES_QUERY
} from '../../graphql/queries/parser';
import {
  ParserRules,
  Rule,
  ParserRuleWithRelationsWithTypeName,
  ParserRuleDefinitionWithRelationsWithTypeName,
  DetailsProps
} from 'components/parser/types';
import { defaultTests } from 'constants/parser-tests';
import { ParserRuleDefinition } from '@prisma/client';
import { ParserRuleWithRelations } from '@prisma/client';
import { ClientGrammarTestProps } from 'components/grammar-tests/types';

export const removeTypename = (data: ParserRuleWithRelationsWithTypeName) => {
  const input = {
    ..._.omit(data, '__typename'),
    definitions: data.definitions.map(
      (definition: ParserRuleDefinitionWithRelationsWithTypeName) => ({
        ..._.omit(definition, '__typename')
      })
    )
  };

  return input;
};

export const handleAddRuleUpdate = (
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  cache: ApolloCache<any>,
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  res: Omit<FetchResult<any>, 'context'>,
  input: ParserRuleWithRelationsWithTypeName
) => {
  const isOptimisticResponse = res.data.addParserRule.id === '-1';
  // TODO read/write fragment vs read/write all rules query vs read/write just this rule?
  const rules: ParserRules | null = cache.readQuery({
    query: GET_ALL_PARSER_RULES_QUERY
  });

  let parserRules = [...(rules?.parserRules ?? [])];
  const optimisticDefinitionIds: string[] = [];
  if (isOptimisticResponse) {
    parserRules.push({
      ...input,
      definitions: input.definitions.map((def: ParserRuleDefinition) => ({
        ...def,
        __typename: 'ParserRuleDefinition'
      })),
      __typename: 'ParserRule'
    });
  } else {
    parserRules = parserRules.map((rule: ParserRuleWithRelations) => {
      if (rule.id === '-1') {
        return {
          ...rule,
          definitions: rule.definitions.map(
            (def: ParserRuleDefinition, index: number) => {
              if (def.id.includes('OPTIMISTIC')) {
                optimisticDefinitionIds.push(def.id);
                return {
                  ...def,
                  id: res.data.addParserRule.definitions[index].id
                };
              }
              return def;
            }
          ),
          id: res.data.addParserRule.id
        };
      }
      return rule;
    });
  }

  const data = { parserRules };
  cache.writeQuery({
    query: GET_ALL_PARSER_RULES_QUERY,
    data
  });

  if (!isOptimisticResponse) {
    // evict any optimism trails from the cache
    cache.evict({
      id: 'ParserRule:-1'
    });
    for (const id of optimisticDefinitionIds) {
      cache.evict({
        id: `ParserRuleDefinitionId:${id}`
      });
    }
  }
};

export const handleDeleteRuleUpdate = (
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  cache: ApolloCache<any>,
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  res: Omit<FetchResult<any>, 'context'>,
  id: string,
  refetch: (
    variables?: Partial<{ id: string }> | undefined
    // biome-ignore lint/suspicious/noExplicitAny: apollo
  ) => Promise<ApolloQueryResult<any>>
) => {
  /*
    Cache data may be lost when replacing the parserRules field of a Query object.

    To address this problem (which is not a bug in Apollo Client), define a custom merge function for the Query.parserRules field, so InMemoryCache can safely merge these objects:

      existing: [{"__ref":"ParserRule:clobsegb1004k3nfpl5ld0qb0"}]
      incoming: []

    For more information about these options, please refer to the documentation:

      * Ensuring entity objects have IDs: https://go.apollo.dev/c/generating-unique-identifiers
      * Defining custom merge functions: https://go.apollo.dev/c/merging-non-normalized-objects
  */

  const rules: ParserRules | null = cache.readQuery({
    query: GET_ALL_PARSER_RULES_QUERY
  });

  const parserRules = (rules?.parserRules ?? []).filter(
    (rule) => rule.id !== id
  );

  cache.writeQuery({
    query: GET_ALL_PARSER_RULES_QUERY,
    data: { parserRules }
  });

  cache.writeQuery({
    query: GET_PARSER_RULE_QUERY,
    variables: { id },
    data: { parserRule: null }
  });

  // refetch();
};

export const handleUpdateRuleUpdate = (
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  cache: ApolloCache<any>,
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  res: Omit<FetchResult<any>, 'context'>,
  id: string
) => {
  const {
    data: { updateParserRule }
  } = res;
  let parserRule = {};

  const rules: ParserRules | null = cache.readQuery({
    query: GET_ALL_PARSER_RULES_QUERY
  });

  const parserRules = (rules?.parserRules ?? []).map((rule, index) => {
    if (rule.id === id) {
      parserRule = {
        ...rule,
        ...updateParserRule,
        order: updateParserRule?.order ?? index,
        definitions: (updateParserRule.definitions ?? []).map(
          (def: Prisma.ParserRuleDefinition, defIndex: number) => ({
            ...def,
            example: def?.example ?? '',
            formatter: def?.formatter ?? '',
            type: def?.type ?? 'RULE',
            list: def?.list ?? [],
            order: def?.order ?? defIndex
          })
        )
      };
      return parserRule;
    }
    return rule;
  });

  cache.writeQuery({
    query: GET_ALL_PARSER_RULES_QUERY,
    data: { parserRules }
  });

  cache.writeQuery({
    query: GET_PARSER_RULE_QUERY,
    variables: { id },
    data: { parserRule }
  });
};

const getFormattedString = (formatter: string, index = 0) =>
  formatter
    .replace(/\${ORDER}/g, `${index}`)
    .replace(/(\n)(\s*)/g, (_, newline, spaces) => `${newline}\t${spaces}`);

const styleRuleName = (name = '', label = '') => `\n${name} "${label}" = \n`;
// biome-ignore lint/style/noUnusedTemplateLiteral: quotes
const styleList = (list: string[]) => `\t${list.join(` /\ `)}\n`;
const styleDefinitions = (definitions: ParserRuleDefinition[] = []) =>
  definitions
    .map((def, index) => {
      const prefix = `${index > 0 ? '/' : ''}`;
      if (def.type === 'LIST') {
        const { list = [] } = def;
        return `${prefix}${styleList(list)}`;
      }
      return `${prefix}${styleRuleChunk(
        def.example,
        def.rule,
        `${def.formatter}`,
        index
      )}`;
    })
    // biome-ignore lint/style/noUnusedTemplateLiteral: quotes
    .join(``);

const styleRuleChunk = (example = '', rule = '', formatter = '', index = 0) => {
  const exampleString = `${example.length > 0 ? styleExample(example) : ''}`;
  const ruleString = `${rule.length > 0 ? styleRule(rule) : ''}`;
  const formatterString = `${
    formatter.length > 0 ? styleFormatter(formatter, index) : ''
  }`;
  return `${exampleString}${ruleString}${formatterString}`;
};
const styleExample = (example = '') => `\t// '${example}'\n`;
const styleRule = (rule = '') => `\t${rule}\n`;
const styleFormatter = (formatter = '', index = 0) =>
  `\t${getFormattedString(formatter, index)}\n`;

export const getStyledParserRule = (rule: Rule) => {
  const parserRuleString = `${styleRuleName(
    rule.name,
    rule.label
  )}${styleDefinitions(rule.definitions)}`;
  return parserRuleString;
};

export const fetchLocalTests = (): GrammarTestWithRelations[] => {
  const tests: GrammarTestWithRelations[] = [...defaultTests];
  return tests;
};

export const compileGrammar = (rules: Rule[]): string => {
  const starter = 'start = ingredientLine \n';
  const grammar =
    starter + rules.map((rule: Rule) => getStyledParserRule(rule)).join('\n');
  return grammar;
};

export const compileParser = (grammar: string) => {
  let parser: Parser;
  let parserSource: string;
  const errors: Error[] = [];

  try {
    parserSource = peggy.generate(grammar, {
      cache: true,
      output: 'source',
      error: (_stage, message, location) => {
        if (location?.start && !errors.find((err) => err.message === message)) {
          errors.push(new Error(message));
        }
      }
    });
  } catch (e: unknown) {
    throw new Error(`Could not generate parser.\n${e}`);
  }

  try {
    parser = eval(parserSource);
  } catch (e: unknown) {
    throw new Error(`Could not evaluate parser./n${e}`);
  }

  return {
    parser,
    errors
  };
};

export const runTests = (
  tests: GrammarTestWithRelations[],
  parser: Parser
): ClientGrammarTestProps[] => {
  for (const test of tests) {
    try {
      const details = parser.parse(test.reference);
      test.parsed = true;
      test.details = details;
      test.passed = test.expected.every((exp: ExpectedGrammarTestResult) => {
        const matchingDetail = details.values.find(
          (detail: DetailsProps) =>
            detail.type === exp.type &&
            detail?.values &&
            detail.values[0] === exp.value
        );
        return matchingDetail !== undefined;
      });
    } catch (e: unknown) {
      test.parsed = false;
      test.error = {
        message: `${e}`
      };
    }
  }
  return tests;
};

export const handleUpdateRulesOrder = (
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  cache: ApolloCache<any>,
  // biome-ignore lint/suspicious/noExplicitAny: apollo
  res: Omit<FetchResult<any>, 'context'>
) => {
  const rules: ParserRules | null = cache.readQuery({
    query: GET_ALL_PARSER_RULES_QUERY
  });

  const data = {
    parserRules: (rules?.parserRules ?? [])
      .map((rule, index) => ({
        ...rule,
        order:
          res.data.updateParserRulesOrder.find(
            (r: ParserRuleWithRelations) => r.id === rule.id
          )?.order ?? index
      }))
      .sort((a, b) => a.order - b.order)
  };
  cache.writeQuery({
    query: GET_ALL_PARSER_RULES_QUERY,
    data
  });
};
