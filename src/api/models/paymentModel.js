import mongoose from "mongoose";
import Model from "./_model";
import constants from "../../helpers/constants";
import SubModel from "./_subModel";

const StripeSchema = new SubModel({
    paymentId: {type: String, required: false},
    customerId: {type: String, required: true},
    accountId: {type: String, required: false},
    cardId: {type: String, required: true},
});

const PaymentSchema = new Model({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    userRegister: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    promotion: {type: mongoose.Schema.Types.ObjectId, ref: 'promotions', required: false},
    catalog: {type: mongoose.Schema.Types.ObjectId, ref: 'catalogs', required: true},
    status: {
        type: String,
        required: true,
        enum: Object.values(constants.application.payment.status),
        default: constants.application.payment.status.PENDING
    },
    currency: {type: String, required: true},
    amount: {type: Number, required: true, min: 0},
    feeAmount: {type: Number, required: false, min: 0, default: 0},
    stripeData: {type: StripeSchema, required: true},
});

PaymentSchema.index({user: 1}, {name: 'userIdx', partialFilterExpression: {deleted: false}});
PaymentSchema.index({userRegister: 1}, {name: 'userRegisterIdx', partialFilterExpression: {deleted: false}});

export default mongoose.model('payments', PaymentSchema);
