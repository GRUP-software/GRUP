import styled from 'styled-components';
import {
    FiUsers,
    FiClock,
    // FiTruck,
} from 'react-icons/fi';
import { FaShareAlt } from 'react-icons/fa';

import { formatNumberTONaira } from '../../../utils/format-number';

const InfoSection = styled.div`
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
    margin-bottom: 30px;
`;

const PriceSection = styled.div`
    display: grid;
    gap: 10px;
    margin-bottom: 25px;
`;

const CurrentPrice = styled.div`
    font-size: var(--font-large_2);
    font-weight: 700;
    color: red;
`;

const ShareTag = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    background: red;
    color: white;
    padding: 12px;
    font-size: var(--font-small_3);
    font-weight: 500;
    border-radius: 9999px;
    justify-content: center;
    cursor: pointer;
    width: 100%;
`;

const OriginalPrice = styled.span`
    font-size: var(--font-medium);
    color: #a0aec0;
    text-decoration: line-through;
    margin-right: 10px;
`;

const Savings = styled.span`
    font-size: var(--font-small_3);
    color: #38a169;
    font-weight: 600;
`;

const GroupBuyInfo = styled.div`
    background: #f0fff4;
    border: 1px solid #9ae6b4;
    border-radius: 8px;
    padding: 20px;
    margin-bottom: 25px;
`;

const GroupBuyTitle = styled.h3`
    font-size: var(--font-small_3);
    font-weight: 600;
    color: #2f855a;
    margin-bottom: 15px;
    display: flex;
    align-items: center;
    gap: 8px;
`;

const ProgressBar = styled.div`
    background: #e2e8f0;
    border-radius: 50px;
    height: 8px;
    margin-bottom: 10px;
    overflow: hidden;
`;

const Progress = styled.div`
    background: linear-gradient(to right, #38a169, #48bb78);
    height: 100%;
    width: ${(props) => props.width}%;
    transition: width 0.3s ease;
`;

const ProgressText = styled.div`
    display: flex;
    justify-content: space-between;
    font-size: var(--font-small_3);
    color: #4a5568;
`;

const FeatureList = styled.div`
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 15px;
    margin-bottom: 25px;
`;

const Feature = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px;
    background: #f7fafc;
    border-radius: 8px;
`;

const FeatureText = styled.span`
    font-size: var(--font-small_3);
    color: #4a5568;
`;

const BuyGroupp = styled.div`
    display: flex;
    gap: 10px;
`;

const BuyButton = styled.button`
    width: 100%;
    background: red;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 16px;
    font-size: var(--font-small_3);
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(66, 153, 225, 0.3);
    }
`;

const ProductInfo = ({
    currentPrice,
    originalPrice,
    groupProgress,
    groupTarget,
    currentMembers,
}) => {
    const savings = originalPrice - currentPrice;
    const progressPercentage = (groupProgress / groupTarget) * 100;

    return (
        <InfoSection>
            <PriceSection>
                <CurrentPrice>{formatNumberTONaira(currentPrice)}</CurrentPrice>
                <OriginalPrice>
                    {formatNumberTONaira(originalPrice)}
                </OriginalPrice>
                <Savings>Save {formatNumberTONaira(savings)}</Savings>
                <ShareTag>
                    <FaShareAlt size={16} />
                    Share with family & friends
                </ShareTag>
            </PriceSection>

            <GroupBuyInfo>
                <GroupBuyTitle>
                    <FiUsers size={20} />
                    Group Buy Progress
                </GroupBuyTitle>
                <ProgressBar>
                    <Progress width={progressPercentage} />
                </ProgressBar>
                <ProgressText>
                    <span>{currentMembers} joined</span>
                    <span>{groupTarget} needed</span>
                </ProgressText>
            </GroupBuyInfo>

            <FeatureList>
                {/* <Feature>
                    <FiTruck size={16} color="#4299e1" />
                    <FeatureText>Free shipping</FeatureText>
                </Feature> */}
                <Feature>
                    <FiClock size={16} color="#4299e1" />
                    <FeatureText>2-day delivery</FeatureText>
                </Feature>
            </FeatureList>

            <BuyGroupp>
                <BuyButton>Join Group Buy!</BuyButton>
                {/* <BuyButton>Solo Buy</BuyButton> */}
            </BuyGroupp>
        </InfoSection>
    );
};

export default ProductInfo;
