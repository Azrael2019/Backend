import config from "../configs/config";
import stp from "stripe";
import utilsLog from "./logger";

const stripe = stp(config.stripe.secretAccessKey);
const logger = utilsLog(__filename);

export function updateSubscription(subscription, stripeToken) {
    logger.debug(`updateSubscription - args: subscription(${JSON.stringify(subscription)})`);
    const {stripeData: {customerId}, billingEmail} = subscription;
    return stripe.customers.update(customerId, {email: billingEmail, source: stripeToken});
}

export function doSubscription(subscription, stripeToken) {
    logger.debug(`doSubscription - args: subscription(${JSON.stringify(subscription)})`);
    const {stripeData: {subscriptionType}, billingEmail} = subscription;
    return stripe.customers.create({email: billingEmail, source: stripeToken})
        .then(customer =>
            stripe.subscriptions.create({customer: customer.id, items: [{plan: subscriptionType}]})
                .then(subscription => ({customer, subscription}))
        );
}

export function doPayment(payment) {
    const {stripeData: {customerId, cardId, accountId}, amount, currency, feeAmount = 0} = payment;
    logger.debug(`doPayment - args: payment(${JSON.stringify(payment)})`);
    const appFeeAmount = +feeAmount * 100
    return stripe.paymentIntents.create({
        amount: +amount * 100,
        currency,
        customer: customerId,
        payment_method: cardId,
        application_fee_amount: appFeeAmount > 1 ? appFeeAmount : 1,
        off_session: true,
        confirm: true,
        transfer_data: {
            destination: accountId,
        },
    }).catch(err => {
        // Error code will be authentication_required if authentication is needed
        console.log('StripeService.doPayment: Error code is: ', err.code);
        return stripe.paymentIntents.retrieve(err.raw.payment_intent.id).then(({id}) => id);
    });
}

export async function createAccount(stripeAccount, profile) {
    logger.debug(`createAccount - args: user(${JSON.stringify(stripeAccount)})`);

    // Check if exists stripe account
    if (!stripeAccount) {
        try {
            const billing = profile.billing || {};
            const params = {
                type: 'standard',
                email: profile.email,
                business_profile: {
                    name: billing.name,
                    product_description: 'Catalog',
                },
                business_type: 'individual',
                individual: {
                    address: {
                        line1: (billing.location || {}).formattedAddress
                    },
                    email: profile.email,
                    first_name: profile.name,
                    last_name: profile.lastName,
                    gender: profile.gender,
                    id_number: billing.docNumber,
                    dob: profile.birthdate
                        ? {
                            day: profile.birthdate.getDate(),
                            month: profile.birthdate.getMonth() + 1,
                            year: profile.birthdate.getFullYear(),
                        }
                        : undefined,
                },
                country: 'ES',
            };

            const account = await stripe.accounts.create(params);
            // Store the ID of the new Standard connected account.
            stripeAccount = account.id;
        } catch (e) {
            console.log(e)
            throw e
        }
    }

    const link = await stripe.accountLinks.create({
        type: "account_onboarding",
        account: stripeAccount,
        refresh_url: `${config.managerURL}/config`,
        return_url: `${config.managerURL}/config`,
    });
    return {id: stripeAccount, url: link.url};
}
