sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (
    Controller,
    JSONModel,
    MessageToast,
    MessageBox
) {
    "use strict";

    return Controller.extend("ai.orders.client.controller.Client", {

        onInit: function () {

            this.getView().setModel(
                new JSONModel({
                    customerID: 1,
                    orders: [],
                    loading: false
                }),
                "client"
            );

            this._loadOrders();
        },

        _loadOrders: async function () {

            const oModel = this.getView().getModel();
            const oClientModel = this.getView().getModel("client");

            const customerID = Number(
                oClientModel.getProperty("/customerID")
            );

            if (!customerID) {
                MessageToast.show("Introduceți Customer ID");
                return;
            }

            oClientModel.setProperty("/loading", true);

            try {

                console.log(
                    "Loading customer orders for:",
                    customerID
                );

                const oAction = oModel.bindContext(
                    "/getCustomerOrders(...)"
                );

                oAction.setParameter(
                    "customerID",
                    customerID
                );

                await oAction.execute();

                const oBoundContext =
                    oAction.getBoundContext();

                const oResult =
                    oBoundContext
                        ? oBoundContext.getObject()
                        : null;

                console.log(
                    "Customer orders result:",
                    oResult
                );

                let aOrders = [];

                if (Array.isArray(oResult)) {

                    aOrders = oResult;

                } else if (
                    oResult &&
                    Array.isArray(oResult.value)
                ) {

                    aOrders = oResult.value;

                } else if (
                    oResult &&
                    Array.isArray(oResult.$values)
                ) {

                    aOrders = oResult.$values;
                }

                console.log(
                    "Customer orders:",
                    aOrders
                );

                oClientModel.setProperty(
                    "/orders",
                    aOrders
                );

            } catch (error) {

                console.error(
                    "Get customer orders error:",
                    error
                );

                MessageBox.error(
                    "Nu s-au putut încărca comenzile."
                );

            } finally {

                oClientModel.setProperty(
                    "/loading",
                    false
                );
            }
        },

        onLoadOrders: function () {

            this._loadOrders();
        },

        onAcceptOffer: async function (oEvent) {

            const oContext =
                oEvent
                    .getSource()
                    .getBindingContext("client");

            if (!oContext) {
                MessageBox.error(
                    "Nu s-a putut identifica această comandă."
                );
                return;
            }

            const orderID =
                Number(
                    oContext.getProperty("ID")
                );

            console.log(
                "Accept customer offer:",
                orderID
            );

            try {

                const oModel =
                    this.getView().getModel();

                const oAction =
                    oModel.bindContext(
                        "/acceptCustomerOffer(...)"
                    );

                oAction.setParameter(
                    "orderID",
                    orderID
                );

                await oAction.execute();

                MessageToast.show(
                    "Oferta a fost acceptată."
                );

                await this._loadOrders();

            } catch (error) {

                console.error(
                    "Accept offer error:",
                    error
                );

                MessageBox.error(
                    "Oferta nu a putut fi acceptată."
                );
            }
        },

        onRejectOffer: async function (oEvent) {

            const oContext =
                oEvent
                    .getSource()
                    .getBindingContext("client");

            if (!oContext) {
                MessageBox.error(
                    "Nu s-a putut identifica această comandă."
                );
                return;
            }

            const orderID =
                Number(
                    oContext.getProperty("ID")
                );

            console.log(
                "Reject customer offer:",
                orderID
            );

            try {

                const oModel =
                    this.getView().getModel();

                const oAction =
                    oModel.bindContext(
                        "/rejectCustomerOffer(...)"
                    );

                oAction.setParameter(
                    "orderID",
                    orderID
                );

                await oAction.execute();

                MessageToast.show(
                    "Oferta a fost respinsă."
                );

                await this._loadOrders();

            } catch (error) {

                console.error(
                    "Reject offer error:",
                    error
                );

                MessageBox.error(
                    "Oferta nu a putut fi respinsă."
                );
            }
        }

    });
});