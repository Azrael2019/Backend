import bodyParser from "body-parser";
import cors from "cors";
import compression from "compression";
import favicon from "serve-favicon";
import path from "path";
import helmet from "helmet";
import http from "http";
import constants from "../helpers/constants";
import config from "./config";
import util from "util";
import limiter from "../helpers/limiter";

export default app => {
    app.disable('x-powered-by');
    app.use(favicon(path.join(__dirname, '../', 'favicon.ico')));
    app.use(helmet());
    app.use(bodyParser.urlencoded({extended: true, limit: '10mb'}));
    app.use(bodyParser.json({limit: '10mb', type: 'application/json'}));
    app.use(compression());
    const whitelist = !config.cors.allowedHost || config.cors.allowedHost === '*'
        ? false
        : config.cors.allowedHost
            .split(',')
            .map(i => i.trim());
    const corsOptions = {
        origin: (origin, callback) => !origin || !whitelist || whitelist.indexOf(origin) !== -1 ? callback(null, true) : callback({message: util.format(constants.messages.cors.text, origin), code: constants.messages.cors.code}),
        methods: 'GET,PUT,POST,DELETE,PATCH',
        preflightContinue: false,
        optionsSuccessStatus: 204,
        exposedHeaders: Object.values(constants.headers),
    };
    app.use(cors(corsOptions));
    app.use(limiter());
    app.server = http.createServer(app);
};
