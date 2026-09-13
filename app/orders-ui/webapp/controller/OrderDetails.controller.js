sap.ui.define([
"sap/ui/core/mvc/Controller",
"sap/ui/core/format/NumberFormat",
"sap/m/MessageToast",
"sap/m/MessageBox"
], function (
Controller,
NumberFormat,
MessageToast,
MessageBox
) {
"use strict";

return Controller.extend(
    "ai.orders.ui.controller.OrderDetails",
    {

        // Initialize the controller and listen for order detail navigation.
        onInit: function () {

            console.log("OrderDetails controller initialized");

            this.getOwnerComponent()
                .getRouter()
                .getRoute("orderDetails")
                .attachPatternMatched(
                    this._onRouteMatched,
                    this
                );
        },

        // Load the selected order and reset the previous AI recommendation.
        _onRouteMatched: function (oEvent) {

            const orderId =
                oEvent.getParameter("arguments").orderId;

            const oAIModel =
                this.getView().getModel("ai");

            if (oAIModel) {

                oAIModel.setProperty(
                    "/aiRecommendation",
                    null
                );

                console.log(
                    "AI Recommendation reset for order:",
                    orderId
                );
            }

            console.log(
                "OrderDetails route matched, ID:",
                orderId
            );

            const oModel =
                this.getOwnerComponent().getModel();

            if (!oModel) {

                console.error(
                    "OData model does not exist."
                );

                return;
            }

            const iOrderId =
                Number(orderId);

            if (
                !Number.isInteger(iOrderId) ||
                iOrderId <= 0
            ) {

                console.error(
                    "Invalid order ID:",
                    orderId
                );

                return;
            }

            // Build the OData V4 entity path manually.
            const sPath =
                "/Orders(" + iOrderId + ")";

            console.log(
                "Binding OrderDetails:",
                sPath
            );

            const oView =
                this.getView();

            oView.unbindElement();

            oView.bindElement({

                path: sPath,

                events: {

                    dataRequested: function () {

                        console.log(
                            "Loading OrderDetails:",
                            sPath
                        );
                    },

                    dataReceived: function (oEvent) {

                        console.log(
                            "OrderDetails data received:",
                            oEvent
                        );

                        const oContext =
                            oView.getBindingContext();

                        if (!oContext) {

                            console.error(
                                "No binding context for:",
                                sPath
                            );

                            return;
                        }

                        console.log(
                            "OrderDetails context:",
                            oContext
                        );

                        console.log(
                            "OrderDetails data:",
                            oContext.getObject()
                        );
                    }
                }
            });
        },

        // Calculate the displayed order total.
        formatOrderTotal: function (
            price,
            quantity,
            finalPrice
        ) {

            console.log(
                "FORMAT TOTAL:",
                price,
                quantity,
                finalPrice
            );

            // After accepting AI, use the calculated final price.
            if (
                finalPrice !== null &&
                finalPrice !== undefined &&
                finalPrice !== ""
            ) {

                const fp =
                    parseFloat(
                        String(finalPrice)
                            .replace(/\./g, "")
                            .replace(",", ".")
                    );

                if (!isNaN(fp)) {

                    return fp.toLocaleString(
                        "ro-RO",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );
                }
            }

            // Before accepting AI, calculate price × quantity.
            if (
                price === null ||
                price === undefined ||
                quantity === null ||
                quantity === undefined
            ) {

                return "0,00";
            }

            const p =
                parseFloat(
                    String(price)
                        .replace(/\./g, "")
                        .replace(",", ".")
                );

            const q =
                parseFloat(quantity);

            if (
                isNaN(p) ||
                isNaN(q)
            ) {

                return "0,00";
            }

            return (p * q).toLocaleString(
                "ro-RO",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
        },

        formatPrice: function (value) {

            console.log(
                "FORMAT PRICE:",
                value
            );

            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {

                return "0,00";
            }

            const number =
                parseFloat(
                    String(value)
                        .replace(/\./g, "")
                        .replace(",", ".")
                );

            if (isNaN(number)) {

                return "0,00";
            }

            return number.toLocaleString(
                "ro-RO",
                {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                }
            );
        },

        formatDiscount: function (value) {

            if (
                value === null ||
                value === undefined ||
                value === ""
            ) {

                return "—";
            }

            const discount =
                Number(value);

            if (
                !Number.isFinite(discount) ||
                discount <= 0
            ) {

                return "—";
            }

            return discount.toFixed(2) + "%";
        },

        formatStatus: function (status) {

            switch (status) {

                case "Completed":
                    return "Success";

                case "Processing":
                    return "Warning";

                case "Pending":
                    return "Information";

                default:
                    return "None";
            }
        },

        onNavBack: function () {

            this.getOwnerComponent()
                .getRouter()
                .navTo("orders");
        },

        // Request an AI recommendation from the CAP backend.
        onGetAIRecommendation: async function () {

            const oButton =
                this.byId("aiRecommendationButton");

            try {

                oButton.setBusy(true);
                oButton.setEnabled(false);

                const oModel =
                    this.getOwnerComponent().getModel();

                const oContext =
                    this.getView().getBindingContext();

                const orderID =
                    oContext.getProperty("ID");

                console.log(
                    "Requesting AI recommendation for order:",
                    orderID
                );

                const oAction =
                    oModel.bindContext(
                        "/getAIRecommendation(...)"
                    );

                oAction.setParameter(
                    "orderID",
                    orderID
                );

                await oAction.execute();

                const oResult =
                    oAction
                        .getBoundContext()
                        .getObject();

                this.getView()
                    .getModel("ai")
                    .setProperty(
                        "/aiRecommendation",
                        oResult
                    );

            } catch (error) {

                console.error(
                    "AI recommendation error:",
                    error
                );

                MessageBox.error(
                    "The AI recommendation could not be generated."
                );

            } finally {

                oButton.setBusy(false);
                oButton.setEnabled(true);
            }
        },

        // Accept the AI recommendation and refresh the order data.
        onAcceptAIRecommendation: async function () {

            try {

                const oModel =
                    this.getOwnerComponent().getModel();

                const oContext =
                    this.getView().getBindingContext();

                if (
                    !oModel ||
                    !oContext
                ) {

                    console.error(
                        "OData model or order context does not exist."
                    );

                    return;
                }

                const order =
                    oContext.getObject();

                const orderID =
                    Number(order.ID);

                if (
                    !Number.isInteger(orderID) ||
                    orderID <= 0
                ) {

                    console.error(
                        "Invalid order ID:",
                        orderID
                    );

                    return;
                }

                console.log(
                    "ACCEPT AI Recommendation for order:",
                    orderID
                );

                const oAction =
                    oModel.bindContext(
                        "/acceptAIRecommendation(...)"
                    );

                oAction.setParameter(
                    "orderID",
                    orderID
                );

                await oAction.execute();

                const result =
                    oAction
                        .getBoundContext()
                        .getObject();

                console.log(
                    "Accept AI result:",
                    result
                );

                const oAIModel =
                    this.getView().getModel("ai");

                if (oAIModel) {

                    oAIModel.setProperty(
                        "/aiRecommendation/decisionStatus",
                        "ACCEPTED"
                    );

                    oAIModel.setProperty(
                        "/aiRecommendation/appliedDiscount",
                        result.appliedDiscount
                    );

                    oAIModel.setProperty(
                        "/aiRecommendation/suggestedDiscount",
                        result.suggestedDiscount
                    );

                    oAIModel.setProperty(
                        "/aiRecommendation/suggestedDeliveryDays",
                        result.suggestedDeliveryDays
                    );
                }

                // Refresh the order so the UI displays the updated values.
                await oContext.requestRefresh();

                console.log(
                    "Order refreshed after ACCEPT."
                );

                MessageToast.show(
                    "The AI recommendation was accepted."
                );

            } catch (error) {

                console.error(
                    "Accept AI Recommendation error:",
                    error
                );

                MessageBox.error(
                    "The AI recommendation could not be accepted."
                );
            }
        },

        // Reject the AI recommendation and refresh the order data.
        onRejectAIRecommendation: async function () {

            try {

                const oModel =
                    this.getOwnerComponent().getModel();

                const oContext =
                    this.getView().getBindingContext();

                if (
                    !oModel ||
                    !oContext
                ) {

                    console.error(
                        "OData model or order context does not exist."
                    );

                    return;
                }

                const order =
                    oContext.getObject();

                const orderID =
                    Number(order.ID);

                if (
                    !Number.isInteger(orderID) ||
                    orderID <= 0
                ) {

                    console.error(
                        "Invalid order ID:",
                        orderID
                    );

                    return;
                }

                console.log(
                    "REJECT AI Recommendation for order:",
                    orderID
                );

                const oAction =
                    oModel.bindContext(
                        "/rejectAIRecommendation(...)"
                    );

                oAction.setParameter(
                    "orderID",
                    orderID
                );

                await oAction.execute();

                const result =
                    oAction
                        .getBoundContext()
                        .getObject();

                console.log(
                    "Reject AI result:",
                    result
                );

                const oAIModel =
                    this.getView().getModel("ai");

                if (oAIModel) {

                    oAIModel.setProperty(
                        "/aiRecommendation/decisionStatus",
                        "REJECTED"
                    );

                    oAIModel.setProperty(
                        "/aiRecommendation/appliedDiscount",
                        0
                    );
                }

                await oContext.requestRefresh();

                console.log(
                    "Order refreshed after REJECT."
                );

                MessageToast.show(
                    "The AI recommendation was rejected."
                );

            } catch (error) {

                console.error(
                    "Reject AI Recommendation error:",
                    error
                );

                MessageBox.error(
                    "The AI recommendation could not be rejected."
                );
            }
        },

        // Send the accepted AI offer to the customer.
        onSendOfferToCustomer: async function () {

            try {

                const oModel =
                    this.getOwnerComponent().getModel();

                const oContext =
                    this.getView().getBindingContext();

                if (
                    !oModel ||
                    !oContext
                ) {

                    console.error(
                        "OData model or order context does not exist."
                    );

                    return;
                }

                const order =
                    oContext.getObject();

                const orderID =
                    Number(order.ID);

                if (
                    !Number.isInteger(orderID) ||
                    orderID <= 0
                ) {

                    console.error(
                        "Invalid order ID:",
                        orderID
                    );

                    return;
                }

                const oAIModel =
                    this.getView().getModel("ai");

                const recommendation =
                    oAIModel
                        ? oAIModel.getProperty(
                            "/aiRecommendation"
                        )
                        : null;

                if (
                    !recommendation ||
                    recommendation.decisionStatus !== "ACCEPTED"
                ) {

                    MessageBox.warning(
                        "The offer can only be sent after the AI recommendation has been accepted."
                    );

                    return;
                }

                if (
                    order.offerStatus === "SENT" ||
                    order.offerStatus === "ACCEPTED"
                ) {

                    MessageBox.information(
                        "The offer has already been sent to the customer."
                    );

                    return;
                }

                console.log(
                    "SEND OFFER TO CUSTOMER for order:",
                    orderID
                );

                const oAction =
                    oModel.bindContext(
                        "/sendOfferToCustomer(...)"
                    );

                oAction.setParameter(
                    "orderID",
                    orderID
                );

                await oAction.execute();

                const result =
                    oAction
                        .getBoundContext()
                        .getObject();

                console.log(
                    "Send offer result:",
                    result
                );

                // Refresh the order so the updated offer status is displayed.
                await oContext.requestRefresh();

                console.log(
                    "Order refreshed after SEND OFFER."
                );

                MessageToast.show(
                    "The offer was sent to the customer."
                );

            } catch (error) {

                console.error(
                    "Send Offer To Customer error:",
                    error
                );

                MessageBox.error(
                    "The offer could not be sent to the customer."
                );
            }
        }

    }
);


});
