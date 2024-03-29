import { ParserRuleWithRelations } from '@prisma/client';
import React, { useCallback, useEffect } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import styled from 'styled-components';
import useResizeObserver from 'use-resize-observer';

import { useRuleContext } from 'contexts/rule-context';
import { useParserContext } from 'contexts/parser-context';
import useParserRule from 'hooks/use-parser-rule';
import useParserRules from 'hooks/use-parser-rules';

import { RecomputeRuleSizeProps } from '../types';
import { hasRuleWarning } from '../utils';

import {
  DEFAULT_ROW_SIZE,
  MIN_ROW_SIZE,
  RULE_BOTTOM_MARGIN,
  RULE_BORDER_SIZE
} from './constants';
import RuleHeader from './header';
import RuleBody from './body';
import { getAllParserRuleDefinitionNames, saveRule } from './utils';

const RuleContents: React.FC<RecomputeRuleSizeProps> = ({
  recomputeRuleSize
}) => {
  const {
    dispatch,
    state: { defaultValues, displayContext, id = '-1', index, isExpanded }
  } = useRuleContext();
  const { dispatch: parserDispatch } = useParserContext();
  const {
    addRule,
    updateRule,
    rule: { definitions = [] }
  } = useParserRule(id);
  const { rules = [] } = useParserRules();
  const rulesLength = rules.length;
  const methods = useForm<ParserRuleWithRelations>({
    defaultValues,
    mode: 'onBlur'
  });
  // TODO i feel like i can grab these from form context or something
  // so that i don't have to pass them down? i just need to double check
  // but i think this can be cleaned up
  const { handleSubmit, reset, setFocus } = methods;

  const { ref, height: heightWithoutMargins = DEFAULT_ROW_SIZE } =
    useResizeObserver<HTMLFormElement>();
  const resizeRow = useCallback(() => {
    let height = heightWithoutMargins;
    height += RULE_BORDER_SIZE * 2;
    height +=
      displayContext === 'edit' ? RULE_BOTTOM_MARGIN * 4 : RULE_BOTTOM_MARGIN;
    const lastItem = index === rulesLength - 1;
    // TODO giving this a bit of a bump at the bottom
    // i still need to look into this weird scroll behavior towards end of list
    if (lastItem) {
      height += 250;
    }
    if (recomputeRuleSize !== undefined && height >= MIN_ROW_SIZE) {
      recomputeRuleSize(index, height);
    }
  }, [
    index,
    heightWithoutMargins,
    displayContext,
    recomputeRuleSize,
    rulesLength
  ]);

  useEffect(() => {
    resizeRow();
  }, [resizeRow]);

  function handleReset() {
    reset();
    resizeRow();
  }

  const props = {
    order: rules.length,
    displayContext,
    reset,
    updateRule,
    dispatch,
    addRule,
    parserDispatch
  };

  function handleCollapseToggle() {
    dispatch({ type: 'SET_IS_EXPANDED', payload: !isExpanded });
  }

  // TODO i feel like this should live in its own warnings hook
  const definedRuleNames = rules.map(
    (rule: ParserRuleWithRelations) => rule.name
  );
  const ruleDefinitionNames = getAllParserRuleDefinitionNames(definitions);

  useEffect(() => {
    let triggedWarning = false;
    for (const rule of ruleDefinitionNames) {
      const containsWarnings = hasRuleWarning(`${rule}`, definedRuleNames);
      if (containsWarnings) {
        triggedWarning = true;
        break;
      }
    }
    dispatch({ type: 'SET_HAS_WARNING', payload: triggedWarning });
  }, [ruleDefinitionNames, definedRuleNames, dispatch]);

  return (
    // TODO this should probably be a checkbox?
    <Wrapper
      // TODO i think we just need an individual expanded
      displayCursor={displayContext === 'display' /*&& isCollapsed*/}
      onClick={handleCollapseToggle}
    >
      <InnerWrapper
        ref={ref}
        className={displayContext}
        onSubmit={handleSubmit((data) =>
          saveRule({ data, ...props, reset: handleReset })
        )}
      >
        <FormProvider {...methods}>
          <RuleHeader setFocus={setFocus} />
          <RuleBody reset={handleReset} />
        </FormProvider>
      </InnerWrapper>
    </Wrapper>
  );
};

export default RuleContents;

type WrapperProps = {
  displayCursor: boolean;
};

const Wrapper = styled.div<WrapperProps>`
  height: 100%;
  width: 100%;

  ${({ displayCursor }) => (displayCursor ? 'cursor: pointer;' : '')};
`;

const InnerWrapper = styled.form`
  max-width: 600px;

  &.edit {
    background: ${({ theme }) => theme.colors.lightBlue};
    padding-top: ${RULE_BOTTOM_MARGIN}px;
    padding: 14px 20px;
  }

  &.add {
    padding: 14px 20px;
    background: ${({ theme }) => theme.colors.lightGreen};
  }
`;
