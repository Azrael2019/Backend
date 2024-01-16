import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";
import config from "./configs/config";
import logger from "./helpers/logger";
import auth from "./configs/auth";
import expressConfig from "./configs/express";
import routerConfig from "./configs/router";

const app = express();

// HTTP request logger
app.use(morgan('short', {'stream': logger.stream}));

// express settings
expressConfig(app);

app.use(auth.initialize());
auth.setJwtStrategy();
auth.setFacebookStrategy();
auth.setGoogleStrategy();
auth.setAppleStrategy();

// connect to database
mongoose.Promise = global.Promise;
mongoose.connect(config.mongo.url, config.mongo.options, err => {
        if (err) {
            console.log(`[MongoDB] Failed to connect. ${err}`);
            process.exit(1);
        } else {
            console.log(`[MongoDB] connected: ${config.mongo.url}`);

            // initialize api
            routerConfig(app);
        }
    }
);

// start server
app.listen(config.apiPort, () => {
    console.log(`[Server] listening on port ${config.apiPort}`);
});

export default app;
