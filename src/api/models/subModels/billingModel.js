import SubModel from "../_subModel";
import LocationModel from "./locationModel";
import constants from "../../../helpers/constants";

const BillingSchema = new SubModel({
    name: {type: String, required: true},
    location: {type: LocationModel, required: true},
    docType: {type: String, enum: Object.values(constants.application.billing.docType), required: true, default: constants.application.billing.docType.DNI},
    docNumber: {type: String, required: true},
    taxRegime: {type: String, required: true, default: false},
});

export default BillingSchema;
