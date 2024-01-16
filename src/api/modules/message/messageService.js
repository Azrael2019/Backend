import MessageModel from "../../models/messageModel";
import Service from "../_service";
import constants from "../../../helpers/constants";
import {rejectPromise} from "../../../helpers/response";
// TODO: reemplazar "query.catalog || query.bar" por "query.catalog"
class MessageService extends Service {

    constructor() {
        super('Message', MessageModel);
    }

    getList(query, user) {
        if (!user || user.role !== constants.users.type.ADMIN) {
            const q = {$and: [user.role === constants.users.type.USER ? {user: user.profileId} : {catalog: {$in: user.myCatalogs || []}}]};
            if (query.catalog || query.bar) {
                q.$and.push({catalog: query.catalog || query.bar});
            }
            query = {
                q: JSON.stringify(q),
                s: JSON.stringify({createdAt: -1}),
                p: 'user'
            };
        }
        return super.getList(query, user);
    }

    getById(id, query = {}, user) {
        if (query.p) {
            try {
                query.p = JSON.parse(query.p);
            } catch (e) {
                query.p = query.p.split(',');
            }
        }
        const find = {_id: id};
        if (user.role === constants.users.type.USER) {
            find.user = user.profileId;
        } else if (user.role === constants.users.type.MANAGER) {
            find.catalog = {$in: user.myCatalogs || []}
        }
        return super.getOneByQuery(find, query.p, query.f)
    }

    async create(itemSaveOri, user) {
        itemSaveOri.user = user.profileId;
        itemSaveOri.read = false;
        return super.create(itemSaveOri, user);
    }

    async updateById(id, itemSaveOri, user) {
        return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
    }

    async read(id, user) {
        return this.getById(id, {}, user)
            .then(() => super.updateById(id, {read: true}, user));
    }
}

export default new MessageService()
