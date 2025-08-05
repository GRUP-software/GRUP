import styled from 'styled-components';
import { FiMenu } from 'react-icons/fi';

const DIV = styled.div`
    z-index: 10;
`;

const Hamburger = styled.div`
    font-size: 24px;
    cursor: pointer;
    color: var(--app-color);
`;

const RightPanel = ({ click }) => {
    return (
        <DIV>
            <Hamburger onClick={click}>
                <FiMenu />
            </Hamburger>
        </DIV>
    );
};

export default RightPanel;
