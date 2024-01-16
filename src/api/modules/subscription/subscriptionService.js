import PaymentsProfileModel from "../../models/paymentsProfileModel";
import ServiceCache from "../_serviceCache";
import * as stripe from "../../../helpers/stripeService";
import {rejectPromise} from "../../../helpers/response";
import constants from "../../../helpers/constants";
import config from "../../../configs/config";
import profileService from "../profile/profileService";

class SubscriptionService extends ServiceCache {

    constructor() {
        super('Subscription', PaymentsProfileModel);
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
        const {stripeToken} = itemSaveOri;
        if (!stripeToken) validations.push('stripeToken');
        if (validations.length > 0) return rejectPromise.validation(this.modelName, validations);

        // Check if subscription user exists
        const paymentProfile = await this.getOneByQuery({user: user.profileId, deleted: false})
        if (paymentProfile && paymentProfile.stripeData && paymentProfile.customerId) {

            // Normalize object
            if (itemSaveOri.billingEmail) paymentProfile.billingEmail = itemSaveOri.billingEmail;
            if (itemSaveOri.card && !itemSaveOri.card.name) itemSaveOri.card.name = paymentProfile.card.name;
            return stripe.updateSubscription(paymentProfile, stripeToken)
                .then((customer) => super._findByIdAndUpdate(
                    paymentProfile.id,
                    Object.assign(
                        {},
                        itemSaveOri,
                        {
                            stripeData: Object.assign(
                                {},
                                paymentProfile.stripeData.toObject(),
                                {
                                    customerId: customer.id,
                                    cardId: customer.default_source
                                }
                            )
                        }
                    ),
                    {new: true, runValidators: true}
                ));
        } else {

            // Normalize object
            itemSaveOri.stripeData = {
                customerId: 'FOR VALIDATE PROPOSED',
                cardId: 'FOR VALIDATE PROPOSED',
                subscriptionId: 'FOR VALIDATE PROPOSED',
                subscriptionItemId: 'FOR VALIDATE PROPOSED',
                subscriptionType: config.stripe.plan,
            };
            itemSaveOri.user = user.profileId;
            if (!itemSaveOri.billingEmail) itemSaveOri.billingEmail = user.email;
            if (itemSaveOri.card && !itemSaveOri.card.name) itemSaveOri.card.name = user.name;

            // Check model validations
            const itemSave = new this.model(itemSaveOri);
            const error = itemSave.validateSync();
            if (error) {
                return rejectPromise.validationMongoose(this.modelName, error)
            }
            itemSaveOri.$setOnInsert = {deleted: false};

            // Stripe subscribe
            return stripe.doSubscription(itemSaveOri, stripeToken)
                .then(({customer, subscription}) => super._findOneAndUpdate(
                    {user: itemSaveOri.user},
                    Object.assign(
                        {},
                        itemSaveOri,
                        {
                            stripeData: Object.assign(
                                {},
                                itemSaveOri.stripeData,
                                {
                                    customerId: customer.id,
                                    cardId: customer.default_source,
                                    subscriptionId: subscription.id,
                                    subscriptionItemId: subscription.items.data[0].id
                                }
                            )
                        }),
                    {upsert: true, new: true, runValidators: true}
                ));
        }
    }

    async updateById(id, itemSaveOri, user) {
        return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
    }

    deleteById(id, user) {
        return rejectPromise.validation(this.modelName, null, constants.errors.kind.notFound);
    }

    async createAccount(user) {
        const profile = await profileService.getOneByQuery({user: user.id});
        const paymentProfile = await this.getOneByQuery({user: user.profileId, deleted: false});

        // Normalize object
        const itemSaveOri = paymentProfile ? paymentProfile.toJSON() : {};
        itemSaveOri.user = user.profileId;
        if (!itemSaveOri.billingEmail) itemSaveOri.billingEmail = user.email;
        if (!itemSaveOri.stripeData) itemSaveOri.stripeData = {};
        delete itemSaveOri.id;
        delete itemSaveOri.updatedAt;
        delete itemSaveOri.createdAt;

        // Check model validations
        const itemSave = new this.model(itemSaveOri);
        const error = itemSave.validateSync();
        if (error) {
            return rejectPromise.validationMongoose(this.modelName, error)
        }
        itemSaveOri.$setOnInsert = {deleted: false};


        return stripe.createAccount(itemSaveOri.stripeData.accountId, profile)
            .then(ret => {
                return super._findOneAndUpdate(
                    {user: user.profileId},
                    Object.assign(
                        {},
                        itemSaveOri,
                        {
                            stripeData: Object.assign(
                                {},
                                itemSaveOri.stripeData,
                                {
                                    accountId: ret.id
                                }
                            )
                        }),
                    {upsert: true, new: true, runValidators: true})
                    .then(() => ret)
            })
            .catch(error => {
                return rejectPromise.flat(this.modelName, null, constants.errors.kind.invalid, error.message);
            });
    }
}

export default new SubscriptionService()
