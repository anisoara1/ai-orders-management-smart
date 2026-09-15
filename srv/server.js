const cds = require("@sap/cds");

cds.on("bootstrap", (app) => {

    app.use((req, res, next) => {

        const origin = req.headers.origin;

        if (origin === "https://anisoara1.github.io") {
            res.setHeader(
                "Access-Control-Allow-Origin",
                origin
            );

            res.setHeader(
                "Access-Control-Allow-Credentials",
                "true"
            );

            res.setHeader(
                "Access-Control-Allow-Methods",
                "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            );

            res.setHeader(
                "Access-Control-Allow-Headers",
                "Content-Type,Authorization,OData-Version,OData-MaxVersion,Accept,Accept-Language,Prefer,Origin"
            );

        res.setHeader(
            "Access-Control-Allow-Headers",
            "Content-Type,Authorization,OData-Version,OData-MaxVersion,Accept,Accept-Language,Prefer,Origin,X-CSRF-Token,sap-cancel-on-close"
        );
        }

        if (req.method === "OPTIONS") {
            return res.sendStatus(204);
        }

        next();
    });

});

module.exports = cds.server;