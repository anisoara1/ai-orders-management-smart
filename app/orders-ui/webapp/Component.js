sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "./model/models"
], function (
    UIComponent,
    JSONModel,
    models
) {
    "use strict";

    return UIComponent.extend("ai.orders.ui.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {

            // Initialize the parent component.
            UIComponent.prototype.init.apply(
                this,
                arguments
            );

            // Initialize the device model.
            this.setModel(
                models.createDeviceModel(),
                "device"
            );

            // Initialize the shared AI model.
            const oAIModel = new JSONModel({
                aiRecommendation: null
            });

            this.setModel(
                oAIModel,
                "ai"
            );

            console.log(
                "AI model initialized:",
                oAIModel
            );

            // Initialize the application router.
            this.getRouter().initialize();
        }
    });
});