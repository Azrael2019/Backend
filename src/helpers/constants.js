import dotenv from "dotenv";

dotenv.config();

const promotionType = {
    DISCOUNT: 'DISCOUNT',
    MENU: 'MENU',
    DRINK: 'DRINK',
    TA_DISCOUNT: 'TA_DISCOUNT',
    TA_MENU: 'TA_MENU',
    LOYALTY: 'LOYALTY',
    LOYALTY_DRINK: 'LOYALTY_DRINK',
    PREPAID_VOUCHER: 'PREPAID_VOUCHER',
    SOLIDARY: 'SOLIDARY',
    REMOTE_INVITATION: 'REMOTE_INVITATION',
};
export default {
    messages: {
        unauthorized: {
            text: 'Unauthorized: %s',
            code: 'message.unauthorized'
        },
        sessionLimit: {
            text: 'Unauthorized: %s',
            code: 'message.sessionLimit'
        },
        cors: {
            text: 'Not allowed by CORS for: %s',
            code: 'message.cors'
        },
        permission: {
            text: 'You don\'t have permission to access.',
            code: 'message.permission'
        },
        invalidUserType: {
            text: 'Invalid user type "%s".',
            code: 'message.invalidUserType'
        },
        validation: {
            text: '%s can\'t valid.',
            code: 'message.validation'
        },
        notFound: {
            text: 'No such "%s" found.',
            code: 'message.notFound'
        },
    },
    errors: {
        kind: {
            required: 'required',
            notFound: 'notFound',
            empty: 'empty',
            invalid: 'invalid',
            exist: 'exist',
            oneDefault: 'oneDefault',
            notEmpty: 'notEmpty',
            notMatch: 'notMatch',
        }
    },
    access: {
        type: {
            READ: 1,
            READ_ALL: 2,
            WRITE: 3,
            DELETE: 4,
        },
        features: {
            profile: 'profile',
            profileMe: 'profileMe',
            role: 'role',
            category: 'category',
            news: 'news',
            promotion: 'promotion',
            service: 'service',
            // TODO: REMOVE THIS IN A FUTURE
            bar: 'bar',
            barMe: 'barMe',
            // END TODO
            catalog: 'catalog',
            catalogMe: 'catalogMe',
            booking: 'booking',
            bookingLog: 'bookingLog',
            message: 'message',
            device: 'device',
            drink: 'drink',
            reward: 'reward',
            loyaltyCard: 'loyaltyCard',
            subscription: 'subscription',
            sponsor: 'sponsor',
            payment: 'payment',
        },
    },
    application: {
        name: 'Smart COMMERCE',
        promotionType,
        promotionTypeEnabled: process.env.PROMOTION_TYPE_ENABLED
            .split(',')
            .map(key => promotionType[key])
            .filter(f => f),
        featureFlags: {
            showMainMenus: process.env.FF_SHOW_MAIN_MENUS === 'true',
            showMainSnacks: process.env.FF_SHOW_MAIN_SNACKS === 'true',
            showMainDrinks: process.env.FF_SHOW_MAIN_DRINKS === 'true',
            showMainSpecialities: process.env.FF_SHOW_MAIN_SPECIALITIES === 'true',
            showSoldMenusDashboard: process.env.FF_SHOW_SOLD_MENUS_DASHBOARD === 'true',
            showExchangedPromotions: process.env.FF_SHOW_EXCHANGED_PROMOTIONS_DASHBOARD === 'true',
            filterPrice: process.env.FF_FILTER_PRICE === 'true',
            loginFacebook: process.env.FF_LOGIN_FACEBOOK === 'true',
            loginGoogle: process.env.FF_LOGIN_GOOGLE === 'true',
            loginApple: process.env.FF_LOGIN_APPLE === 'true',
        },
        promotionGroup: {
            loyalty: [promotionType.LOYALTY, promotionType.LOYALTY_DRINK, promotionType.PREPAID_VOUCHER],
            payment: [promotionType.PREPAID_VOUCHER, promotionType.SOLIDARY, promotionType.REMOTE_INVITATION],
        },
        paymentMethod: {
            CASH: 1,
            CREDIT_CARD: 2,
        },
        booking: {
            status: {
                PENDING: 'STATUS_PENDING',
                ACCEPTED: 'STATUS_ACCEPTED',
                CANCELED: 'STATUS_CANCELED',
                EXPIRED: 'STATUS_EXPIRED',
            },
            maximumDaily: 3,
            maximumCatalog: 1,
        },
        payment: {
            status: {
                PENDING: 'STATUS_PENDING',
                APPROVED: 'STATUS_APPROVED',
                REJECTED: 'STATUS_REJECTED',
            },
        },
        catalog: {
            status: {
                PENDING: 'STATUS_PENDING',
                BLOCKED: 'STATUS_BLOCKED',
                ACTIVE: 'STATUS_ACTIVE'
            },
            higherMenuPrice: 18,
            limit: 5,
            mealType: {
                LUNCH: 'LUNCH',
                DINNER: 'DINNER',
                BOTH: 'BOTH',
            }
        },
        loyaltyCards: {
            maximum: 2,
            expirationInDays: 30,
            expirationRedeemedInDays: 30,
        },
        news: {
            type: {
                GLOBAL: 'TYPE_GLOBAL',
                MANAGER: 'TYPE_MANAGER',
                USER: 'TYPE_USER',
                MARKETPLACE: 'TYPE_MARKETPLACE',
            },
        },
        billing: {
            docType: {
                DNI: 'DNI',
                CIF: 'CIF',
            },
        },
    },
    users: {
        type: {
            ADMIN: 'TYPE_ADMIN',
            MANAGER: 'TYPE_MANAGER',
            USER: 'TYPE_USER',
        },
        status: {
            PENDING: 'STATUS_PENDING',
            BLOCKED: 'STATUS_BLOCKED',
            ACTIVE: 'STATUS_ACTIVE'
        },
        language: {
            en: 'english',
            es: 'spanish',
        },
        gender: {
            male: 'male',
            female: 'female',
            other: 'other',
        },
    },
    devices: {
        type: {
            ANDROID: 'TYPE_ANDROID',
            IOS: 'TYPE_IOS',
        },
    },
    path: {
        auth: {
            _name: '/',
            login: '/login',
            loginFacebook: '/login/facebook',
            loginGoogle: '/login/google',
            loginApple: '/login/apple',
            logout: '/logout',
            signUp: '/sign-up',
            signUpManager: '/sign-up-manager',
            recoveryPassword: '/recovery-password',
            changePassword: '/change-password',
            refreshToken: '/refresh-token',
            activate: '/activate/:token',
            public: '/public',
        },
        policy: {
            _name: '/policy',
            _id: 'policyId',
            list: '/',
            one: '/:policyId',
        },
        profile: {
            _name: '/profile',
            _id: 'profileId',
            list: '/',
            one: '/:profileId',
            me: '/me',
            rewards: '/rewards',
            subscription: '/subscription',
        },
        role: {
            _name: '/role',
            _id: 'roleId',
            list: '/',
            one: '/:roleId',
            metadata: '/metadata',
        },
        category: {
            _name: '/category',
            _id: 'categoryId',
            list: '/',
            one: '/:categoryId',
        },
        drink: {
            _name: '/drink',
            _id: 'drinkId',
            list: '/',
            one: '/:drinkId',
        },
        news: {
            _name: '/news',
            _id: 'newsId',
            list: '/',
            one: '/:newsId',
        },
        service: {
            _name: '/service',
            _id: 'serviceId',
            list: '/',
            one: '/:serviceId',
        },
        promotion: {
            _name: '/promotion',
            _id: 'promotionId',
            list: '/',
            one: '/:promotionId',
        },
        sponsor: {
            _name: '/sponsor',
            _id: 'sponsorId',
            list: '/',
            one: '/:sponsorId',
        },
        catalog: {
            _name: '/catalog',
            _id: 'catalogId',
            list: '/',
            listNew: '/list',
            imported: '/imported',
            one: '/:catalogId',
            me: '/:catalogId/me',
        },
        subscription: {
            _name: '/subscription',
            _id: 'subscriptionId',
            list: '/',
            one: '/:subscriptionId',
            account: '/account',
        },
        payment: {
            _name: '/payment',
            _id: 'paymentId',
            list: '/',
            one: '/:paymentId',
        },
        message: {
            _name: '/message',
            _id: 'messageId',
            list: '/',
            one: '/:messageId',
            read: '/:messageId/read',
        },
        reward: {
            _name: '/reward',
            _id: 'rewardId',
            list: '/',
            one: '/:rewardId',
        },
        loyaltyCard: {
            _name: '/loyalty-card',
            _id: 'loyaltyCardId',
            list: '/',
            one: '/:loyaltyCardId',
            reset: '/:loyaltyCardId/reset',
        },
        booking: {
            _name: '/booking',
            _id: 'bookingId',
            list: '/',
            one: '/:bookingId',
            listNew: '/list',
            exchangedCount: '/exchanged-count',
            hasPromotion: '/has',
        },
        bookingReward: {
            _name: '/booking-reward',
            _id: 'bookingRewardId',
            list: '/',
            one: '/:bookingRewardId',
        },
        bookingLog: {
            _name: '/booking-log',
            _id: 'bookingLogId',
            list: '/',
            one: '/:bookingLogId',
        },
        device: {
            _name: '/device',
            _id: 'deviceId',
            list: '/',
            one: '/:deviceId',
        },
        pushNotification: {
            _name: '/push-notification',
            list: '/',
        },
    },
    regex: {
        email: /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/,
        url: /^((http)(s)?:\/\/)?[a-zA-Z0-9.\-_]*\.([a-zA-Z]+)$/,
        name: /^[a-zA-ZñÑ]+(([',. -][a-zA-ZñÑ ])?[a-zA-ZñÑ]*)*$/,
        catalogName: /^((?![\^!@#$*~ <>?]).)((?![\^!@#$*~<>?]).){0,100}((?![\^@#$*~ <>]).)$/,
        phone: /^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/,
        zipCode: /^(?:0[1-9]|[1-4]\d|5[0-2])\d{3}$/,
        dni: /^[0-9]{8}[TRWAGMYFPDXBNJZSQVHLCKE]$|^[XYZ][0-9]{7}[TRWAGMYFPDXBNJZSQVHLCKE]$|^[a-z]{3}[0-9]{6}[a-z]?$/i,
        cif: /^(X(-|\.)?0?\d{7}(-|\.)?[A-Z]|[A-Z](-|\.)?\d{7}(-|\.)?[0-9A-Z]|\d{8}(-|\.)?[A-Z])$/,
    },
    redis: {
        WEEK: 604800,
        DAY: 86400,
        HOUR: 3600,
        MINUTE: 1,
    },
    headers: {
        outOfService: 'X-Out-Of-Service',
    },
    notifications: {
        policy: {
            title: '###',
            message: 'Hemos modificado el siguiente documento "###"',
        }
    }
};
