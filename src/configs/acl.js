import permissions from "./permissions";
import responseJson from "../helpers/response";
import constants from "../helpers/constants";

const allowPermissions = async (user, feature, access) => {

    // Check if admin
    if (user.role === constants.users.type.ADMIN) return true;

    // Check valid type
    const permissionsUser = await permissions();
    if (permissionsUser[user.role] && permissionsUser[user.role].access) {

        // Check feature and access
        if (permissionsUser[user.role].access[feature] && permissionsUser[user.role].access[feature] >= access) return true;
    }
    return false;
};

export default (feature, access) => {

    // return a middleware
    return async (req, res, next) => {
        if (await allowPermissions(req.user, feature, access))
            next(); // type is allowed, so continue on the next middleware
        else {
            const error = {message: constants.messages.permission.text, code: constants.messages.permission.code};
            res.status(403).json(responseJson.error(error, req.user));
        }
    }
};
