import _ from 'lodash';
import React from 'react';

import { EmptyComponentProps } from 'components/parser/types';
import { useRuleContext } from 'contexts/rule-context';
import useParserRule from 'hooks/use-parser-rule';
import useParserRules from 'hooks/use-parser-rules';

import AutoWidthInput from '../auto-width-input';
import { isDuplicateRule, isNotEmpty } from '../validators';

const RuleName: React.FC<EmptyComponentProps> = () => {
  const {
    state: { id }
  } = useRuleContext();
  const { rules = [] } = useParserRules();
  const { rule } = useParserRule(id);
  const { name = '' } = rule || {};

  // TODO move this into a hook along with the definition array version
  // see if we can add all of the annoying measurements there too
  const containerRef = React.useRef<HTMLLabelElement | null>(null);
  const sizeRef = React.useRef<HTMLSpanElement | null>(null);

  const containerRefCallback = (node: HTMLLabelElement | null) => {
    // Set the containerRef.current to the node
    if (containerRef.current !== node) {
      containerRef.current = node;
    }
  };

  const sizeRefCallback = (node: HTMLSpanElement | null) => {
    // Set the sizeRef.current to the node
    if (sizeRef.current !== node) {
      sizeRef.current = node;
    }
  };

  return (
    <AutoWidthInput
      defaultValue={name}
      fieldName="name"
      isRequired
      placeholder="name"
      containerRefCallback={containerRefCallback}
      sizeRefCallback={sizeRefCallback}
      validators={{
        isDuplicateRule: (value: string) =>
          isDuplicateRule(value, rules, id, 'name'),
        isNotEmpty: (value: string) => isNotEmpty(value, 'name')
      }}
    />
  );
};

export default RuleName;

RuleName.whyDidYouRender = true;