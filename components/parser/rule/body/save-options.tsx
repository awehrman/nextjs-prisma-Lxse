import React from 'react';
import styled from 'styled-components';

import { Button } from 'components/common';
import { useRuleContext } from 'contexts/rule-context';
import { useParserContext } from 'contexts/parser-context';
import { ResetProps } from 'components/parser/types';

const SaveOptions: React.FC<ResetProps> = React.memo(({ reset }) => {
  const { dispatch: parserDispatch } = useParserContext();
  const {
    dispatch,
    state: { defaultValues, displayContext, isExpanded }
  } = useRuleContext();
  const label = displayContext === 'add' ? 'Add Rule' : 'Save Rule';

  function handleCancelClick(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    // TODO should any of these useParserRule calls actually be dispatched from the ruleContext?
    // whats the performance difference?
    parserDispatch({ type: 'SET_IS_ADD_BUTTON_DISPLAYED', payload: true });
    dispatch({ type: 'SET_DISPLAY_CONTEXT', payload: 'display' });
    reset();
  }

  return (
    <Wrapper>
      <CancelButton
        type="button"
        label="Cancel"
        onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
          handleCancelClick(e)
        }
      />
      <SaveButton type="submit" label={label} />
    </Wrapper>
  );
});

export default SaveOptions;

SaveOptions.whyDidYouRender = true;

const Wrapper = styled.div`
  align-self: flex-end;
`;

const CancelButton = styled(Button)`
  border: 0;
  background: #ccc;
  font-weight: 600;
  color: #fff;
  padding: 4px 6px;
  border-radius: 5px;
  margin-right: 10px;
`;

const SaveButton = styled(Button)`
  border: 0;
  background: ${({ theme }) => theme.colors.altGreen};
  font-weight: 600;
  color: #fff;
  padding: 4px 6px;
  border-radius: 5px;
`;
