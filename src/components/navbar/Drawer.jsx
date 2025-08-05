import styled from 'styled-components';
import { useEffect, useState } from 'react';
import {
    AiFillHome,
    AiOutlineMail,
    AiOutlineInfoCircle,
    AiOutlineUserAdd,
    AiOutlineLogin,
    AiOutlineUser,
    AiOutlineLogout,
} from 'react-icons/ai';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import useLogout from '../../hooks/useLogout';

const Backdrop = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 100vw;
    background-color: rgba(0, 0, 0, 0.4);
    opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
    transition: opacity 0.3s ease-in-out;
    z-index: 998;
`;

const DrawerWrapper = styled.div`
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 30vh;
    max-width: 300px;
    background-color: white;
    color: white;
    display: flex;
    flex-direction: column;
    padding: 2rem 1.5rem;
    transform: ${({ $isVisible }) =>
        $isVisible ? 'translateX(0)' : 'translateX(100%)'};
    transition: transform 0.3s ease-in-out;
    z-index: 999;
    box-shadow: -2px 0 10px rgba(0, 0, 0, 0.2);
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const NavLink = styled(Link)`
    display: flex;
    align-items: center;
    font-size: var(--font-small_3);
    margin-bottom: 1.2rem;
    color: var(--app-color2);
    text-decoration: none;
    cursor: pointer;
    border-radius: 6px;
    padding: 0.6rem 0.8rem;
    gap: 10px;
    transition:
        background-color 0.25s ease,
        color 0.25s ease;

    &:hover {
        background-color: #21867a;
        color: #e0f7f4;
    }

    svg {
        font-size: 1.4rem;
    }
`;
const LogoutLink = styled(NavLink)`
    color: red;

    &:hover {
        background-color: #ffdddd;
        color: darkred;
    }
`;
const CloseButton = styled.button`
    align-self: flex-end;
    background: none;
    border: none;
    color: var(--app-color);
    font-size: 1.8rem;
    cursor: pointer;
    margin-bottom: 2rem;
    padding: 0;
`;

const Drawer = ({ click }) => {
    const [isVisible, setIsVisible] = useState(false);
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
    const logout_hook = useLogout();

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 10);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(() => {
            click(); // Unmount after animation
        }, 300);
    };

    const logOut = () => {
        logout_hook();
        handleClose();
    };

    return (
        <>
            <Backdrop $isVisible={isVisible} onClick={handleClose} />
            <DrawerWrapper $isVisible={isVisible}>
                <CloseButton onClick={handleClose} aria-label="Close drawer">
                    &times;
                </CloseButton>

                <NavLink to="/" onClick={handleClose}>
                    <AiFillHome /> Home
                </NavLink>
                {isAuthenticated === false && (
                    <>
                        <NavLink to="/register" onClick={handleClose}>
                            <AiOutlineUserAdd /> Sign Up
                        </NavLink>
                        <NavLink to="/signin" onClick={handleClose}>
                            <AiOutlineLogin /> Login
                        </NavLink>
                    </>
                )}
                {isAuthenticated && (
                    <NavLink to="/account" onClick={handleClose}>
                        <AiOutlineUser /> My Account
                    </NavLink>
                )}

                <NavLink to="/about" onClick={handleClose}>
                    <AiOutlineInfoCircle /> About Us
                </NavLink>
                <NavLink to="/contact" onClick={handleClose}>
                    <AiOutlineMail /> Contact
                </NavLink>
                {isAuthenticated && (
                    <LogoutLink onClick={logOut}>
                        <AiOutlineLogout /> Logout
                    </LogoutLink>
                )}
            </DrawerWrapper>
        </>
    );
};

export default Drawer;
