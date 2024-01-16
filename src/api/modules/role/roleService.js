import RoleModel from "../../models/roleModel";
import ServiceCache from "../_serviceCache";
import constants from "../../../helpers/constants";
import redisClient from "../../../helpers/redis";

class RoleService extends ServiceCache {

    constructor() {
        super('Role', RoleModel);
    }

    getMetadata() {
        return Promise.resolve({item: {type: Object.keys(constants.access.type), features: Object.keys(constants.access.features)}});
    }

    async create(itemSave, user) {
        return super.create(itemSave, user)
            .then(item => {
                redisClient.del("role-permissions");
                return item;
            });
    }

    async updateById(id, itemSave, user) {
        return super.updateById(id, itemSave, user)
            .then(item => {
                redisClient.del("role-permissions");
                return item;
            });
    }
}

export default new RoleService()
