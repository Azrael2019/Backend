import RewardModel from "../../models/rewardModel";
import ServiceCache from "../_serviceCache";
import config from "../../../configs/config";
import constants from "../../../helpers/constants";

class RewardService extends ServiceCache {

    constructor() {
        super('Reward', RewardModel, {attachments: [{bucket: config.aws.S3.buckets.pictureReward}]});
    }

    async getList(query, user) {
        if (!user || user.role !== constants.users.type.ADMIN) {
            query = {
                s: JSON.stringify({points: 1}),
            };
        }
        return super.getList(query, user);
    }
}

export default new RewardService()
