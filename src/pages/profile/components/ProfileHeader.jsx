import styled from 'styled-components';
import {
    FiEdit3,
    // FiMapPin
} from 'react-icons/fi';
import { Link } from 'react-router-dom';
// import { FaRegMoneyBillAlt } from "react-icons/fa";

const Header = styled.div`
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    margin-bottom: 30px;
`;

const ProfileTop = styled.div`
    display: flex;
    align-items: flex-start;
    gap: 25px;
    margin-bottom: 20px;

    @media (max-width: 768px) {
        flex-direction: column;
    }
`;

const Avatar = styled.div`
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: var(--app-color);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--font-large_1);
    color: white;
    font-weight: 700;
    flex-shrink: 0;
`;

const ProfileInfo = styled.div``;

const Name = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    color: var(--app-color3);
    margin-bottom: 8px;
`;

// const Username = styled.p`
//     font-size: var(--font-small_3);
//     color: #718096;
//     margin-bottom: 10px;
// `;

// const Location = styled.div`
//     display: flex;
//     align-items: center;
//     gap: 8px;
//     color: #4a5568;
//     margin-bottom: 15px;
// `;

const Bio = styled.p`
    color: #4a5568;
    line-height: 1.6;
    margin-bottom: 20px;
`;

const ActionButtons = styled.div`
    display: flex;
    gap: 10px;
`;

const Button = styled(Link)`
    background: ${(props) =>
        props.$primary
            ? 'linear-gradient(to right, #4299e1, #3182ce)'
            : 'white'};
    color: ${(props) => (props.$primary ? 'white' : '#4a5568')};
    border: 2px solid ${(props) => (props.$primary ? 'transparent' : '#e2e8f0')};
    border-radius: 8px;
    padding: 10px 20px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 8px;
    text-decoration: none;
    font-size: var(--font-small_3);

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
`;

const StatsRow = styled.div`
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    padding-top: 20px;
    border-top: 1px solid #e2e8f0;
`;

const StatItem = styled.div`
    text-align: center;
`;

const StatNumber = styled.div`
    font-size: 1.8rem;
    font-weight: 700;
    color: #2d3748;
`;

const StatLabel = styled.div`
    font-size: var(--font-small_3);
    color: #718096;
    margin-top: 5px;
`;

const ProfileHeader = ({
    name,
    // username, location,
    bio,
    stats,
}) => {
    const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('');

    return (
        <Header>
            <ProfileTop>
                <Avatar>{initials}</Avatar>
                <ProfileInfo>
                    <Name>{name}</Name>
                    {/* <Username>@{username}</Username>
                    <Location>
                        <FiMapPin size={16} />
                        {location}
                    </Location> */}
                    <Bio>{bio}</Bio>
                    <ActionButtons>
                        <Button $primary to={'/edit-profile'}>
                            <FiEdit3 size={16} />
                            Edit Profile
                        </Button>
                        {/* <Button>
                            <FaRegMoneyBillAlt size={16} />
                            Wallet
                        </Button> */}
                    </ActionButtons>
                </ProfileInfo>
            </ProfileTop>

            <StatsRow>
                <StatItem>
                    <StatNumber>{stats.groupBuys}</StatNumber>
                    <StatLabel>Group Buys</StatLabel>
                </StatItem>
            </StatsRow>
        </Header>
    );
};

export default ProfileHeader;
