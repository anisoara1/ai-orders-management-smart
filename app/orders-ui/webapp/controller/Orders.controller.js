sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (
    Controller,
    MessageToast,
    MessageBox
) {
    "use strict";

    return Controller.extend("ai.orders.ui.controller.Orders", {

        // Initialize the Orders page and prepare action button visibility.
        onInit: function () {

            console.log("Orders controller initialized");

            const oTable = this.byId("ordersTable");

            if (oTable) {
                oTable.attachUpdateFinished(
                    this._updateActionButtons,
                    this
                );
            }

            const oRouter =
                this.getOwnerComponent().getRouter();

            oRouter
                .getRoute("orders")
                .attachPatternMatched(
                    this._onOrdersRouteMatched,
                    this
                );
        },

        // Show action buttons only for Pending and Processing orders.
        _updateActionButtons: function () {

            const oTable =
                this.byId("ordersTable");

            if (!oTable) {
                return;
            }

            const aItems =
                oTable.getItems();

            aItems.forEach(function (oItem) {

                const oContext =
                    oItem.getBindingContext();

                if (!oContext) {
                    return;
                }

                const sStatus =
                    String(
                        oContext.getProperty("status") || ""
                    ).trim();

                const aButtons =
                    oItem.findAggregatedObjects(
                        true,
                        function (oControl) {
                            return oControl.isA("sap.m.Button");
                        }
                    );

                aButtons.forEach(function (oButton) {

                    oButton.setVisible(
                        sStatus === "Pending" ||
                        sStatus === "Processing"
                    );
                });
            });
        },

        // Refresh the Orders table whenever the Orders route is opened.
        _onOrdersRouteMatched: function () {

            console.log(
                "Orders route matched - refreshing table"
            );

            const oTable =
                this.byId("ordersTable");

            if (!oTable) {
                console.error(
                    "Orders table not found"
                );
                return;
            }

            const oBinding =
                oTable.getBinding("items");

            if (oBinding) {
                oBinding.refresh();
            }
        },

        // Manually refresh the Orders table.
        onRefresh: function () {

            const oTable =
                this.byId("ordersTable");

            if (!oTable) {
                console.error(
                    "Orders table not found"
                );
                return;
            }

            const oBinding =
                oTable.getBinding("items");

            if (oBinding) {

                console.log(
                    "Refreshing Orders table"
                );

                oBinding.refresh();
            }
        },

        onNavBack: function () {

            this.getOwnerComponent()
                .getRouter()
                .navTo("dashboard");
        },

        // Open the Order Details page for the selected order.
        onOrderPress: function (oEvent) {

            const oItem =
                oEvent.getSource();

            const oContext =
                oItem.getBindingContext();

            if (!oContext) {
                return;
            }

            const oOrder =
                oContext.getObject();

            console.log(
                "Selected order:",
                oOrder
            );

            this.getOwnerComponent()
                .getRouter()
                .navTo("orderDetails", {
                    orderId: oOrder.ID
                });
        },

        // Process an order directly from the Orders page.
        onProcessOrder: async function (oEvent) {

            const oContext =
                oEvent
                    .getSource()
                    .getBindingContext();

            if (!oContext) {

                MessageBox.error(
                    "The order could not be identified."
                );

                return;
            }

            const orderID =
                Number(
                    oContext.getProperty("ID")
                );

            if (!Number.isFinite(orderID)) {

                MessageBox.error(
                    "The order ID is invalid."
                );

                return;
            }

            console.log(
                "Process order:",
                orderID
            );

            try {

                const oModel =
                    this.getView().getModel();

                const oAction =
                    oModel.bindContext(
                        "/processOrder(...)"
                    );

                oAction.setParameter(
                    "orderID",
                    orderID
                );

                await oAction.execute();

                MessageToast.show(
                    "Order " +
                    orderID +
                    " was sent for processing."
                );

                const oTable =
                    this.byId("ordersTable");

                if (oTable) {

                    const oBinding =
                        oTable.getBinding("items");

                    if (oBinding) {
                        oBinding.refresh();
                    }
                }

            } catch (error) {

                console.error(
                    "Process order error:",
                    error
                );

                MessageBox.error(
                    error && error.message
                        ? error.message
                        : "The order could not be sent for processing."
                );
            }
        },

        // Convert the order status into a UI5 status state.
        formatStatus: function (sStatus) {

            switch (sStatus) {

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

        // Format the unit price.
        formatUnitPrice: function (fPrice) {

            const price =
                Number(fPrice);

            if (!Number.isFinite(price)) {
                return "";
            }

            return price.toFixed(2);
        },

        // Calculate and format the original order total.
        formatInitialTotal: function (
            fPrice,
            fQuantity
        ) {

            let price;
            let quantity;

            if (typeof fPrice === "string") {

                price =
                    Number(
                        fPrice
                            .replace(/\./g, "")
                            .replace(",", ".")
                    );

            } else {

                price =
                    Number(fPrice);
            }

            if (typeof fQuantity === "string") {

                quantity =
                    Number(
                        fQuantity
                            .replace(/\./g, "")
                            .replace(",", ".")
                    );

            } else {

                quantity =
                    Number(fQuantity);
            }

            if (
                !Number.isFinite(price) ||
                !Number.isFinite(quantity)
            ) {
                return "—";
            }

            return (
                price * quantity
            ).toLocaleString("ro-RO", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        },

        formatDiscount: function (fDiscount) {

            const discount =
                Number(fDiscount);

            if (
                !Number.isFinite(discount) ||
                discount <= 0
            ) {
                return "—";
            }

            return (
                discount.toFixed(2) +
                "%"
            );
        },

        formatFinalPrice: function (fFinalPrice) {

            if (
                fFinalPrice === null ||
                fFinalPrice === undefined ||
                fFinalPrice === ""
            ) {
                return "—";
            }

            const finalPrice =
                Number(fFinalPrice);

            if (!Number.isFinite(finalPrice)) {
                return "—";
            }

            return finalPrice.toFixed(2);
        },

        // Display the customer's decision in a readable form.
        formatCustomerDecision: function (
            sDecision
        ) {

            switch (sDecision) {

                case "ACCEPTED":
                    return "Offer accepted by customer";

                case "REJECTED":
                    return "Offer rejected by customer";

                default:
                    return "—";
            }
        },

        formatCustomerDecisionState: function (
            sDecision
        ) {

            switch (sDecision) {

                case "ACCEPTED":
                    return "Success";

                case "REJECTED":
                    return "Error";

                default:
                    return "None";
            }
        },

        // Display the current customer offer status.
        formatOfferStatus: function (
            sOfferStatus
        ) {

            switch (sOfferStatus) {

                case "SENT":
                    return "Offer sent";

                case "ACCEPTED":
                    return "Offer accepted";

                case "REJECTED":
                    return "Offer rejected";

                default:
                    return "—";
            }
        },

        formatOfferStatusState: function (
            sOfferStatus
        ) {

            switch (sOfferStatus) {

                case "SENT":
                    return "Warning";

                case "ACCEPTED":
                    return "Success";

                case "REJECTED":
                    return "Error";

                default:
                    return "None";
            }
        },

        // Define the action available for each order status.
        formatActionText: function (sStatus) {

            if (sStatus === "Pending") {
                return "Send to Processing";
            }

            if (sStatus === "Processing") {
                return "Complete Order";
            }

            return "";
        },

        formatActionIcon: function (sStatus) {

            if (sStatus === "Pending") {
                return "sap-icon://process";
            }

            if (sStatus === "Processing") {
                return "sap-icon://complete";
            }

            return "";
        },

        // Execute the appropriate order action based on its current status.
        onActionPress: async function (oEvent) {

            const oContext =
                oEvent
                    .getSource()
                    .getBindingContext();

            if (!oContext) {

                MessageBox.error(
                    "The order could not be identified."
                );

                return;
            }

            const orderID =
                Number(
                    oContext.getProperty("ID")
                );

            const sStatus =
                oContext.getProperty("status");

            if (!Number.isFinite(orderID)) {

                MessageBox.error(
                    "The order ID is invalid."
                );

                return;
            }

            try {

                const oModel =
                    this.getView().getModel();

                let oAction;
                let sMessage;

                if (sStatus === "Pending") {

                    oAction =
                        oModel.bindContext(
                            "/processOrder(...)"
                        );

                    oAction.setParameter(
                        "orderID",
                        orderID
                    );

                    sMessage =
                        "Order " +
                        orderID +
                        " was sent for processing.";

                } else if (sStatus === "Processing") {

                    oAction =
                        oModel.bindContext(
                            "/completeOrder(...)"
                        );

                    oAction.setParameter(
                        "orderID",
                        orderID
                    );

                    sMessage =
                        "Order " +
                        orderID +
                        " was completed.";

                } else {

                    return;
                }

                await oAction.execute();

                MessageToast.show(
                    sMessage
                );

                const oTable =
                    this.byId("ordersTable");

                if (oTable) {

                    const oBinding =
                        oTable.getBinding("items");

                    if (oBinding) {
                        oBinding.refresh();
                    }
                }

            } catch (error) {

                console.error(
                    "Order action error:",
                    error
                );

                MessageBox.error(
                    error && error.message
                        ? error.message
                        : "The order action could not be executed."
                );
            }
        }

    });
});

