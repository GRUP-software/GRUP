import styled from 'styled-components';
import Input from '../../components/form/Input';
import TextArea from '../../components/form/TextArea';

const Wrapper = styled.div`
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 40px 20px;
`;

const FormCard = styled.div`
    background: #fff;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05);
    max-width: 600px;
    width: 100%;
`;

const Title = styled.h2`
    font-size: 24px;
    margin-bottom: 24px;
    text-align: center;
    color: var(--app-color3);
`;

const StyledForm = styled.form`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const SubmitButton = styled.button`
    background-color: var(--app-color);
    color: white;
    padding: 12px;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    cursor: pointer;
`;

const EditProfile = () => {
    const handleSubmit = (e) => {
        e.preventDefault();
        // handle update logic
        console.log('Submitted');
    };

    return (
        <Wrapper>
            <FormCard>
                <Title>Edit Profile</Title>
                <StyledForm onSubmit={handleSubmit}>
                    <Input
                        label="First Name"
                        name="firstName"
                        type="text"
                        placeholder="Type your first name"
                        required={true}
                    />
                    <Input
                        label="Last Name"
                        name="lastName"
                        type="text"
                        placeholder="Type your last name"
                        required={true}
                    />
                    <TextArea
                        label="Address"
                        name="address"
                        placeholder="Type your address"
                        required={true}
                    />
                    <SubmitButton type="submit">Update Profile</SubmitButton>
                </StyledForm>
            </FormCard>
        </Wrapper>
    );
};

export default EditProfile;
