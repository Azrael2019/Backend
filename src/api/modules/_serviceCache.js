import Service from "./_service";
import redisClient from "../../helpers/redis";
import constants from "../../helpers/constants";
import crypto from "crypto";

class ServiceCache extends Service {
    constructor(modelName, ...arg) {
        super(modelName, ...arg);
        this.cacheKey = `sc-${modelName.toLowerCase()}`;
    }

    async getList(query, user) {
        if (user && user.role === constants.users.type.ADMIN) return super.getList(query, user);
        const cacheKey = `${this.cacheKey}-${user ? user.role.toLowerCase() : 'public'}-${crypto.createHash('md5').update(`${JSON.stringify(query)}`).digest("hex")}`;
        let data = await redisClient.get(cacheKey);
        if (!data) {
            data = await super.getList(query, user);
            redisClient.set(cacheKey, data, 'EX', constants.redis.HOUR);
        }
        return data;
    }

    async getById(id, query = {}, user) {
        const cacheKey = `${this.cacheKey}-${id}-${crypto.createHash('md5').update(`${JSON.stringify(query)}`).digest("hex")}`;
        let data = await redisClient.get(cacheKey);
        if (!data) {
            data = await super.getById(id, query, user);
            redisClient.set(cacheKey, data, 'EX', constants.redis.HOUR);
        }
        return data;
    }

    async create(itemSaveOri, user) {
        return super.create(itemSaveOri, user)
            .then(item => {
                redisClient.delWildcard(this.cacheKey);
                return item;
            });
    }

    async updateById(id, itemSaveOri, user) {
        return super.updateById(id, itemSaveOri, user)
            .then(item => {
                redisClient.delWildcard(this.cacheKey);
                return item;
            });
    }

    updateByQuery(query, itemSave) {
        return super.updateByQuery(query, itemSave)
            .then(item => {
                redisClient.delWildcard(this.cacheKey);
                return item;
            });
    }

    deleteById(id, user) {
        return super.deleteById(id, user)
            .then(item => {
                redisClient.delWildcard(this.cacheKey);
                return item;
            });
    }

    _findOneAndUpdate(query, doc, options) {
        return super._findOneAndUpdate(query, doc, options)
            .then(item => {
                redisClient.delWildcard(this.cacheKey);
                return item;
            });
    }

    _findByIdAndUpdate(id, doc, options) {
        return super._findByIdAndUpdate(id, doc, options)
            .then(item => {
                redisClient.delWildcard(this.cacheKey);
                return item;
            });
    }

    async _findAll(query) {
        const cacheKey = `${this.cacheKey}-find-all-${crypto.createHash('md5').update(`${JSON.stringify(query)}`).digest("hex")}`;
        let data = await redisClient.get(cacheKey);
        if (!data) {
            data = await super._findAll(query);
            redisClient.set(cacheKey, data, 'EX', constants.redis.HOUR);
        }
        return data;
    }
}

export default ServiceCache
