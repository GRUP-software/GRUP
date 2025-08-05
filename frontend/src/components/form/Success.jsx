import styled from 'styled-components';

const DIV = styled.div`
    background-color: green;
    color: white;
    padding: 10px;
    display: flex;
    justify-content: center;
    font-size: var(--font-small);
    border-radius: 5px;
`;

const Success = ({ text }) => {
    return (
        <DIV>
            <p>{text}</p>
        </DIV>
    );
};

export default Success;
