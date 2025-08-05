import styled from 'styled-components';
// import { useState, useEffect } from 'react';

const Banner = styled.div`
    background: #426d68;
    border-radius: 20px;
    padding: 50px 40px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
    position: relative;
    overflow: hidden;
    max-width: 1500px;
    margin: auto;

    @media (max-width: 768px) {
        padding: 40px 20px;
        border-radius: 16px;
    }
`;

const FloatingShapes = styled.div`
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    overflow: hidden;
    z-index: 0;

    &::before {
        content: '';
        position: absolute;

        width: 300px;
        height: 300px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        animation: float 2s ease-in-out infinite;
    }

    &::after {
        content: '';
        position: absolute;
        bottom: -10%;
        width: 200px;
        height: 200px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 50%;
        animation: float 3s ease-in-out infinite reverse;
    }

    @keyframes float {
        0%,
        100% {
            transform: translateY(0px) rotate(0deg);
        }
        50% {
            transform: translateY(-20px) rotate(180deg);
        }
    }
`;

const BannerContent = styled.div`
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr;
    gap: 50px;
    align-items: flex-start;

    @media (max-width: 768px) {
        grid-template-columns: 1fr;
        gap: 30px;
        text-align: center;
    }
`;

const TextSection = styled.div`
    color: white;
`;

const TopBadge = styled.div`
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    padding: 8px 16px;
    border-radius: 50px;
    font-size: var(--font-small_3);
    font-weight: 600;
    margin-bottom: 20px;
`;

const MainTitle = styled.h1`
    font-size: 3.2rem;
    font-weight: 800;
    margin-bottom: 20px;
    line-height: 1.1;

    @media (max-width: 768px) {
        font-size: var(--font-small_3);
    }

    @media (max-width: 480px) {
        font-size: 2rem;
    }
`;

const GradientText = styled.span`
    background: linear-gradient(45deg, #ffeb3b, #4caf50);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const Description = styled.p`
    font-size: 1.2rem;
    opacity: 0.9;
    margin-bottom: 30px;
    line-height: 1.6;

    @media (max-width: 768px) {
        font-size: var(--font-small_3);
    }
`;

const StatsRow = styled.div`
    display: flex;
    gap: 30px;
    margin-bottom: 30px;

    @media (max-width: 768px) {
        justify-content: center;
    }

    @media (max-width: 480px) {
        flex-direction: column;
        gap: 15px;
        align-items: center;
    }
`;

const StatItem = styled.div`
    text-align: center;
`;

const StatNumber = styled.div`
    font-size: 2rem;
    font-weight: 700;
    color: #ffeb3b;

    @media (max-width: 768px) {
        font-size: 1.8rem;
    }
`;

const StatLabel = styled.div`
    font-size: var(--font-small_3);
    opacity: 0.8;
    margin-top: 5px;
`;

// const CTAButtons = styled.div`
//     display: flex;
//     gap: 15px;

//     @media (max-width: 768px) {
//         justify-content: center;
//     }

//     @media (max-width: 480px) {
//         flex-direction: column;
//         align-items: center;
//     }
// `;

// const PrimaryButton = styled.button`
//     background: linear-gradient(45deg, #4caf50, #66bb6a);
//     color: white;
//     border: none;
//     padding: 16px 32px;
//     font-size: var(--font-small_3);
//     font-weight: 600;
//     border-radius: 50px;
//     cursor: pointer;
//     transition: all 0.3s ease;
//     box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);

//     &:hover {
//         transform: translateY(-3px);
//         box-shadow: 0 8px 25px rgba(76, 175, 80, 0.4);
//     }

//     @media (max-width: 480px) {
//         width: 220px;
//     }
// `;

// const SecondaryButton = styled.button`
//     background: transparent;
//     color: white;
//     border: 2px solid rgba(255, 255, 255, 0.3);
//     padding: 14px 30px;
//     font-size: var(--font-small_3);
//     font-weight: 600;
//     border-radius: 50px;
//     cursor: pointer;
//     transition: all 0.3s ease;
//     backdrop-filter: blur(10px);

//     &:hover {
//         background: rgba(255, 255, 255, 0.1);
//         border-color: rgba(255, 255, 255, 0.5);
//     }

//     @media (max-width: 480px) {
//         width: 220px;
//     }
// `;

const MainBanner = () => {
    // const [activeUsers, setActiveUsers] = useState(1247);

    // useEffect(() => {
    //     const interval = setInterval(() => {
    //         setActiveUsers((prev) => prev + Math.floor(Math.random() * 3));
    //     }, 3000);
    //     return () => clearInterval(interval);
    // }, []);

    return (
        <Banner>
            <FloatingShapes />
            <BannerContent>
                <TextSection>
                    <TopBadge>🌱 Wholesale directly to you</TopBadge>
                    <MainTitle>
                        Buy Together, <GradientText>Save Together</GradientText>
                    </MainTitle>
                    <Description>
                        Join hundreds of smart shoppers getting cheap products
                        at wholesale prices through group buying power.
                    </Description>

                    <StatsRow>
                        {/* <StatItem>
                            <StatNumber>
                                {activeUsers.toLocaleString()}
                            </StatNumber>
                            <StatLabel>Active Buyers</StatLabel>
                        </StatItem> */}
                        <StatItem>
                            <StatNumber>40%</StatNumber>
                            <StatLabel>Avg. Savings</StatLabel>
                        </StatItem>
                        {/* <StatItem>
                            <StatNumber>500</StatNumber>
                            <StatLabel>Products</StatLabel>
                        </StatItem> */}
                    </StatsRow>

                    {/* <CTAButtons>
                        <PrimaryButton>Start Group Buy</PrimaryButton>
                        <SecondaryButton>View Deals</SecondaryButton>
                    </CTAButtons> */}
                </TextSection>
            </BannerContent>
        </Banner>
    );
};

export default MainBanner;
