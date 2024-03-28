import { ParserRuleDefinition, ParserRuleWithRelations } from '@prisma/client';

import { removeTypename } from 'hooks/helpers/parser-rule';
import {
  getDefaultRuleValuesForIndex,
  RuleDispatch
} from 'contexts/rule-context';
import { ParserDispatch } from 'contexts/parser-context';
import { ParserDispatch, DisplayContextTypes } from '../types';

type SaveRuleInputProps = CreateInputProps & {
  displayContext: DisplayContextTypes;
  reset: (input: ParserRuleWithRelations) => void;
  updateRule: (input: ParserRuleWithRelations) => void;
  dispatch: RuleDispatch;
  addRule: (input: ParserRuleWithRelations) => void;
  parserDispatch: ParserDispatch;
};

type CreateInputProps = {
  data: ParserRuleWithRelations;
  order: number;
};

// TODO do i really need to pass all of these? can i just get away with calling some of these locally?
export const saveRule = ({
  data,
  order,
  displayContext,
  reset,
  updateRule,
  dispatch,
  addRule,
  parserDispatch
}: SaveRuleInputProps) => {
  const { payload, input } = createInput({ data, order });

  if (displayContext === 'edit') {
    reset({ ...input });
    updateRule(input);
    dispatch({ type: 'UPDATE_FORM_STATE', payload });
  } else if (displayContext === 'add') {
    addRule(input);
    dispatch({
      type: 'RESET_DEFAULT_VALUES',
      payload: getDefaultRuleValuesForIndex(0)
    });
  }

  // TODO on success only? where to handle validation?
  // seems like these should happen on update
  parserDispatch({ type: 'SET_IS_ADD_BUTTON_DISPLAYED', payload: true });
  dispatch({ type: 'SET_DISPLAY_CONTEXT', payload: 'display' });
};

const createInput = ({ data, order }: CreateInputProps) => {
  // TODO we'll probably pass this explicitly in, but for now just throw it at the bottom
  if (data.order === 'undefined' || data.order === null) {
    data.order = order;
  }

  if (data?.listItemEntryValue) {
    // biome-ignore lint/performance/noDelete: TODO check if prisma is chill with an undefined here
    delete data.listItemEntryValue;
  }

  const input = removeTypename(data);
  return {
    input,
    payload: data
  };
};

// TODO this is probably a shitty data format so come back and think this through
export const getAllParserRuleDefinitionNames = (definitions = []) => [
  ...new Set(
    definitions
      .map((def: ParserRuleDefinition) => `${def.rule}`)
      .filter((def: string) => !!def.length)
  )
];
