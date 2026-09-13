using { ai.orders as db } from '../db/schema';

service OrdersService {

    entity Customers as projection on db.Customers;

    entity Products as projection on db.Products;

    entity Orders as projection on db.Orders;

    entity OrderItems as projection on db.OrderItems;

    entity AIRecommendations as projection on db.AIRecommendations {
        *,
        order
    };

    entity OrderStatusHistory as projection on db.OrderStatusHistory;

    type OrderSummary {
        totalOrders      : Integer;
        pendingOrders    : Integer;
        completedOrders  : Integer;
        processingOrders : Integer;
        totalOffered     : Integer;
        totalValue       : Decimal(15,2);
    }

    type AIRecommendation {
        orderID               : Integer;
        recommendation        : String;
        reason                : String;
        confidenceScore      : Decimal(5,2);
        suggestedDiscount    : Decimal(5,2);
        suggestedDeliveryDays : Integer;
    }

    action getOrderSummary()
        returns OrderSummary;

    action analyzeOrders()
        returns String;

    action getAIRecommendation(
        orderID : Integer
    ) returns AIRecommendation;

    action acceptAIRecommendation(
        orderID : Integer
    ) returns AIRecommendation;

    action rejectAIRecommendation(
        orderID : Integer
    ) returns AIRecommendation;

    action getCustomerOrders(
        customerID : Integer
    ) returns many Orders;

    action acceptCustomerOffer(
        orderID : Integer
    ) returns String;

    action rejectCustomerOffer(
        orderID : Integer
    ) returns String;

    action sendOfferToCustomer(
        orderID : Integer
    ) returns String;

    action processOrder(
        orderID : Integer
    ) returns String;

    action completeOrder(
        orderID : Integer
    ) returns String;
}
