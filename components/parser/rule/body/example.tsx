import React, { memo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import styled from 'styled-components';

import { useRuleContext } from 'contexts/rule-context';
import { useRuleDefinitionContext } from 'contexts/rule-definition-context';

import RuleInput from '../rule-input';

const RuleExample: React.FC = memo(() => {
  const {
    state: { displayContext }
  } = useRuleContext();
  const {
    state: { index, definitionId, defaultValue }
  } = useRuleDefinitionContext();
  const { control } = useFormContext();
  // TODO it would be dope to put this in a helper
  // something like getWatchedValue('type', index)
  const type = useWatch({ control, name: `definitions.${index}.type` });
  const showField = type === 'RULE';
  const fieldName = `definitions.${index}.example`;

  function trimInput(event: React.ChangeEvent<HTMLInputElement>) {
    event.target.value = event.target.value.trim();
  }

  if ((displayContext === 'display' && !defaultValue.example) || !showField)
    return null;

  return (
    <Wrapper>
      <RuleInput
        definitionId={definitionId}
        defaultValue={defaultValue.example}
        fieldName="example"
        definitionPath={fieldName}
        onBlur={trimInput}
        placeholder="an example of this rule"
        index={index}
      />
    </Wrapper>
  );
});

export default RuleExample;

RuleExample.whyDidYouRender = true;

const Wrapper = styled.fieldset`
  border: 0;
  padding: 0;
  display: flex;
  color: #aaa;
  position: relative;
  width: 100%;
  display: flex;
  flex-direction: column;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 4px;
  margin-left: 16px;

  input {
    color: #aaa;
  }

  :before {
    font-family: var(--font-sourceSansPro), Verdana, sans-serif;
    font-weight: 300;
    content: '//';
    top: 3px;
    left: -14px;
    position: absolute;
  }
`;
