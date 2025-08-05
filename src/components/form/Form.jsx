import styled from 'styled-components';

const DIV = styled.div`
    padding: 30px;
    box-shadow: var(--app-shadow);
    border-radius: 10px;
    max-width: 600px;
    width: 90%;
    margin: auto;
    background-color: white;

    .title {
        font-size: 30px;
        font-weight: bold;
        margin-bottom: 30px;
        text-align: center;
        color: var(--app-color3);
    }
    .title2 {
        font-size: var(--font-medium);
        margin-bottom: 50px;
        color: var(--app-dark-grey-color);
    }
`;

const Form = ({ title, children }) => {
    return (
        <DIV>
            <p className="title">{title}</p>
            {/* <p className="title2">{title2}</p> */}
            {children}
        </DIV>
    );
};

export default Form;
