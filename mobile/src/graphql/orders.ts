/**
 * Orders GraphQL queries and types
 * PR 6: Remaining Screens Restyle
 */

import { gql } from '@apollo/client';

// Types
export interface Order {
    id: string;
    type: 'DELIVERY' | 'LAB';
    status: string;
    treatmentType: string;
    title: string;
    createdAt: string;
    estimatedDelivery?: string;
    deliveredAt?: string;
    slotDate?: string;
    completedAt?: string;
}

export interface MyOrdersResponse {
    myOrders: {
        active: Order[];
        past: Order[];
    };
}

// Query
export const GET_MY_ORDERS = gql`
    query GetMyOrders {
        myOrders {
            active {
                id
                type
                status
                treatmentType
                title
                createdAt
                estimatedDelivery
                deliveredAt
                slotDate
                completedAt
            }
            past {
                id
                type
                status
                treatmentType
                title
                createdAt
                estimatedDelivery
                deliveredAt
                slotDate
                completedAt
            }
        }
    }
`;
