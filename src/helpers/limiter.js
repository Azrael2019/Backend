import rateLimit from "express-rate-limit";
import redisStore from "rate-limit-redis";
import redis from "redis";
import config from "../configs/config";

export default (options = {}) => rateLimit(Object.assign(
    {},
    config.rateLimit.default,
    options,
    {store: new redisStore({client: redis.createClient(config.redis)})}
));
