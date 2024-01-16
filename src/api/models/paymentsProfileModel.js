import mongoose from "mongoose";
import Model from "./_model";
import SubModel from "./_subModel";

const CardSchema = new SubModel({
    type: {type: String, required: true},
    name: {type: String, required: true},
    last4: {type: String, required: true},
    expMonth: {type: String, required: true},
    expYear: {type: String, required: true},
});

const StripeSchema = new SubModel({
    customerId: {type: String, required: false},
    accountId: {type: String, required: false},
    cardId: {type: String, required: false},
    subscriptionId: {type: String, required: false},
    subscriptionItemId: {type: String, required: false},
    subscriptionType: {type: String, required: false},
});

const PaymentsProfileSchema = new Model({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    stripeData: {type: StripeSchema, required: true},
    card: {type: CardSchema, required: false},
    billingEmail: String,
});

PaymentsProfileSchema.index({user: 1}, {name: 'userIdx', unique: true, partialFilterExpression: {deleted: false}});

export default mongoose.model('payments-profiles', PaymentsProfileSchema);
