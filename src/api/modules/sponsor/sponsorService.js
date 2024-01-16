import SponsorModel from "../../models/sponsorModel";
import ServiceCache from "../_serviceCache";
import config from "../../../configs/config";

class SponsorService extends ServiceCache {

    constructor() {
        super('Sponsor', SponsorModel, {attachments: [{bucket: config.aws.S3.buckets.pictureSponsor, field: 'logo'}]});
    }
}

export default new SponsorService()
