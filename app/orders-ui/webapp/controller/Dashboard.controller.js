sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], function (
    Controller,
    JSONModel,
    MessageBox
) {
    "use strict";

    return Controller.extend("ai.orders.ui.controller.Dashboard", {

        // Initialize the Dashboard model and route handling.
        onInit: function () {

            const oDashboardModel = new JSONModel({
                totalOrders: 0,
                pendingOrders: 0,
                processingOrders: 0,
                completedOrders: 0,
                totalValue: 0
            });

            const oRouter =
                this.getOwnerComponent().getRouter();

            oRouter
                .getRoute("dashboard")
                .attachPatternMatched(
                    this._onDashboardRouteMatched,
                    this
                );

            this.getView().setModel(
                oDashboardModel,
                "dashboard"
            );

            this._loadDashboard();

            this._refreshInterval =
                setInterval(
                    function () {
                        this._loadDashboard();
                    }.bind(this),
                    5000
                );
        },

        // Reload the Dashboard whenever its route is opened.
        _onDashboardRouteMatched: function () {
            this._loadDashboard();
        },

        // Get the order summary from the CAP backend.
        _loadDashboard: async function () {

            try {

                const oModel =
                    this.getOwnerComponent().getModel();

                const oAction =
                    oModel.bindContext(
                        "/getOrderSummary(...)"
                    );

                await oAction.execute();

                const oResult =
                    oAction.getBoundContext()
                        .getObject();

                console.log(
                    "Dashboard summary:",
                    oResult
                );

                this.getView()
                    .getModel("dashboard")
                    .setData(oResult);

            } catch (error) {

                console.error(
                    "Dashboard error:",
                    error
                );

            }
        },

        // Stop the Dashboard refresh timer when the controller is destroyed.
        onExit: function () {

            if (this._refreshInterval) {

                clearInterval(
                    this._refreshInterval
                );

                this._refreshInterval = null;
            }
        },

        // Format numeric values for display.
        formatCurrency: function (value) {

            const number =
                Number(value);

            if (!Number.isFinite(number)) {
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

        // Navigate to the Orders page.
        onOrders: function () {

            this.getOwnerComponent()
                .getRouter()
                .navTo("orders");
        }

    });
});