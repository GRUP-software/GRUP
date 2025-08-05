import styled from 'styled-components';

const DIV = styled.div`
    background-color: #d32f2f;
    color: white;
    padding: 10px;
    display: flex;
    justify-content: center;
    outline: 1px solid red;
    font-size: var(--font-small);
    border-radius: 5px;
`;

const Error = ({ text }) => {
    return (
        <DIV>
            <p>{text}</p>
        </DIV>
    );
};

export default Error;
