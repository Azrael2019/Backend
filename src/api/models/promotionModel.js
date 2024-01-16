import mongoose from "mongoose";
import Model from "./_model";
import PictureModel from "./subModels/pictureModel";
import constants from "../../helpers/constants";

const PromotionSchema = new Model({
    name: {type: String, required: true},
    description: {type: String, required: true},
    descriptionClient: String,
    qty: {type: Number, required: true},
    type: {
        type: String,
        required: true,
        enum: Object.values(constants.application.promotionType),
        default: constants.application.promotionType.MENU
    },
    amount: {type: Number, required: true, default: 0}, // Monto que le queda a SmartCommerce
    points: {type: Number, required: true, default: 0},
    limit: {type: Number, default: 0},// limite de reservas de esta promoción en todos los cataloges
    enabled: {type: Boolean, default: true},
    picture: PictureModel,
    sponsor: {type: mongoose.Schema.Types.ObjectId, ref: 'sponsors'},
    allowedCatalogs: [{type: mongoose.Schema.Types.ObjectId, ref: 'catalogs'}],
    order: {type: Number, required: true, default: 0},
    extra: Object,
});

PromotionSchema.index({name: 1}, {name: 'nameIdx', unique: true, partialFilterExpression: {deleted: false}});
PromotionSchema.index({name: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('promotions', PromotionSchema);
