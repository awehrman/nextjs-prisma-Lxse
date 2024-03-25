import React, { useCallback, useRef } from 'react';
import {
  DragDropContext,
  Droppable,
  DropResult,
  DraggingStyle
} from 'react-beautiful-dnd';
import AutoSizer from 'react-virtualized-auto-sizer';
import { VariableSizeList as List } from 'react-window';
import styled from 'styled-components';

import useParserRules from 'hooks/use-parser-rules';

import { DEFAULT_GUTTER_SIZE, DEFAULT_ROW_SIZE } from './rule/constants';
import DraggableRule from './rule/draggable-rule';
import VirtualizedRule from './rule/virtualized-rule';
import { getDraggableStyle } from './utils';

// NOTE: getting a warning about react-beautiful-dnd not supporting
// nested scroll containers
// i think react window might be putting their fingers in overflow settings
// and that might cause this error

function LoadingSkeletons() {
  const placeholderItems = Array.from({ length: 5 }).map((_, index) => {
    const width = Math.floor(Math.random() * (100 - 20 + 1)) + 20;
    return (
      // biome-ignore lint/suspicious/noArrayIndexKey:
      <LoadingRow key={`parser-rule-placeholder-${index}`}>
        <LoadingName width={width} />
        <LoadingLabel width={width * 1.2} />
      </LoadingRow>
    );
  });

  return <LoadingWrapper>{placeholderItems}</LoadingWrapper>;
}

const LoadingWrapper = styled.div`
  margin-top: 10px;
`;

const LoadingRow = styled.div`
  height: 40px;
  width: 100%;
  display: flex;
`;

type LoadingProps = {
  width?: number;
};

const LoadingName = styled.div<LoadingProps>`
  background: ${({ theme }) => theme.colors.headerBackground};
  height: 13px;
  border-radius: 5px;
  margin-right: 20px;
  width: ${({ width }) => `${width}px` || 'auto'};
`;

const LoadingLabel = styled.div<LoadingProps>`
  background: ${({ theme }) => theme.colors.headerBackground};
  height: 13px;
  width: ${({ width }) => `${width}px` || 'auto'};
  border-radius: 5px;
`;

const VirtualizedRules: React.FC = () => {
  const { loading, rules = [], updateRulesOrder } = useParserRules();
  const listRef = useRef<List | null>(null);
  const sizeMap = useRef<{ [index: number]: number }>({});

  // TODO i hate all this naming
  const resize = useCallback((index: number, size: number) => {
    const allMounted = sizeMap?.current && listRef?.current;

    if (allMounted) {
      sizeMap.current = { ...sizeMap.current, [index]: size };
      if (listRef.current !== null) {
        listRef.current.resetAfterIndex(index);
      }
    }
  }, []);

  const getSize = (index: number) =>
    sizeMap?.current?.[index] || DEFAULT_ROW_SIZE;

  // TODO i want to throw all of this drag crap into its own hook
  function handleOnDragEnd(result: DropResult) {
    if (!result.destination) return;
    const updatedList = [...rules];
    // re-order list
    const [reorderedItem] = updatedList.splice(result.source.index, 1);
    updatedList.splice(result.destination.index, 0, reorderedItem);
    // TODO this also needs to be called on rule removal
    updateRulesOrder(updatedList);
  }

  function renderMessages() {
    if (loading && !rules.length) {
      return <LoadingSkeletons />;
    }

    if (!rules.length && !loading) {
      return <Message>No parsing rules exist.</Message>;
    }
  }

  return (
    <RulesContent>
      {renderMessages()}
      <DragDropContext onDragEnd={handleOnDragEnd}>
        <Wrapper>
          <AutoSizer>
            {({ height, width }) => (
              <Droppable
                droppableId="droppable"
                mode="virtual"
                renderClone={(provided, snapshot, rubric) => (
                  <VirtualizedRule
                    displayContext="display"
                    id={rules[rubric.source.index].id}
                    index={rubric.source.index}
                    provided={provided}
                    recomputeRuleSize={resize}
                    ref={provided.innerRef}
                    rule={rules[rubric.source.index]}
                    style={getDraggableStyle({
                      provided,
                      style: provided.draggableProps.style as DraggingStyle,
                      isDragging: snapshot.isDragging
                    })}
                  />
                )}
              >
                {(provided) => (
                  <StyledList
                    ref={listRef}
                    height={height}
                    itemCount={rules.length}
                    itemData={rules}
                    itemSize={getSize}
                    outerRef={provided.innerRef}
                    width={width + DEFAULT_GUTTER_SIZE}
                  >
                    {(props) => <DraggableRule {...props} resize={resize} />}
                  </StyledList>
                )}
              </Droppable>
            )}
          </AutoSizer>
        </Wrapper>
      </DragDropContext>
    </RulesContent>
  );
};

export default VirtualizedRules;

const Wrapper = styled.div`
  display: flex;
  flex-grow: 1;
  height: 100%;
`;

const StyledList = styled(List)`
  position: absolute;
  left: -${DEFAULT_GUTTER_SIZE}px;
`;

const RulesContent = styled.div`
  height: calc(100vh - 210px);
`;

const Message = styled.div`
  position: relative;
`;

const Loading = styled.div``;
