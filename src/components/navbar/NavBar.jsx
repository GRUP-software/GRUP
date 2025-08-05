import logo from '../../assets/logo.webp';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import RightPanel from './RightPanel';
import { useState } from 'react';
import Drawer from './Drawer';

const NavWrapper = styled.header`
    width: 100%;
    background-color: var(--app-color4);
    padding: 5px 0;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    position: sticky;
    top: 0;
    z-index: 1000;
`;

const NavBarInner = styled.div`
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
`;

const Section = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: ${(props) =>
        props.$center ? 'center' : props.$right ? 'flex-end' : 'flex-start'};
`;

const Logo = styled.img`
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 12px;
    transition: transform 0.2s ease;

    &:hover {
        transform: scale(1.05);
    }
`;

const HomeLink = styled(Link)`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 5px;
    border-radius: 10px;
    /* background-color: white; */
`;

const NavBar = () => {
    const [openModal, setOpenModal] = useState(false);

    const click = () => setOpenModal((prev) => !prev);

    return (
        <NavWrapper>
            <NavBarInner>
                <Section />
                <Section $center>
                    <HomeLink to="/">
                        <Logo src={logo} alt="Logo" />
                    </HomeLink>
                </Section>
                <Section $right>
                    <RightPanel click={click} />
                </Section>
            </NavBarInner>
            {openModal && <Drawer click={click} />}
        </NavWrapper>
    );
};

export default NavBar;
