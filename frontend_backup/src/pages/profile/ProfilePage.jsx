import styled from 'styled-components';
import ProfileHeader from './components/ProfileHeader';
import GroupBuyHistory from './components/GroupBuyHistory';
import { useSelector } from 'react-redux';

const Container = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    padding: 10px;
    background: #f7fafc;
    min-height: 100vh;
    width: 100%;
`;

const ProfileGrid = styled.div`
    display: grid;
`;

const LeftColumn = styled.div`
    width: 100%;
`;

const ProfilePage = () => {
    const userData = useSelector((state) => state.auth.userData);

    const profileData = {
        name: userData.name,
        username: 'ugo',
        location: 'Plot 100A Ikaja, Lagos',
        stats: {
            groupBuys: 24,
        },
    };

    const orders = [
        {
            id: '1',
            title: 'Organic Fresh Apples - 5kg',
            date: 'March 15, 2024',
            status: 'delivered',
            price: 45,
            savings: 15,
        },
        {
            id: '2',
            title: 'Premium Olive Oil - 1L',
            date: 'March 10, 2024',
            status: 'processing',
            price: 28,
            savings: 12,
        },
    ];

    return (
        <Container>
            <ProfileHeader
                name={profileData.name}
                username={profileData.username}
                location={profileData.location}
                bio={profileData.bio}
                stats={profileData.stats}
            />

            <ProfileGrid>
                <LeftColumn>
                    <GroupBuyHistory orders={orders} />
                </LeftColumn>

                {/* <RightColumn>
                    <ActivityFeed activities={activities} />
                </RightColumn> */}
            </ProfileGrid>
        </Container>
    );
};

export default ProfilePage;
