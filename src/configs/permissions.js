import constants from "../helpers/constants";
import redisClient from "../helpers/redis";
import RoleModel from "../api/models/roleModel";

export default async () => {
    let permissions = await redisClient.get("role-permissions");
    if (!permissions) {
        const roles = await RoleModel.find({deleted: false});
        permissions = {};
        roles.forEach(role => {
            if (!permissions[role.code]) {
                permissions[role.code] = {
                    name: role.name,
                    access: {},
                    permissions: role.permissions
                };
            }
            role.permissions.forEach(permission => {
                permissions[role.code].access[permission.feature] = constants.access.type[permission.accessType]
            });
        });
        redisClient.set("role-permissions", permissions, 'EX', constants.redis.WEEK);
    }
    return permissions;
};
