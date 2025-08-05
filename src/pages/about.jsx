import styled from 'styled-components';
import { FaUsers } from 'react-icons/fa';
import { Helmet } from 'react-helmet';

const StyledAboutUs = styled.div`
    background: #f8f9fa;
    min-height: 100vh;
    display: flex;
    justify-content: center;
    padding: 40px;

    .card {
        background: #fff;
        padding: 40px;
        max-width: 800px;
        width: 100%;
        border-radius: 12px;
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.1);
        font-family: 'Inter', sans-serif;
        color: #333;
        text-align: center;
    }

    .icon {
        color: var(--app-color, #2c3e50);
        font-size: 50px;
        margin-bottom: 20px;
    }

    h1 {
        font-size: 2.8rem;
        margin-bottom: 20px;
        color: #2c3e50;
    }

    p {
        font-size: 1.2rem;
        line-height: 1.7;
        margin-bottom: 20px;
        color: #555;
    }

    strong {
        color: var(--app-color, #e67e22);
    }

    ul {
        list-style-type: disc;
        text-align: left;
        padding-left: 40px;
        margin-bottom: 20px;

        li {
            margin-bottom: 12px;
            font-size: 1.1rem;
            color: #555;
        }
    }

    @media (max-width: 600px) {
        padding: 20px;

        .card {
            padding: 20px;
        }

        h1 {
            font-size: 2rem;
        }

        p,
        li {
            font-size: 1rem;
        }
    }
`;

const AboutUs = () => {
    return (
        <StyledAboutUs>
            <Helmet>
                <title>Grup - About Us</title>
                <meta
                    name="description"
                    content="Buy Together, Save Together"
                />
                <link
                    rel="canonical"
                    href={`${import.meta.env.VITE_APP_URL}about/`}
                />
            </Helmet>
            <div className="card">
                <FaUsers className="icon" />
                <h1>About Us</h1>
                <p>
                    Welcome to <strong>Grup</strong>, the platform that empowers
                    people to come together and make smarter purchases through
                    group buying. We believe that when individuals join forces,
                    everyone benefits, from lower prices to better deals that
                    would not be possible alone.
                </p>
                <p>
                    Our mission is simple: <strong>help you save more</strong>{' '}
                    by connecting you with others who share the same purchasing
                    goals.
                </p>
                <ul>
                    <li>Discover popular group-buy deals</li>
                    <li>Track progress and secure your discounted purchase</li>
                </ul>
                <p>
                    Join us on our journey to make products more affordable, and
                    impactful for everyone!
                </p>
            </div>
        </StyledAboutUs>
    );
};

export default AboutUs;
