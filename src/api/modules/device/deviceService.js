import DeviceModel from "../../models/deviceModel";
import Service from "../_service";
import constants from "../../../helpers/constants";
import snsService from "../../../helpers/snsService";
import {rejectPromise} from "../../../helpers/response";
import config from "../../../configs/config";

class DeviceService extends Service {

    constructor() {
        super('Device', DeviceModel);
    }

    getList(query, user) {
        if (user.role !== constants.users.type.ADMIN) {
            query.q = query.q ? query.q : '{}';
            let q = JSON.parse(query.q);
            if (query.t === 'aggregate') {
                if (!Array.isArray(q)) q = [];
                q.unshift({$match: {user: user.profileId}});
            } else {
                q = {$and: [q]};
                q.$and.push({user: user.profileId});
            }
            query.q = JSON.stringify(q);
        }
        return super.getList(query, user);
    }

    getById(id, query = {}, user) {
        const find = {_id: id};
        if (user.role !== constants.users.type.ADMIN) {
            if (query.p) {
                try {
                    query.p = JSON.parse(query.p);
                } catch (e) {
                    query.p = query.p.split(',');
                }
            }
            find.user = user.profileId;
        }
        return super.getOneByQuery(find, query.p, query.f)
    }

    async create(itemSaveOri, user) {
        const applicationARN = config.aws.SNS.applicationsARN[itemSaveOri.type] ? config.aws.SNS.applicationsARN[itemSaveOri.type][itemSaveOri.isClient ? 'client' : 'manager'] : undefined;
        const awsARN = await snsService.createPlatformEndpoint(applicationARN, itemSaveOri.token);

        // // Get endpoint attributes
        const attr = await snsService.getEndpointAttributes(awsARN);

        // // Check if there are some changes
        if (itemSaveOri.token.toLowerCase() !== attr.Token.toLowerCase() || attr.Enabled !== 'true') {
            await snsService.setEndpointAttributes(awsARN, itemSaveOri.token, 'true');
        }
        itemSaveOri.awsARN = awsARN;

        if (user.role !== constants.users.type.ADMIN) {
            itemSaveOri.user = user.profileId;
        }

        // Check if not exists
        return super.getOneByQuery({awsARN})
            .then(device => {
                if (device) {
                    return super.updateById(device.id, itemSaveOri, user);
                } else {
                    return super.create(itemSaveOri, user);
                }
            });
    }

    async updateById(id, itemSaveOri, user) {
        if (user.role !== constants.users.type.ADMIN) {
            return rejectPromise.validation(this.modelName, null, constants.errors.kind.invalid);
        }
        return super.updateById(id, itemSaveOri, user);
    }

    deleteById(id, user) {
        return this.getById(id, {}, user)
            .then(device => {
                snsService.deleteEndpoint(device.awsARN).then();
                return this.model.findByIdAndRemove(id);
            })
    }

    deleteByQuery(query, user) {
        return this.getList({q: JSON.stringify(query)}, user)
            .then(devices => {
                return Promise.all(devices.items.map(device => this.deleteById(device.id, user)));
            })
    }
}

export default new DeviceService()
