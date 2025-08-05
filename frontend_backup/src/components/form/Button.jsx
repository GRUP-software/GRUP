import styled from 'styled-components';
import { Digital } from 'react-activity';

const StyledButton = styled.button`
    margin: ${(props) => (props.$margin ? props.$margin : 'auto')};
    display: flex;
    justify-content: center;
    align-items: center;
    width: ${(props) => props.$width || '100%'};
    height: ${(props) => props.$height || '100%'};
    border: none;
    border-radius: 10px;
    background-color: ${(props) =>
        props.$backgroundColor ? props.$backgroundColor : 'var(--app-color)'};
    color: white;
    font-size: var(--font-medium);
    font-weight: bold;
    letter-spacing: -0.5px;
    opacity: ${({ disabled }) => (disabled ? 0.5 : 1)};
    cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
    transition: 0.3s;

    /* &:hover {
        filter: brightness(80%);
    } */
`;

const Button = ({ margin, text, width, height, disabled, loading, color }) => {
    return (
        <StyledButton
            $width={width}
            $height={height}
            $margin={margin}
            disabled={disabled || loading}
            $backgroundColor={color}
        >
            {loading ? <Digital color="white" /> : text}
        </StyledButton>
    );
};

export default Button;
