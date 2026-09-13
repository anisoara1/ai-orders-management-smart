const cds = require("@sap/cds");
const { GoogleGenAI } = require("@google/genai");
require("dotenv").config();

const { SELECT, INSERT, UPDATE } = cds.ql;

// Initialize Gemini AI.
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

module.exports = cds.service.impl(async function () {

    const {
        Orders,
        OrderItems,
        Products,
        Customers,
        AIRecommendations,
        OrderStatusHistory
    } = this.entities;

    // Update the order status and record the change in history.
    async function changeOrderStatus({
        orderID,
        newStatus,
        reason
    }) {

        const order = await SELECT.one
            .from(Orders)
            .where({
                ID: orderID
            });

        if (!order) {
            throw new Error(
                `Order ${orderID} does not exist.`
            );
        }

        const oldStatus = order.status;

        if (oldStatus === newStatus) {
            return order;
        }

        const maxID = await SELECT.one
            .from(OrderStatusHistory)
            .columns("max(ID) as maxID");

        const nextID =
            Number(maxID?.maxID || 0) + 1;

        await UPDATE(Orders)
            .set({
                status: newStatus
            })
            .where({
                ID: orderID
            });

        await INSERT
            .into(OrderStatusHistory)
            .entries({
                ID: nextID,
                orderID: orderID,
                oldStatus: oldStatus || null,
                newStatus: newStatus,
                changedAt: new Date().toISOString(),
                reason: reason || "Order status changed"
            });

        console.log(
            `Order ${orderID}: ${oldStatus} -> ${newStatus}`
        );

        return await SELECT.one
            .from(Orders)
            .where({
                ID: orderID
            });
    }

    // Return the dashboard order summary.
    this.on("getOrderSummary", async req => {

        const orders = await SELECT.from(Orders);

        const totalOrders = orders.length;

        const pendingOrders = orders.filter(
            order => order.status === "Pending"
        ).length;

        const completedOrders = orders.filter(
            order => order.status === "Completed"
        ).length;

        const processingOrders = orders.filter(
            order => order.status === "Processing"
        ).length;

        const totalOffered = orders.filter(
            order =>
                order.offerStatus === "SENT"
        ).length;

        const totalValue = orders.reduce(
            (sum, order) =>
                sum +
                Number(order.price || 0) *
                Number(order.quantity || 0),
            0
        );

    return {
        totalOrders,
        pendingOrders,
        completedOrders,
        processingOrders,
        totalOffered,
        totalValue
    };
    });

    // Build the order analysis data used by the AI flow.
    this.on("analyzeOrders", async req => {

        const orders = await SELECT.from(Orders);
        const orderItems = await SELECT.from(OrderItems);
        const products = await SELECT.from(Products);
        const customers = await SELECT.from(Customers);

        const result = [];

        for (const order of orders) {

            const customer = customers.find(
                c =>
                    Number(c.ID) ===
                    Number(order.customerID)
            );

            const items = orderItems
                .filter(
                    item =>
                        Number(item.orderID) ===
                        Number(order.ID)
                )
                .map(item => {

                    const product = products.find(
                        p =>
                            Number(p.ID) ===
                            Number(item.productID)
                    );

                    const value =
                        Number(item.price || 0) *
                        Number(item.quantity || 0);

                    return {
                        productID: item.productID,
                        product:
                            product?.name ||
                            "Unknown",
                        category:
                            product?.category ||
                            "Unknown",
                        quantity: item.quantity,
                        price: item.price,
                        value,
                        stock: product?.stock
                    };
                });

            const totalValue = items.reduce(
                (sum, item) =>
                    sum + item.value,
                0
            );

            result.push({
                orderID: order.ID,

                customer: customer
                    ? {
                        customerID: customer.ID,
                        name: customer.name,
                        email: customer.email,
                        city: customer.city
                    }
                    : null,

                status: order.status,
                items,
                totalValue
            });
        }

        return JSON.stringify({
            totalOrders: orders.length,
            orders: result
        });
    });

    // Generate and store an AI recommendation for an order.
    this.on("getAIRecommendation", async req => {

        try {

            const { orderID } = req.data;

            if (!orderID) {
                return req.error(
                    400,
                    "orderID is required"
                );
            }

            const orders =
                await SELECT.from(Orders);

            const orderItems =
                await SELECT.from(OrderItems);

            const products =
                await SELECT.from(Products);

            const customers =
                await SELECT.from(Customers);

            const order = orders.find(
                o =>
                    Number(o.ID) ===
                    Number(orderID)
            );

            if (!order) {
                return req.error(
                    404,
                    `Order ${orderID} not found`
                );
            }

            const customer = customers.find(
                c =>
                    Number(c.ID) ===
                    Number(order.customerID)
            );

            const items = orderItems.filter(
                item =>
                    Number(item.orderID) ===
                    Number(orderID)
            );

            // Build AI input using the actual OrderItem quantity and price.
            const aiItems = items.map(item => {

                const product = products.find(
                    p =>
                        Number(p.ID) ===
                        Number(item.productID)
                );

                const quantity =
                    Number(item.quantity || 0);

                const price =
                    Number(item.price || 0);

                const value =
                    Number(
                        (
                            price *
                            quantity
                        ).toFixed(2)
                    );

                return {
                    productID:
                        item.productID,

                    product:
                        product?.name ||
                        order.product ||
                        "Unknown",

                    category:
                        product?.category ||
                        "Unknown",

                    quantity,

                    price,

                    value,

                    stock:
                        Number(
                            product?.stock || 0
                        )
                };
            });

            // Calculate the actual total order value.
            const totalValue =
                Number(
                    aiItems
                        .reduce(
                            (sum, item) =>
                                sum + item.value,
                            0
                        )
                        .toFixed(2)
                );

            const orderData = {
                orderID:
                    order.ID,

                status:
                    order.status,

                customer: customer
                    ? {
                        ID:
                            customer.ID,

                        name:
                            customer.name,

                        email:
                            customer.email,

                        city:
                            customer.city
                    }
                    : null,

                items:
                    aiItems,

                totalValue
            };

            // Prompt the AI using the order data and discount rules.
            const prompt = `
            You are an AI assistant for an order management system.

            Analyze the following order and provide a recommendation for the manager.

            IMPORTANT LANGUAGE RULE:
            - Respond exclusively in English.
            - The fields "recommendation" and "reason" must be written entirely in English.
            - Do not use Romanian or any other language.
            - Do not mix languages.

            IMPORTANT ORDER RULES:
            - "price" is the unit price of one product.
            - "quantity" is the number of units ordered.
            - "totalValue" is the complete order value and equals price × quantity.
            - Any discount must be calculated based on the total order value, not the unit price.
            - Consider the quantity, total order value, stock, and delivery requirements when making the recommendation.
            - The recommendation must be realistic and commercially reasonable.

            RETURN FORMAT:
            Return ONLY valid JSON.
            Do not add Markdown.
            Do not add explanations outside the JSON.
            Do not use code fences.

            The JSON must contain exactly these fields:

            {
                "recommendation": "string",
                "reason": "string",
                "confidenceScore": number,
                "suggestedDiscount": number,
                "suggestedDeliveryDays": number
            }

            FIELD RULES:
            - "recommendation": concise recommendation written exclusively in English.
            - "reason": detailed explanation written exclusively in English. Include the unit price, quantity, total order value, and the logic behind the recommended discount.
            - "confidenceScore": number between 0 and 1.
            - "suggestedDiscount": percentage number between 0 and 100.
            - "suggestedDeliveryDays": positive integer representing the recommended delivery time in days.

            ORDER DATA:
            ${JSON.stringify(orderData)}
            `;

            const result =
                await ai.models.generateContent({
                    model: "gemini-3.6-flash",
                    contents: prompt
                });

            console.log(
                "Gemini result:",
                JSON.stringify(
                    result,
                    null,
                    2
                )
            );

            const text =
                result?.text ||
                result?.candidates?.[0]
                    ?.content
                    ?.parts?.[0]
                    ?.text ||
                "";

            if (!text || !text.trim()) {
                return req.error(
                    502,
                    "AI returned an empty response"
                );
            }

            // Remove optional markdown code fences from the AI response.
            let cleanedText =
                text.trim();

            cleanedText =
                cleanedText
                    .replace(
                        /^```json\s*/i,
                        ""
                    )
                    .replace(
                        /^```\s*/i,
                        ""
                    )
                    .replace(
                        /\s*```$/i,
                        ""
                    )
                    .trim();

            let aiRecommendation;

            try {

                aiRecommendation =
                    JSON.parse(
                        cleanedText
                    );

            } catch (parseError) {

                console.error(
                    "Gemini returned invalid JSON:"
                );

                console.error(
                    cleanedText
                );

                return req.error(
                    502,
                    "AI returned invalid JSON"
                );
            }

            const recommendation = {

                recommendation:
                    aiRecommendation.recommendation ||
                    "Nu sunt recomandări AI pentru această comandă.",

                reason:
                    aiRecommendation.reason ||
                    "Comanda nu îndeplinește criteriile curente.",

                confidenceScore:
                    Number(
                        aiRecommendation.confidenceScore
                    ) || 0.70,

                suggestedDiscount:
                    Number(
                        aiRecommendation.suggestedDiscount
                    ) || 0,

                suggestedDeliveryDays:
                    Number(
                        aiRecommendation.suggestedDeliveryDays
                    ) || 2
            };

            // Keep the suggested discount within the valid range.
            recommendation.suggestedDiscount =
                Math.max(
                    0,
                    Math.min(
                        100,
                        recommendation.suggestedDiscount
                    )
                );

            const existing =
                await SELECT.one
                    .from(AIRecommendations)
                    .where({
                        order_ID:
                            orderID
                    });

            let savedRecommendation;

            if (existing) {

                await UPDATE(
                    AIRecommendations
                )
                    .set({

                        recommendation:
                            recommendation.recommendation,

                        reason:
                            recommendation.reason,

                        confidenceScore:
                            recommendation.confidenceScore,

                        suggestedDiscount:
                            recommendation.suggestedDiscount,

                        suggestedDeliveryDays:
                            recommendation.suggestedDeliveryDays,

                        decisionStatus:
                            null,

                        appliedDiscount:
                            0

                    })
                    .where({
                        ID:
                            existing.ID
                    });

                savedRecommendation = {

                    ID:
                        existing.ID,

                    order_ID:
                        orderID,

                    ...recommendation
                };

            } else {

                const maxID =
                    await SELECT.one
                        .from(AIRecommendations)
                        .columns(
                            "max(ID) as maxID"
                        );

                const newID =
                    Number(
                        maxID?.maxID || 0
                    ) + 1;

                await INSERT
                    .into(AIRecommendations)
                    .entries({

                        ID:
                            newID,

                        order_ID:
                            orderID,

                        recommendation:
                            recommendation.recommendation,

                        reason:
                            recommendation.reason,

                        confidenceScore:
                            recommendation.confidenceScore,

                        suggestedDiscount:
                            recommendation.suggestedDiscount,

                        suggestedDeliveryDays:
                            recommendation.suggestedDeliveryDays,

                        decisionStatus:
                            null,

                        appliedDiscount:
                            0
                    });

                savedRecommendation = {

                    ID:
                        newID,

                    order_ID:
                        orderID,

                    ...recommendation
                };
            }

            return savedRecommendation;

        } catch (error) {

            console.error(
                "AI recommendation error:",
                error
            );

            return req.error(
                502,
                error.message ||
                "AI service is unavailable"
            );
        }
    });

    // Accept the AI recommendation and apply its discount.
    this.on("acceptAIRecommendation", async req => {

        try {

            const { orderID } = req.data;

            if (!orderID) {
                return req.error(
                    400,
                    "orderID is required"
                );
            }

            const recommendation =
                await SELECT.one
                    .from(AIRecommendations)
                    .where({
                        order_ID: orderID
                    });

            if (!recommendation) {
                return req.error(
                    404,
                    `AI recommendation for order ${orderID} not found`
                );
            }

            if (
                recommendation.decisionStatus ===
                "ACCEPTED"
            ) {
                return req.error(
                    400,
                    "AI recommendation has already been accepted for this order"
                );
            }

            const order =
                await SELECT.one
                    .from(Orders)
                    .where({
                        ID: orderID
                    });

            if (!order) {
                return req.error(
                    404,
                    `Order ${orderID} not found`
                );
            }

            const unitPrice =
                Number(order.price || 0);

            const quantity =
                Number(order.quantity || 0);

            if (
                unitPrice <= 0 ||
                quantity <= 0
            ) {
                return req.error(
                    400,
                    "Invalid order price or quantity"
                );
            }

            // Always calculate from the original unit price to avoid
            // compounding discounts after repeated Accept/Reject actions.
            const originalPrice =
                Number(
                    (
                        unitPrice *
                        quantity
                    ).toFixed(2)
                );

            const discount =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            recommendation.suggestedDiscount || 0
                        )
                    )
                );

            const finalPrice =
                Number(
                    (
                        originalPrice *
                        (1 - discount / 100)
                    ).toFixed(2)
                );

            const deliveryDays =
                Number(
                    recommendation.suggestedDeliveryDays || 0
                );

            await UPDATE(Orders)
                .set({

                    price: unitPrice,

                    originalPrice:
                        originalPrice,

                    finalPrice:
                        finalPrice,

                    offeredDiscount:
                        discount,

                    appliedDiscount:
                        discount,

                    deliveryDays:
                        deliveryDays
                })
                .where({
                    ID: orderID
                });

            await UPDATE(AIRecommendations)
                .set({

                    decisionStatus:
                        "ACCEPTED",

                    appliedDiscount:
                        discount
                })
                .where({
                    ID: recommendation.ID
                });

            return {

                ID: recommendation.ID,

                orderID: orderID,

                recommendation:
                    recommendation.recommendation,

                reason:
                    recommendation.reason,

                confidenceScore:
                    recommendation.confidenceScore,

                suggestedDiscount:
                    recommendation.suggestedDiscount,

                suggestedDeliveryDays:
                    recommendation.suggestedDeliveryDays,

                decisionStatus:
                    "ACCEPTED",

                appliedDiscount:
                    discount,

                unitPrice:
                    unitPrice,

                quantity:
                    quantity,

                originalPrice:
                    originalPrice,

                finalPrice:
                    finalPrice,

                deliveryDays:
                    deliveryDays
            };

        } catch (error) {

            console.error(
                "Accept AI recommendation error:",
                error
            );

            return req.error(
                500,
                error.message ||
                "Unable to accept AI recommendation"
            );
        }
    });

    // Reject the AI recommendation and reset the discount.
    this.on("rejectAIRecommendation", async req => {

        try {

            const { orderID } = req.data;

            if (!orderID) {
                return req.error(
                    400,
                    "orderID is required"
                );
            }

            const recommendation =
                await SELECT.one
                    .from(AIRecommendations)
                    .where({
                        order_ID: orderID
                    });

            if (!recommendation) {
                return req.error(
                    404,
                    `AI recommendation for order ${orderID} not found`
                );
            }

            const order =
                await SELECT.one
                    .from(Orders)
                    .where({
                        ID: orderID
                    });

            if (!order) {
                return req.error(
                    404,
                    `Order ${orderID} not found`
                );
            }

            const unitPrice =
                Number(order.price || 0);

            const quantity =
                Number(order.quantity || 0);

            if (
                unitPrice <= 0 ||
                quantity <= 0
            ) {
                return req.error(
                    400,
                    "Invalid order price or quantity"
                );
            }

            const originalPrice =
                Number(
                    (
                        unitPrice *
                        quantity
                    ).toFixed(2)
                );

            await UPDATE(Orders)
                .set({

                    price:
                        unitPrice,

                    originalPrice:
                        originalPrice,

                    finalPrice:
                        originalPrice,

                    appliedDiscount:
                        0,

                    offeredDiscount:
                        0,

                    deliveryDays:
                        0
                })
                .where({
                    ID: orderID
                });

            await UPDATE(AIRecommendations)
                .set({

                    decisionStatus:
                        "REJECTED",

                    appliedDiscount:
                        0
                })
                .where({
                    ID: recommendation.ID
                });

            return {

                ID: recommendation.ID,

                order_ID:
                    orderID,

                recommendation:
                    recommendation.recommendation,

                reason:
                    recommendation.reason,

                confidenceScore:
                    recommendation.confidenceScore,

                suggestedDiscount:
                    recommendation.suggestedDiscount,

                suggestedDeliveryDays:
                    recommendation.suggestedDeliveryDays,

                decisionStatus:
                    "REJECTED",

                appliedDiscount:
                    0,

                originalPrice:
                    originalPrice,

                finalPrice:
                    originalPrice
            };

        } catch (error) {

            console.error(
                "Reject AI recommendation error:",
                error
            );

            return req.error(
                500,
                error.message ||
                "Unable to reject AI recommendation"
            );
        }
    });

    // Send an accepted offer to the customer.
    this.on("sendOfferToCustomer", async req => {

        try {

            const { orderID } = req.data;

            if (!orderID) {
                return req.error(
                    400,
                    "orderID is required"
                );
            }

            const order =
                await SELECT.one
                    .from(Orders)
                    .where({
                        ID: orderID
                    });

            if (!order) {
                return req.error(
                    404,
                    `Order ${orderID} not found`
                );
            }

            const recommendation =
                await SELECT.one
                    .from(AIRecommendations)
                    .where({
                        order_ID: orderID
                    });

            if (!recommendation) {
                return req.error(
                    404,
                    "AI recommendation not found"
                );
            }

            if (
                recommendation.decisionStatus !==
                "ACCEPTED"
            ) {
                return req.error(
                    400,
                    "AI recommendation must be accepted before sending the offer"
                );
            }

            const unitPrice =
                Number(order.price || 0);

            const quantity =
                Number(order.quantity || 0);

            const originalPrice =
                Number(order.originalPrice || 0);

            const finalPrice =
                Number(order.finalPrice || 0);

            const discount =
                Number(order.offeredDiscount || 0);

            if (
                unitPrice <= 0 ||
                quantity <= 0 ||
                originalPrice <= 0
            ) {
                return req.error(
                    400,
                    "Invalid order pricing data"
                );
            }

            console.log(
                `Sending offer for order ${orderID}:`,
                {
                    unitPrice,
                    quantity,
                    originalPrice,
                    discount,
                    finalPrice
                }
            );

            await UPDATE(Orders)
                .set({
                    offerStatus:
                        "SENT"
                })
                .where({
                    ID: orderID
                });

            return {

                orderID,

                unitPrice,

                quantity,

                originalPrice,

                discount,

                finalPrice,

                offerStatus:
                    "SENT",

                message:
                    "Offer sent to customer"
            };

        } catch (error) {

            console.error(
                "Send offer error:",
                error
            );

            return req.error(
                500,
                error.message ||
                "Unable to send offer to customer"
            );
        }
    });

    // Return customer orders that have an offer status.
    this.on("getCustomerOrders", async req => {

        try {

            const { customerID } = req.data;

            if (!customerID) {
                return req.error(
                    400,
                    "customerID is required"
                );
            }

            const orders =
                await SELECT
                    .from(Orders)
                    .where({
                        customerID
                    });

            return orders.filter(
                order =>
                    order.offerStatus !== null &&
                    order.offerStatus !== undefined
            );

        } catch (error) {

            console.error(
                "Get customer orders error:",
                error
            );

            return req.error(
                500,
                error.message ||
                "Unable to load customer orders"
            );
        }
    });

    // Accept a customer offer and move the order to Processing.
    this.on("acceptCustomerOffer", async req => {

        try {

            const { orderID } = req.data;

            if (!orderID) {
                return req.error(
                    400,
                    "orderID is required"
                );
            }

            const order =
                await SELECT.one
                    .from(Orders)
                    .where({
                        ID: orderID
                    });

            if (!order) {
                return req.error(
                    404,
                    `Order ${orderID} not found`
                );
            }

            if (
                order.offerStatus !==
                "SENT"
            ) {
                return req.error(
                    400,
                    "Offer is not available for acceptance"
                );
            }

            if (order.customerDecision) {
                return req.error(
                    400,
                    "Customer has already made a decision"
                );
            }

            await UPDATE(Orders)
                .set({

                    customerDecision:
                        "ACCEPTED",

                    offerStatus:
                        "ACCEPTED"
                })
                .where({
                    ID: orderID
                });

            await changeOrderStatus({

                orderID,

                newStatus:
                    "Processing",

                reason:
                    "Customer accepted the offer"
            });

            return "The offer was accepted. The order is now being processed.";

        } catch (error) {

            console.error(
                "Accept customer offer error:",
                error
            );

            return req.error(
                500,
                error.message ||
                "Unable to accept customer offer"
            );
        }
    });

    // Reject the customer offer while keeping the order Pending.
    this.on("rejectCustomerOffer", async req => {

        try {

            const { orderID } = req.data;

            if (!orderID) {
                return req.error(
                    400,
                    "orderID is required"
                );
            }

            const order =
                await SELECT.one
                    .from(Orders)
                    .where({
                        ID: orderID
                    });

            if (!order) {
                return req.error(
                    404,
                    `Order ${orderID} not found`
                );
            }

            if (
                order.offerStatus !==
                "SENT"
            ) {
                return req.error(
                    400,
                    "Offer is not available for rejection"
                );
            }

            if (order.customerDecision) {
                return req.error(
                    400,
                    "Customer has already made a decision"
                );
            }

            await UPDATE(Orders)
                .set({

                    customerDecision:
                        "REJECTED",

                    offerStatus:
                        "REJECTED"
                })
                .where({
                    ID: orderID
                });

            return "The offer was rejected.";

        } catch (error) {

            console.error(
                "Reject customer offer error:",
                error
            );

            return req.error(
                500,
                error.message ||
                "Unable to reject customer offer"
            );
        }
    });

    // Move an accepted order from Pending to Processing.
    this.on("processOrder", async req => {

        try {

            const { orderID } = req.data;

            if (!orderID) {
                return req.error(
                    400,
                    "orderID is required"
                );
            }

            const order =
                await SELECT.one
                    .from(Orders)
                    .where({ ID: orderID });

            if (!order) {
                return req.error(
                    404,
                    `Order ${orderID} not found`
                );
            }

            if (order.status === "Completed") {
                return req.error(
                    400,
                    "Order is already completed"
                );
            }

            if (order.status === "Processing") {
                return "The order is already being processed.";
            }

            if (order.status !== "Pending") {
                return req.error(
                    400,
                    `Order cannot be processed from status ${order.status}`
                );
            }

            await changeOrderStatus({
                orderID,
                newStatus: "Processing",
                reason: "Order moved to Processing"
            });

            return "The order is now being processed.";

        } catch (error) {

            console.error(
                "Process order error:",
                error
            );

            return req.error(
                500,
                error.message ||
                "Unable to process order"
            );
        }
    });

    // Move an order from Processing to Completed.
    this.on("completeOrder", async req => {

        try {

            const { orderID } = req.data;

            if (!orderID) {
                return req.error(
                    400,
                    "orderID is required"
                );
            }

            const order =
                await SELECT.one
                    .from(Orders)
                    .where({
                        ID: orderID
                    });

            if (!order) {
                return req.error(
                    404,
                    `Order ${orderID} not found`
                );
            }

            if (
                order.status ===
                "Completed"
            ) {
                return "The order is already completed.";
            }

            if (
                order.status !==
                "Processing"
            ) {
                return req.error(
                    400,
                    "Only orders in Processing status can be completed."
                );
            }

            await changeOrderStatus({

                orderID,

                newStatus:
                    "Completed",

                reason:
                    "Order completed"
            });

            return "The order has been completed.";

        } catch (error) {

            console.error(
                "Complete order error:",
                error
            );

            return req.error(
                500,
                error.message ||
                "Unable to complete order"
            );
        }
    });

    // Expose order status history.
    this.on("READ", OrderStatusHistory, async req => {

        return await SELECT
            .from(OrderStatusHistory);
    });

});