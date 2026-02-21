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

// Order detail type (for /order/[id] screen)
export interface OrderDetail {
    id: string;
    orderNumber: string;
    status: string;
    deliveryAddress: string;
    deliveryCity: string;
    deliveryPincode: string;
    deliveryPersonName?: string;
    deliveryPersonPhone?: string;
    estimatedDeliveryTime?: string;
    deliveryOtp?: string;
    medicationCost: number;
    deliveryCost: number;
    totalAmount: number;
    orderedAt: string;
    sentToPharmacyAt?: string;
    pharmacyReadyAt?: string;
    deliveredAt?: string;
    cancelledAt?: string;
    deliveryFailedReason?: string;
}

export interface GetOrderDetailResponse {
    order: {
        success: boolean;
        message: string;
        order?: OrderDetail;
    };
}

// Queries
export const GET_ORDER_DETAIL = gql`
    query GetOrderDetail($id: String!) {
        order(id: $id) {
            success
            message
            order {
                id
                orderNumber
                status
                deliveryAddress
                deliveryCity
                deliveryPincode
                deliveryPersonName
                deliveryPersonPhone
                estimatedDeliveryTime
                deliveryOtp
                medicationCost
                deliveryCost
                totalAmount
                orderedAt
                sentToPharmacyAt
                pharmacyReadyAt
                deliveredAt
                cancelledAt
                deliveryFailedReason
            }
        }
    }
`;

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
