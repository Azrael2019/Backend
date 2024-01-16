import {logger} from "../../helpers/common"
import {setSetting, settingsKeys} from "../../../src/helpers/settings";

export async function outOfService(params) {
    logger('#### INIT PROCESS ####');
    try {
        await setSetting(settingsKeys.outOfService, params && params.value ? params.value : false);
        logger('#### FINISH PROCESS ####');
        return Promise.resolve();
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
