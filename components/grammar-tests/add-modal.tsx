import React, { useContext, useState } from 'react';
import { useForm, Controller, useFieldArray, useWatch } from 'react-hook-form';
import Modal from 'react-modal';
import styled, { ThemeContext } from 'styled-components';

import { Button } from 'components/common';
import PlusIcon from 'public/icons/plus.svg';
import MagicIcon from 'public/icons/magic.svg';
import AutoWidthInput from 'components/parser/rule/auto-width-input';
import useGrammarTests from 'hooks/use-grammar-tests';
import {
  ExpectedGrammarTestPreSave,
  GrammarTestWithRelations,
  GrammarTypeEnum
} from '@prisma/client';

// this is apparently for accessibility
Modal.setAppElement('#main-app');

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    width: '500px',
    padding: '30px',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)'
  }
};

const DEFAULT_PLACEHOLDERS: Record<GrammarTypeEnum, string> = {
  INGREDIENT: 'apples',
  AMOUNT: 'one',
  UNIT: 'cup',
  DESCRIPTORS: 'fresh',
  COMMENTS: ', sliced',
  OTHER: '/'
};

// TODO move
// TODO this is really similar to getFieldUpdates,
// we should probably generalize these more generally for field array usage
const getExpectationPlaceholder = (
  index: number,
  formState: GrammarTestWithRelations
) => {
  const { expected = [] } = formState;
  const { value = '', type = 'INGREDIENT' } = expected?.[index] ?? {};
  return value.length > 0
    ? value
    : DEFAULT_PLACEHOLDERS[type as GrammarTypeEnum];
};

const getExpectationPlaceholderString = (
  index: number,
  formState: GrammarTestWithRelations
) => {
  const { expected = [] } = formState;
  const { type = 'OTHER' } = expected?.[index] ?? {};
  return DEFAULT_PLACEHOLDERS[type as GrammarTypeEnum];
};

// TODO move
const getOptimisticGrammarTestExpectation = (
  index: number,
  id = '-1',
  value = ''
): ExpectedGrammarTestPreSave => ({
  id: `OPTIMISTIC-${index}`,
  grammarTestId: id,
  type: 'OTHER' as GrammarTypeEnum,
  value
});

const AddModal: React.FC = () => {
  const { addTest } = useGrammarTests();
  const [modalIsOpen, setIsOpen] = useState(false);
  const {
    colors: { altGreen }
  } = useContext(ThemeContext);

  const {
    register,
    handleSubmit,
    control,
    formState: { isDirty },
    setValue,
    setFocus
  } = useForm({
    mode: 'onBlur'
  });
  const { fields, append } = useFieldArray({
    control,
    name: 'expected'
  });

  // TODO we'll re-use this for editing eventually and can pull this from a grammar specific context
  const defaultValue = '';
  const formUpdates = useWatch({ control });
  const dirtyValue = !isDirty ? defaultValue : formUpdates.reference;
  const placeholder = '1 cup fresh sliced, apples (cut into pieces)';
  const displaySizePlaceholder = !dirtyValue?.length ? placeholder : dirtyValue;

  const onSubmit = (data: GrammarTestWithRelations) => {
    addTest(
      {
        ...data,
        id: '-1'
      },
      () => setIsOpen(false)
    );
  };

  function handleOpenModalOnClick() {
    setIsOpen(true);
  }

  function handleCloseModalOnClick() {
    setIsOpen(false);
  }

  function handleGenerateExpectations() {
    const { reference = '' } = formUpdates;
    const expectations = reference.split(' ');

    for (const [index, expectation] of expectations.entries()) {
      const optimisticDefinition = getOptimisticGrammarTestExpectation(
        index,
        '-1',
        expectation
      );
      append(optimisticDefinition);
    }
  }

  function handleAddNewExpectationClick(
    _e: React.MouseEvent<HTMLButtonElement>,
    index: number
  ) {
    const optimisticDefinition = getOptimisticGrammarTestExpectation(
      index,
      '-1'
    );
    append(optimisticDefinition);
  }

  function renderExpectations() {
    return fields.map((item, index) => (
      <Field key={item.id}>
        {/* TODO lets move this over to our register pattern for consistency */}
        <Controller
          name={`expected[${index}].type`}
          control={control}
          defaultValue=""
          render={({ field }) => (
            <StyledSelect {...field} id={`expectation${index}`}>
              <option value="INGREDIENT">Ingredient</option>
              <option value="AMOUNT">Amount</option>
              <option value="UNIT">Unit</option>
              <option value="DESCRIPTORS">Descriptors</option>
              <option value="COMMENTS">Comments</option>
              <option value="OTHER">Other</option>
            </StyledSelect>
          )}
        />
        <ValueInput
          aria-label="Value Input"
          borderColor={altGreen}
          className="grammar-test-definition-input"
          defaultValue={''}
          displaySizePlaceholder={getExpectationPlaceholder(index, formUpdates)}
          isDisabled={false}
          isSpellCheck={true}
          // onBlur={(event: React.ChangeEvent<HTMLInputElement>) =>
          //   onBlur(event)
          // }
          // onFocus={() => onFocus()}
          registerField={{
            ...register(`expected[${index}].value`)
          }}
          placeholder={getExpectationPlaceholderString(index, formUpdates)}
          uniqueId={`expected[${index}].value`}
        />
      </Field>
    ));
  }

  return (
    <Wrapper>
      <AddTestButton
        icon={<PlusIcon />}
        label="Add Test"
        onClick={handleOpenModalOnClick}
      />
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleCloseModalOnClick}
        style={customStyles}
        contentLabel="Add a New Grammar Test"
      >
        <Header>Add a New Grammar Test</Header>
        <form onSubmit={handleSubmit(onSubmit)}>
          <ReferenceLine>
            <label htmlFor="grammar-test-reference-line">Test sentence:</label>
            <ReferenceInput
              aria-label="Reference Input"
              borderColor={altGreen}
              className="grammar-test-input"
              defaultValue={''}
              displaySizePlaceholder={displaySizePlaceholder}
              isDisabled={false}
              isSpellCheck={true}
              // onBlur={(event: React.ChangeEvent<HTMLInputElement>) =>
              //   onBlur(event)
              // }
              // onFocus={() => onFocus()}
              placeholder={placeholder}
              registerField={{ ...register('reference') }}
              uniqueId="grammar-test-reference-line"
            />
            <GenerateExpectations
              icon={<MagicIcon />}
              onClick={handleGenerateExpectations}
            />
          </ReferenceLine>
          <Fields>
            {renderExpectations()}
            <AddExpectationButton
              icon={<PlusIcon />}
              label="Add Expectation"
              onClick={(e: React.MouseEvent<HTMLButtonElement>) =>
                handleAddNewExpectationClick(e, fields.length)
              }
            />
          </Fields>
          <SaveActions>
            <CancelButton
              type="button"
              label="Cancel"
              onClick={handleCloseModalOnClick}
            />
            <SaveButton type="submit" label="Add Test" />
          </SaveActions>
        </form>
      </Modal>
    </Wrapper>
  );
};

export default AddModal;

const GenerateExpectations = styled(Button)`
  border: 0;
  padding: 0;
  margin-left: 10px;
  position: relative;
  top: 5px;
  padding: 2px;
  background: transparent;
  display: inline-block;
  cursor: pointer;

  svg {
    display: inline-block;
    width: 13px;
  }
`;

const SaveActions = styled.div`
  float: right;
`;

const StyledSelect = styled.select`
  border: 0;
  padding: 0;
  margin: 0;
  margin-left: -4px;
`;

const Fields = styled.div`
  margin: 20px;
  width: 100%;
`;

const Field = styled.div`
  margin-bottom: 20px;
`;

const AddExpectationButton = styled(Button)`
  background: transparent;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.altGreen};
  border: 0;
  padding: 0;
  font-size: 12px;
  padding: 4px 6px;
  margin-left: -25px;

  svg {
    position: relative;
    height: 12px;
    fill: ${({ theme }) => theme.colors.altGreen};
    top: 2px;
    margin-right: 5px;
  }
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

const ReferenceInput = styled(AutoWidthInput)`
  flex-basis: 100%;

  &::placeholder {
    color: silver;
    font-style: italic;
  }
`;

const ValueInput = styled(AutoWidthInput)`
  &::placeholder {
    color: silver;
    font-style: italic;
  }
`;

const ReferenceLine = styled.fieldset`
  border: 0;
  margin: 0;
  padding: 0;
  font-size: 14px;
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;

  label {
    flex-basis: 100%;
    font-weight: 600;
  }
`;

const Header = styled.h1`
  margin: 0;
  font-size: 18px;
  font-weight: 300;
  margin-bottom: 8px;
`;

const AddTestButton = styled(Button)`
  border: 0;
  background: transparent;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.highlight}};
  padding: 4px 0px;
  font-size: 13px;
  margin-top: 10px;

  svg {
    position: relative;
    height: 12px;
    fill: ${({ theme }) => theme.colors.highlight};
    top: 2px;
    margin-right: 5px;
  }
`;

const Wrapper = styled.div``;
