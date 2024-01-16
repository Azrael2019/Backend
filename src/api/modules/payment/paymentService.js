import PaymentModel from "../../models/paymentModel";
import ServiceCache from "../_serviceCache";
import {doPayment} from "../../../helpers/stripeService";
import {rejectPromise} from "../../../helpers/response";
import constants from "../../../helpers/constants";
import subscriptionService from "../subscription/subscriptionService";
import config from "../../../configs/config";
import catalogService from "../catalog/catalogService";

class PaymentService extends ServiceCache {

    constructor() {
        super('Payment', PaymentModel);
    }

    getList(query, user) {
        if (user && user.role === constants.users.type.ADMIN) return super.getList(query, user);
        return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
    }

    getById(id, query = {}, user) {
        if (user && user.role === constants.users.type.ADMIN) return super.getById(id, query, user);
        return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
    }

    async create(itemSaveOri = {}, user) {

        // Check required fields
        let validations = [];
        const {catalog, amount, promotion, feeAmount = 0} = itemSaveOri;
        if (!catalog) validations.push('catalog');
        if (!promotion) validations.push('promotion');
        if (!amount) validations.push('amount');
        if (validations.length > 0) return rejectPromise.validation(this.modelName, validations);

        // Check if subscription manager exists
        const subscription = await subscriptionService.getOneByQuery({
            user: user.profileId,
            deleted: false
        }, [], 'stripeData.customerId stripeData.cardId')
        if (subscription && subscription.stripeData && subscription.stripeData.customerId && subscription.stripeData.cardId) {

            // Check if catalog exists
            const catalogEntity = await catalogService.getOneByQuery({_id: catalog, deleted: false}, [], 'manager')
            if (catalogEntity) {

                // Check if subscription catalog exists
                const userRegister = catalogEntity.manager.toString();
                const subscriptionCatalog = await subscriptionService.getOneByQuery({
                    user: userRegister,
                    deleted: false
                }, [], 'stripeData.accountId')
                if (subscriptionCatalog && subscriptionCatalog.stripeData && subscriptionCatalog.stripeData.accountId) {

                    // Normalize object
                    const item = {
                        stripeData: {
                            customerId: subscription.stripeData.customerId,
                            cardId: subscription.stripeData.cardId,
                            accountId: subscriptionCatalog.stripeData.accountId,
                        },
                        user: user.profileId,
                        currency: config.stripe.currency,
                        catalog,
                        promotion,
                        userRegister,
                        amount: +amount,
                        feeAmount: +feeAmount,
                    }

                    // Check model validations
                    const itemSave = new this.model(item);
                    const error = itemSave.validateSync();
                    if (error) {
                        return rejectPromise.validationMongoose(this.modelName, error)
                    }
                    item.$setOnInsert = {deleted: false};

                    return super.create(item, user)
                        .then(payment => {

                            // Stripe subscribe
                            return doPayment(payment)
                                .then(({id}) => {
                                    payment.stripeData.paymentId = id;
                                    payment.status = constants.application.payment.status.APPROVED
                                    return payment.save();
                                });
                        });
                } else {
                    return rejectPromise.validation(subscriptionService.modelName, ['catalog.stripeData.accountId'], constants.errors.kind.notFound);
                }
            } else {
                return rejectPromise.validation(catalogService.modelName, null, constants.errors.kind.notFound);
            }
        } else {
            return rejectPromise.validation(subscriptionService.modelName, null, constants.errors.kind.notFound);
        }
    }

    async updateById(id, itemSaveOri, user) {
        return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
    }

    deleteById(id, user) {
        return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
    }
}

export default new PaymentService()
