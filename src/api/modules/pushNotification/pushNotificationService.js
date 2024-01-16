import constants from "../../../helpers/constants";
import utilsLog from "../../../helpers/logger";
import {rejectPromise} from "../../../helpers/response";
import snsService from "../../../helpers/snsService";
import deviceService from "../device/deviceService";

const logger = utilsLog(__filename);

class PushNotificationService {

    constructor() {
        this.modelName = 'PushNotification';
    }

    create(itemSave, query, user) {
        logger.debug(`create - args: itemSave(${JSON.stringify(itemSave)}), query(${JSON.stringify(query)}), user(${JSON.stringify(user)})`);

        if (user.role !== constants.users.type.ADMIN) {
            return rejectPromise.validation(this.modelName, null, constants.errors.kind.invalid);
        }
        if (query) {
            this.sendByQuery(query, itemSave.title, itemSave.message).then();
            return Promise.resolve({id: true});
        } else {
            return this.publish(itemSave.user, itemSave.title, itemSave.message);
        }
    }

    publish(user, title, message, xMessage) {
        logger.debug(`publish - args: user(${user}), message(${JSON.stringify(message)})`);

        return deviceService.getList({q: JSON.stringify({user})}, {role: constants.users.type.ADMIN})
            .then(devices => Promise.all(devices.items.map(device => snsService.publish(device.awsARN, title, message, xMessage, device.id))));
    }

    async sendByQuery(query, title, message, xMessage) {
        logger.debug(`sendByQuery - args: query(${JSON.stringify(query)}), message(${JSON.stringify(message)})`);

        let sk = 0;
        const l = 100;
        while (true) {
            const devices = await deviceService.getList(this._normalizeQuery(query, l, sk), {role: constants.users.type.ADMIN});
            if (devices.length === 0) break;
            await Promise.all(devices.items.map(device => snsService.publish(device.awsARN, title, message, xMessage, device.id)));
            sk = sk + l;
        }

        return true;
    }

    _normalizeQuery(query, l, sk) {
        try {
            if (query.t && query.t === 'aggregate') {
                let hasLimit = false;
                let hasSkip = false;
                const q = JSON.parse(query.q).map(item => {
                    if (item.$limit) {
                        item.$limit = l;
                        hasLimit = true;
                    }
                    if (item.$skip) {
                        item.$skip = sk;
                        hasSkip = true;
                    }
                    return item;
                });
                if (!hasLimit) q.push({$limit: l})
                if (!hasSkip) q.push({$skip: sk})
                return Object.assign(query, {q: JSON.stringify(q)});
            }
        } catch (ignore) {
        }
        return Object.assign(query, {l, sk});
    }
}

export default new PushNotificationService()
