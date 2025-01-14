import styled from 'styled-components';

import { Button } from 'components/common';
import { useParserContext } from 'contexts/parser-context';
import useParserRules from 'hooks/use-parser-rules';
import BarsIcon from 'public/icons/bars.svg';
import PlusIcon from 'public/icons/plus.svg';

const RuleActions: React.FC = () => {
  const {
    state: { isAddButtonDisplayed, isAllCollapsed, isDragEnabled },
    dispatch
  } = useParserContext();

  const { loading, rules = [] } = useParserRules();

  function handleAddRuleClick() {
    dispatch({ type: 'SET_IS_ADD_BUTTON_DISPLAYED', payload: false });
  }

  function handleCollapseRulesOnClick() {
    dispatch({ type: 'SET_IS_ALL_COLLAPSED', payload: !isAllCollapsed });
  }

  function handleDragModeOnClick() {
    if (!isDragEnabled) {
      dispatch({ type: 'SET_IS_ALL_COLLAPSED', payload: true });
    }
    dispatch({ type: 'SET_IS_DRAG_ENABLED', payload: !isDragEnabled });
  }

  return (
    <Wrapper>
      {isAddButtonDisplayed && (
        <AddRuleButton
          icon={<PlusIcon />}
          label="Add Rule"
          onClick={handleAddRuleClick}
        />
      )}
      {!loading && rules.length > 1 && isAllCollapsed && (
        <ReorderRules
          icon={<BarsIcon />}
          label={isDragEnabled ? 'Finish' : 'Reorder'}
          onClick={handleDragModeOnClick}
        />
      )}
      {!loading && rules.length > 0 && (
        <CollapseRules
          label={!isAllCollapsed ? 'Collapse' : 'Expand'}
          onClick={handleCollapseRulesOnClick}
        />
      )}
    </Wrapper>
  );
};

export default RuleActions;

const Wrapper = styled.div`
  margin-bottom: 8px;
  min-height: 23px;
`;

const AddRuleButton = styled(Button)`
  border: 0;
  background: transparent;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.altGreen}};
  padding: 4px 0px;
  font-size: 13px;
  float: left;
  margin-right: 20px;
  
  svg {
    position: relative;
    height: 12px;
    fill: ${({ theme }) => theme.colors.altGreen};
    top: 2px;
    margin-right: 5px;
  }
`;

const CollapseRules = styled(Button)`
  border: 0;
  background: transparent;
  font-weight: 600;
  font-size: 13px;
  color: #666;
  padding: 4px 0px;
  float: right;
  margin-left: 10px;
`;

const ReorderRules = styled(Button)`
  border: 0;
  background: transparent;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.altGreen}};
  padding: 4px 0px;
  font-size: 13px;
  float: left;

  svg {
    position: relative;
    height: 12px;
    fill: ${({ theme }) => theme.colors.altGreen};
    top: 2px;
    margin-right: 5px;
  }
`;
