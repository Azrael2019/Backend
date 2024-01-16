import {logger} from "../../../helpers/common"
import CatalogModel from "../../../../src/api/models/catalogModel";
import SponsorModel from "../../../../src/api/models/sponsorModel";
import RewardModel from "../../../../src/api/models/rewardModel";
import NewsModel from "../../../../src/api/models/newsModel";
import PromotionModel from "../../../../src/api/models/promotionModel";
import ProfileModel from "../../../../src/api/models/profileModel";

export async function fixCatalogImages2(args) {
    logger('#### INIT PROCCESS ####');

    try {

        let ret = await SponsorModel.updateMany(
            {'logo.url': {$exists: true}, 'logo.thumb': {$exists: true}},
            [{$unset: ['logo.thumb']}],
            {multi: true}
        );
        logger(`Sponsor.logo(${JSON.stringify(ret)})`);

        ret = await RewardModel.updateMany(
            {'picture.url': {$exists: true}, 'picture.thumb': {$exists: true}},
            [{$unset: ['picture.thumb']}],
            {multi: true}
        );
        logger(`Reward.picture(${JSON.stringify(ret)})`);

        ret = await NewsModel.updateMany(
            {'picture.url': {$exists: true}, 'picture.thumb': {$exists: true}},
            [{$unset: ['picture.thumb']}],
            {multi: true}
        );
        logger(`News.picture(${JSON.stringify(ret)})`);

        ret = await PromotionModel.updateMany(
            {'picture.url': {$exists: true}, 'picture.thumb': {$exists: true}},
            [{$unset: ['picture.thumb']}],
            {multi: true}
        );
        logger(`Promotion.picture(${JSON.stringify(ret)})`);

        ret = await ProfileModel.updateMany(
            {'picture.url': {$exists: true}, 'picture.thumb': {$exists: true}},
            [{$unset: ['picture.thumb']}],
            {multi: true}
        );
        logger(`Profile.picture(${JSON.stringify(ret)})`);

        ret = await ProfileModel.updateMany(
            {'picture.url': {$exists: true}, 'picture.thumb': {$exists: true}},
            [{$unset: ['picture.thumb']}],
            {multi: true}
        );
        logger(`Profile.picture(${JSON.stringify(ret)})`);


        // ret = await CatalogModel.updateMany(
        //   {'mainPicture.url': {$exists: true}, 'mainPicture.thumb': {$exists: true}},
        //   [{$unset: ['mainPicture.thumb']}],
        //   {multi: true}
        // );
        // logger(`catalog.mainPicture(${JSON.stringify(ret)})`);

        // ret = await CatalogModel.updateMany(
        //   {'pictures.url': {$exists: true}, 'pictures.thumb': {$exists: true}},
        //   [{$unset: ['pictures.thumb']}],
        //   {multi: true}
        // );
        // logger(`catalog.pictures(${JSON.stringify(ret)})`);
        //
        // ret = await CatalogModel.updateMany(
        //   {'mainMenus.mainPicture.url': {$exists: true}, 'mainMenus.mainPicture.thumb': {$exists: true}},
        //   [{$unset: ['mainMenus.mainPicture.thumb']}],
        //   {multi: true}
        // );
        // logger(`catalog.mainMenus(${JSON.stringify(ret)})`);
        //
        // ret = await CatalogModel.updateMany(
        //   {'mainSnacks.mainPicture.url': {$exists: true}, 'mainSnacks.mainPicture.thumb': {$exists: true}},
        //   [{$unset: ['mainSnacks.mainPicture.thumb']}],
        //   {multi: true}
        // );
        // logger(`catalog.mainSnacks(${JSON.stringify(ret)})`);
    } catch (err) {
        logger(err.message, true);
        return Promise.reject();
    }
}
