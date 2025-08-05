import styled from 'styled-components';
import { useState } from 'react';

const DescriptionSection = styled.div`
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const TabList = styled.div`
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    margin-bottom: 25px;
`;

const Tab = styled.button`
    background: none;
    border: none;
    padding: 15px 20px;
    font-size: var(--font-small_3);
    font-weight: 600;
    color: ${(props) => (props.$active ? '#4299e1' : '#718096')};
    border-bottom: 2px solid
        ${(props) => (props.$active ? '#4299e1' : 'transparent')};
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        color: #4299e1;
    }
`;

const TabContent = styled.div`
    line-height: 1.6;
    color: #4a5568;
    padding: 30px;
`;

const SpecTable = styled.table`
    width: 100%;
    border-collapse: collapse;
`;

const SpecRow = styled.tr`
    border-bottom: 1px solid #e2e8f0;
`;

const SpecLabel = styled.td`
    padding: 12px 0;
    font-weight: 600;
    color: #2d3748;
    width: 30%;
`;

const SpecValue = styled.td`
    padding: 12px 0;
    color: #4a5568;
`;

const ProductDescription = ({ description, specifications }) => {
    const [activeTab, setActiveTab] = useState('description');

    return (
        <DescriptionSection>
            <TabList>
                <Tab
                    $active={activeTab === 'description'}
                    onClick={() => setActiveTab('description')}
                >
                    Description
                </Tab>
                <Tab
                    $active={activeTab === 'specifications'}
                    onClick={() => setActiveTab('specifications')}
                >
                    Specifications
                </Tab>
            </TabList>

            <TabContent>
                {activeTab === 'description' && (
                    <div>
                        <p>{description}</p>
                    </div>
                )}

                {activeTab === 'specifications' && (
                    <SpecTable>
                        <tbody>
                            {Object.entries(specifications).map(
                                ([key, value]) => (
                                    <SpecRow key={key}>
                                        <SpecLabel>{key}</SpecLabel>
                                        <SpecValue>{value}</SpecValue>
                                    </SpecRow>
                                )
                            )}
                        </tbody>
                    </SpecTable>
                )}
            </TabContent>
        </DescriptionSection>
    );
};

export default ProductDescription;
