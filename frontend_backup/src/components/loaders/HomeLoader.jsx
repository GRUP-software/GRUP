import styled from 'styled-components';
import { Digital } from 'react-activity';

const DIV = styled.div`
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const HomeLoader = () => {
    return (
        <DIV>
            <Digital size={40} />
        </DIV>
    );
};

export default HomeLoader;
