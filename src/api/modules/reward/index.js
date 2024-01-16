import constants from "../../../helpers/constants";
import rewardService from "./rewardService";
import Router from "../_router";

class RewardRouter extends Router {

    constructor() {
        super(rewardService, constants.path.reward, constants.access.features.reward);
    }
}

export const rewardRoute = new RewardRouter().router;
