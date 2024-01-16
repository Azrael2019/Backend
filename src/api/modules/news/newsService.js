import NewsModel from "../../models/newsModel";
import ServiceCache from "../_serviceCache";
import config from "../../../configs/config";
import constants from "../../../helpers/constants";

class NewsService extends ServiceCache {

    constructor() {
        super('News', NewsModel, {attachments: [{bucket: config.aws.S3.buckets.pictureNews}]});
    }

    async getList(query, user) {
        if (!user || user.role !== constants.users.type.ADMIN) {
            query = {
                s: JSON.stringify({size: -1, createdAt: -1}),
                q: JSON.stringify({type: {$in: query.types ? query.types.split(',') : [constants.application.news.type.GLOBAL]}}),
            }
        }
        return super.getList(query, user);
    }
}

export default new NewsService()
