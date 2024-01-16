'use strict';

import config from "../src/configs/config";
import {logger} from "./helpers/common"
import mongoose from "mongoose";
import minimist from "minimist";
import * as functions from "./modules";

// Check function
const selectF = process.argv && process.argv[2];
const selectFunction = functions[selectF];
if (!selectFunction) {
    logger(`Function ${selectF} doesn't exists`, true);
    process.exit(1);
} else {

    // Connect to mongobd
    mongoose.Promise = global.Promise;
    mongoose.connect(config.mongo.url, config.mongo.options, err => {
        if (err) {
            logger(`[MongoDB] Failed to connect. ${err}`, true);
            process.exit(1);
        } else {
            logger(`[MongoDB] connected: ${config.mongo.url}`);

            // Initialize process
            const args = minimist(process.argv.slice(3));
            selectFunction(args).finally(() => process.exit(0));
        }
    });
}

