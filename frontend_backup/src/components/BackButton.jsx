import styled from 'styled-components';
import { FaChevronLeft } from 'react-icons/fa6';

const DIV = styled.div`
    -webkit-backdrop-filter: ${(props) =>
        props.$blur ? `saturate(200%) blur(5px)` : 'none'};
    backdrop-filter: ${(props) =>
        props.$blur ? `saturate(200%) blur(5px)` : 'none'};
    background-color: ${(props) =>
        props.$blur ? `rgba(15, 15, 15, 0.4)` : 'white'};
    border-radius: 50%;
    cursor: pointer;
    width: 35px;
    height: 35px;
    display: flex;
    justify-content: center;
    align-items: center;

    &:hover {
        filter: brightness(80%);
    }
    .chevron-left {
        font-size: var(--font-small_3);
        color: ${(props) => (props.$blur ? `white` : 'black')};
    }
`;

const BackButton = ({ blur }) => {
    return (
        <DIV $blur={blur}>
            <FaChevronLeft className="chevron-left" />
        </DIV>
    );
};

export default BackButton;
