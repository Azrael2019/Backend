import mongoose from "mongoose";
import Model from "./_model";
import constants from "../../helpers/constants";

const LoyaltyCardSchema = new Model({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    catalog: {type: mongoose.Schema.Types.ObjectId, ref: 'catalogs', required: true},
    promotion: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'promotions',
        refConditions: {type: {$in: constants.application.promotionGroup.loyalty}},
        required: true
    },
    bookings: [{type: mongoose.Schema.Types.ObjectId, ref: 'bookings', required: true}],
    redeemed: [{type: mongoose.Schema.Types.ObjectId, ref: 'bookings', required: true}],
    expire: Date,
    expireReward: Date,
});

LoyaltyCardSchema.index({user: 1, catalog: 1, promotion: 1}, {
    name: 'userAndCatalogAndPromotionIdx',
    unique: true,
    partialFilterExpression: {deleted: false}
});

export default mongoose.model('loyalty-cards', LoyaltyCardSchema);
