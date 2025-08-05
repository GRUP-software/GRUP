import styled from 'styled-components';
import { FiPackage, FiCheck } from 'react-icons/fi';

const HistoryContainer = styled.div`
    background: white;
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
`;

const HistoryTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    color: #2d3748;
    margin-bottom: 25px;
`;

const OrderList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 20px;
`;

const OrderCard = styled.div`
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 20px;
    transition: all 0.2s;

    &:hover {
        border-color: #cbd5e0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    }
`;

const OrderHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 15px;

    @media (max-width: 768px) {
        flex-direction: column;
        gap: 10px;
    }
`;

const OrderInfo = styled.div``;

const OrderTitle = styled.h3`
    font-size: var(--font-small_3);
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 5px;
`;

const OrderDate = styled.p`
    color: #718096;
    font-size: var(--font-small_3);
`;

const OrderStatus = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    border-radius: 50px;
    font-size: var(--font-small_3);
    font-weight: 600;
    background: ${(props) => {
        switch (props.$status) {
            case 'delivered':
                return '#e6fffa';

            case 'processing':
                return '#e6f3ff';
            default:
                return '#f7fafc';
        }
    }};
    color: ${(props) => {
        switch (props.$status) {
            case 'delivered':
                return '#38a169';

            case 'processing':
                return '#4299e1';
            default:
                return '#718096';
        }
    }};
`;

const OrderDetails = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;

    @media (max-width: 768px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
    }
`;

const OrderPrice = styled.div`
    font-size: 1.2rem;
    font-weight: 700;
    color: #2d3748;
`;

const ViewButton = styled.button`
    background: none;
    border: 1px solid #4299e1;
    color: #4299e1;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    transition: all 0.2s;

    &:hover {
        background: #4299e1;
        color: white;
    }
`;

const GroupBuyHistory = ({ orders }) => {
    const getStatusIcon = (status) => {
        switch (status) {
            case 'delivered':
                return <FiCheck size={16} />;

            case 'processing':
                return <FiPackage size={16} />;
            default:
                return <FiPackage size={16} />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'delivered':
                return 'Delivered';

            case 'processing':
                return 'Processing';
            default:
                return 'Unknown';
        }
    };

    return (
        <HistoryContainer>
            <HistoryTitle>Group Buy History</HistoryTitle>
            <OrderList>
                {orders.map((order) => (
                    <OrderCard key={order.id}>
                        <OrderHeader>
                            <OrderInfo>
                                <OrderTitle>{order.title}</OrderTitle>
                                <OrderDate>{order.date}</OrderDate>
                            </OrderInfo>
                            <OrderStatus $status={order.status}>
                                {getStatusIcon(order.status)}
                                {getStatusText(order.status)}
                            </OrderStatus>
                        </OrderHeader>
                        <OrderDetails>
                            <OrderPrice>
                                ₦{order.price}{' '}
                                <span
                                    style={{
                                        fontSize: '0.9rem',
                                        color: '#38a169',
                                    }}
                                >
                                    (Saved ₦{order.savings})
                                </span>
                            </OrderPrice>
                            <ViewButton>View Details</ViewButton>
                        </OrderDetails>
                    </OrderCard>
                ))}
            </OrderList>
        </HistoryContainer>
    );
};

export default GroupBuyHistory;
