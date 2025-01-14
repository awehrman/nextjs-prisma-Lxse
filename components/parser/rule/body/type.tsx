import React, { memo } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import styled from 'styled-components';

import { useRuleContext } from 'contexts/rule-context';
import { useRuleDefinitionContext } from 'contexts/rule-definition-context';

import { Button } from 'components/common';
import { RuleTypeComponentProps } from 'components/parser/types';

const RuleType: React.FC<RuleTypeComponentProps> = memo(({ onTypeSwitch }) => {
  const {
    state: { displayContext }
  } = useRuleContext();
  const {
    state: { index, defaultValue }
  } = useRuleDefinitionContext();
  const fieldName = `definitions.${index}.type`;
  const { control, register, setValue } = useFormContext();
  const type = useWatch({ control, name: `definitions.${index}.type` });

  if (displayContext === 'display') return null;

  function handleRuleTypeButtonClick() {
    // setValue(fieldName, type === 'RULE' ? 'LIST' : 'RULE');
    // clear out any previous entries
    onTypeSwitch();
  }

  return (
    <Wrapper isEditMode={displayContext === 'edit'}>
      <Label>
        <HiddenFormInput
          {...register(fieldName)}
          defaultValue={defaultValue.type}
          name={fieldName}
          type="hidden"
        />
        <RuleTypeButton
          label={type === 'RULE' ? 'Use List' : 'Use Rule'}
          onClick={handleRuleTypeButtonClick}
        />
      </Label>
    </Wrapper>
  );
});

export default RuleType;

RuleType.whyDidYouRender = true;

const HiddenFormInput = styled.input`
  display: none;
`;

const RuleTypeButton = styled(Button)`
  border: 0;
  color: ${({ theme }) => theme.colors.highlight};
  font-weight: 600;
  background: transparent;
  padding: 0;
  font-size: 12px;
`;

const Label = styled.label``;

type WrapperProps = {
  isEditMode: boolean;
};

const Wrapper = styled.fieldset<WrapperProps>`
  border: 0;
  padding: 0;
  margin: 0;
  position: absolute;
  top: -20px;
  right: 0;
  float: right;
  z-index: 100;

  ${({ isEditMode }) =>
    isEditMode &&
    `
    // allow room for our remove rule button
    right: 20px;
  `}
`;
