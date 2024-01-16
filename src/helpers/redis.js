import redis from "redis";
import config from "../configs/config";

let instance = null;

class RedisClient {

    constructor() {

        if (instance) {
            return instance;
        }
        instance = this;
        this.redisClient = redis.createClient(config.redis);
        this.redisIsReady = false;

        this.redisClient.on('error', () => {
            instance.redisIsReady = false;
        });

        this.redisClient.on('ready', function () {
            instance.redisIsReady = true;
        });
    }

    set(key, value, ...args) {
        return this.redisIsReady ? this.redisClient.set(key, JSON.stringify(value), ...args) : null;
    }

    get(key) {
        return new Promise((resolve) => this.redisIsReady
            ? this.redisClient.get(key, (err, reply) => {
                let ret = null;
                if (reply) {
                    try {
                        ret = JSON.parse(reply)
                    } catch (e) {
                    }
                }
                resolve(ret)
            })
            : resolve(null));
    }

    del(key) {
        return this.redisIsReady ? this.redisClient.del(key) : null;
    }

    getWildcard(key) {
        return this.redisIsReady
            ? new Promise((resolve, reject) => this.redisClient.keys(`${config.redis.prefix}${key}*`, (err, rows) => err
                ? reject(err)
                : resolve(rows.map(item => item.replace(new RegExp(`^${config.redis.prefix}`), '')))
            ))
            : null;
    }

    delWildcard(key) {
        return this.redisIsReady ? this.redisClient.keys(`${config.redis.prefix}${key}*`, (err, rows) =>
            rows.map(item => this.redisClient.del(item.replace(new RegExp(`^${config.redis.prefix}`), '')))
        ) : null;
    }
}

export default new RedisClient();
