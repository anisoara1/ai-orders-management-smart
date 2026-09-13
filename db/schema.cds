namespace ai.orders;

entity Customers {
    key ID    : Integer;
    name      : String(100);
    email     : String(100);
    city      : String(100);
}

entity Products {
    key ID       : Integer;
    name         : String(100);
    price        : Decimal(10,2);
    stock        : Integer;
    category     : String(100);
}

entity Orders {
    key ID : Integer;

    customerID : Integer;

    customer : Association to Customers
        on customer.ID = customerID;

    product : String(100);

    quantity : Integer;

    price : Decimal(10,2);

    originalPrice : Decimal(10,2);

    finalPrice : Decimal(10,2);

    appliedDiscount : Decimal(5,2);

    deliveryDays : Integer;

    status : String(30);

    offerStatus : String(30);

    offeredDiscount : Decimal(5,2);

    customerDecision : String(30);
}

entity OrderItems {
    key ID : Integer;

    orderID : Integer;

    order : Association to Orders
        on order.ID = orderID;

    productID : Integer;

    product : Association to Products
        on product.ID = productID;

    quantity : Integer;

    price : Decimal(10,2);
}

entity AIRecommendations {
    key ID : Integer;

    order : Association to Orders;

    recommendation : String(500);

    reason : String(500);

    confidenceScore : Decimal(5,2);

    suggestedDiscount : Decimal(5,2);

    suggestedDeliveryDays : Integer;

    decisionStatus : String(20);

    appliedDiscount : Decimal(5,2);
}

entity OrderStatusHistory {
    key ID : Integer;

    orderID : Integer;

    order : Association to Orders
        on order.ID = orderID;

    oldStatus : String(30);

    newStatus : String(30);

    changedAt : Timestamp;

    reason : String(255);
}
