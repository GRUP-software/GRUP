import styled from 'styled-components';
// import Listings from './ListingsTwo';
// import Location from './Location/Location';
// import Type from './Type/Type';
// import { Helmet } from 'react-helmet';
import MainBanner from './banner/MainBanner';
import Products from './products/Products';

const DIV = styled.div`
    height: 100%;
    width: 90%;
    margin: auto;
    margin-top: 25px;
    max-width: 2500px;
    background-color: var(--app-color4);

    .topbar {
        display: flex;
        justify-content: flex-end;
        gap: 20px;
    }
`;

const Home = () => {
    return (
        <DIV>
            {/* <Helmet>
                <title>Criibb | Rent & List Short-Term Homes </title>
                <meta
                    name="description"
                    content="Find and list the best short-term rental apartments, villas, studios across top locations in Nigeria."
                />
                <link
                    rel="canonical"
                    href={`${import.meta.env.VITE_APP_URL}create-host/`}
                />
            </Helmet> */}

            <MainBanner />
            <Products />
        </DIV>
    );
};

export default Home;
