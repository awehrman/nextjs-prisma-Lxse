import React, { useState } from 'react';
import styled from 'styled-components';

import usePEGParser from 'hooks/use-peg-parser';
import useParserRules from 'hooks/use-parser-rules';

import AddModal from './add-modal';
import Test from './test';
import Errors from './errors';
import { ClientGrammarTestProps } from './types';

const Tests: React.FC = () => {
  const { rules = [], loading } = useParserRules();
  const { tests, errors = [] } = usePEGParser(rules, loading);
  const numFailed = tests.filter(
    (test: ClientGrammarTestProps) => test.passed
  ).length;
  const header = `Tests${tests.length ? ` (${numFailed} failed)` : ''}`;

  function renderTests() {
    return tests.map((test) => (
      <Test key={`test-${test.reference}`} loading={loading} test={test} />
    ));
  }

  return (
    <Wrapper>
      <Header>{header}</Header>
      {renderTests()}
      {errors.length > 0 && <Errors />}
      <AddModal />
    </Wrapper>
  );
};

export default Tests;

const Header = styled.h2`
  margin: 0;
  padding: 0;
  font-weight: 600;
  font-size: 14px;
  margin-top: 4px;
  margin-bottom: 10px;
`;

const Wrapper = styled.div`
  margin-top: 32px;
  max-width: 250px;
`;
