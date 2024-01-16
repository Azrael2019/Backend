import PolicyModel from "../../models/policyModel";
import ServiceCache from "../_serviceCache";
import pushNotificationService from "../pushNotification/pushNotificationService";
import constants from "../../../helpers/constants";

class PolicyService extends ServiceCache {

    constructor() {
        super('Policy', PolicyModel);
    }

    async getList(query, user) {
        if (!user || user.role !== constants.users.type.ADMIN) {
            query = {
                q: JSON.stringify({code: query.code}),
            };
        }
        return super.getList(query, user);
    }

    async updateById(id, itemSaveOri, user) {
        return super.updateById(id, itemSaveOri, user)
            .then(res => {
                if (itemSaveOri.notification && itemSaveOri.notification !== 'none') {
                    let query = {};
                    if (itemSaveOri.notification === 'manager') {
                        query = {isClient: false}
                    } else if (itemSaveOri.notification === 'user') {
                        query = {isClient: true}
                    }
                    pushNotificationService.sendByQuery(
                        {q: JSON.stringify(query)},
                        constants.notifications.policy.title.replace('###', res.title),
                        constants.notifications.policy.message.replace('###', res.title),
                    ).then();
                }
                return res;
            });
    }
}

export default new PolicyService()
