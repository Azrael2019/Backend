import redisClient from "./redis";
import constants from "./constants";
import SettingModel from "../api/models/settingModel";
import responseJson, {rejectPromise} from "./response";

export const settingsKeys = {
    outOfService: 'setting-out-of-service',
};

export function setSetting(key, value) {
    return SettingModel.findOneAndUpdate({key}, {value}, {new: true})
        .then((item) => {
            if (!item) return rejectPromise.validation('Settings', [key], constants.errors.kind.notFound);
            return redisClient.set(item.key, item.value, 'EX', constants.redis.WEEK);
        });
}

async function getSetting(key, value) {
    let setting = await redisClient.get(key);
    if (!setting) {
        const ret = await SettingModel.findOneOrCreate({key}, 'value', {key, value});
        if (ret && ret.value) {
            setting = ret.value;
            redisClient.set(key, setting, 'EX', constants.redis.WEEK);
        } else {
            setting = value;
        }
    }
    return setting;
}

export async function settingHeaderMiddleware(req, res, next) {
    const outOfService = (await getSetting(settingsKeys.outOfService, false) || 'false') === 'true';
    res.set(constants.headers.outOfService, outOfService);
    if (outOfService) {
        return res.status(204).json(responseJson.success());
    } else {
        next();
    }
}
