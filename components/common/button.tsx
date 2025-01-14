import React, { forwardRef, MutableRefObject } from 'react';
import styled from 'styled-components';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: MutableRefObject<HTMLButtonElement> | null;
  icon?: React.ReactNode;
  label?: string;
  height?: string;
}

type Ref = HTMLButtonElement | null;

const Button = forwardRef<Ref, ButtonProps>(
  ({ icon, label, type = 'button', ...props }, ref) => (
    <StyledButton ref={ref} type={type} {...props}>
      {icon}
      {label}
    </StyledButton>
  )
);

type StyledButtonProps = {
  height?: string;
};

const StyledButton = styled.button<StyledButtonProps>`
  cursor: pointer;
  text-decoration: none;
  height: ${({ height }) => height || 'auto'};
`;

Button.defaultProps = {
  type: 'button'
};

Button.displayName = 'Button';

export default Button;
