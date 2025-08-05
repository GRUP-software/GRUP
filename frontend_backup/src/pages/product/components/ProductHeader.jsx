import styled from 'styled-components';
// import { FiHeart } from 'react-icons/fi';

const Header = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 30px;

    @media (max-width: 768px) {
        flex-direction: column;
        gap: 20px;
    }
`;

const TitleSection = styled.div`
    flex: 1;
`;

const ProductTitle = styled.h1`
    font-size: var(--font-large);
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 10px;
`;

const ProductSubtitle = styled.p`
    font-size: var(--font-small_3);
    color: #718096;
    margin-bottom: 15px;
`;

// const RatingSection = styled.div`
//     display: flex;
//     align-items: center;
//     gap: 10px;
//     margin-bottom: 10px;
// `;

// const Stars = styled.div`
//     display: flex;
//     gap: 2px;
// `;

// const RatingText = styled.span`
//     color: #4a5568;
//     font-size: var(--font-small_3);
// `;

const ActionButtons = styled.div`
    display: flex;
    gap: 10px;
`;

// const ActionButton = styled.button`
//     background: white;
//     border: 2px solid #e2e8f0;
//     border-radius: 8px;
//     padding: 12px;
//     cursor: pointer;
//     transition: all 0.2s;

//     &:hover {
//         border-color: #cbd5e0;
//         background: #f7fafc;
//     }
// `;

const ProductHeader = ({
    title,
    subtitle,
    // rating,
    // reviewCount,
}) => {
    return (
        <Header>
            <TitleSection>
                <ProductTitle>{title}</ProductTitle>
                <ProductSubtitle>{subtitle}</ProductSubtitle>
                {/* <RatingSection>
                    <Stars>
                        {[1, 2, 3, 4, 5].map((star) => (
                            <FiStar
                                key={star}
                                size={16}
                                fill={star <= rating ? '#fbbf24' : 'none'}
                                color={star <= rating ? '#fbbf24' : '#e2e8f0'}
                            />
                        ))}
                    </Stars>
                    <RatingText>({reviewCount} reviews)</RatingText>
                </RatingSection> */}
            </TitleSection>

            <ActionButtons>
                {/* <ActionButton>
                    <FiHeart size={20} color="#718096" />
                </ActionButton> */}
                {/* <ActionButton>
                    <FiShare2 size={20} color="#718096" />
                </ActionButton> */}
            </ActionButtons>
        </Header>
    );
};

export default ProductHeader;
