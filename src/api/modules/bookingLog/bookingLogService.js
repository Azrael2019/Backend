import BookingLogModel from "../../models/bookingLogModel";
import mongoose from "mongoose";
import Service from "../_service";
import constants from "../../../helpers/constants";

class BookingLogService extends Service {

    constructor() {
        super('BookingLog', BookingLogModel);
    }

    getList(query, user) {
        query.q = query.q ? query.q : '{}';
        let q = JSON.parse(query.q);
        if (query.t === 'aggregate') {
            if (!Array.isArray(q)) q = [];
            if (user.role === constants.users.type.USER) {
                q.unshift({$match: {user: user.profileId}});
            } else if (user.role === constants.users.type.MANAGER) {
                q.unshift({$match: {catalog: {$in: user.myCatalogs.map(item => (`oid:${item}`)) || []}}});
            }
        } else {
            q = {$and: [q]};
            if (user.role === constants.users.type.USER) {
                q.$and.push({user: user.profileId});
            } else if (user.role === constants.users.type.MANAGER) {
                q.$and.push({catalog: {$in: user.myCatalogs || []}});
            }
        }
        query.q = JSON.stringify(q);
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

    rewards(user) {
        const pipeline = [
            {$match: {user: mongoose.Types.ObjectId(user)}},
            {$group: {_id: null, count: {$sum: '$points'}}},
            {$project: {_id: 0}}
        ];
        return this.model.aggregate(pipeline)
            .then(values => values[0] || {count: 0})
    }
}

export default new BookingLogService()
