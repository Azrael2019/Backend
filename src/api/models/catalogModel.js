import mongoose from "mongoose";
import Model from "./_model";
import LocationModel from "./subModels/locationModel";
import PictureModel from "./subModels/pictureModel";
import SubModel from "./_subModel";
import constants from "../../helpers/constants";

export const nameOfDays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const PromotionSchema = new SubModel({
    promotion: {type: mongoose.Schema.Types.ObjectId, ref: 'promotions', required: true},
    timeRange: {
        from: Date,
        to: Date,
    },
    limit: {type: Number, default: 0}, // limite de reservas de esta promoción en este catalog
    repeat: {
        monday: {type: Boolean, default: true},
        tuesday: {type: Boolean, default: true},
        wednesday: {type: Boolean, default: true},
        thursday: {type: Boolean, default: true},
        friday: {type: Boolean, default: true},
        saturday: {type: Boolean, default: true},
        sunday: {type: Boolean, default: true},
    },
    loyaltyCardRelation: {type: Boolean, default: false},
    blocked: {type: Boolean, default: false},
    price: {type: Number, required: false, min: 0.5},
    name: {type: String, required: false},
});
PromotionSchema.index({promotion: 1}, {name: 'promotionIdx'});

const menuSchema = new SubModel({
    name: {type: String, required: true},
    description: {type: String, required: true},
    mainPicture: {type: PictureModel, required: true},
    price: {type: Number, required: true, min: 0, max: constants.application.catalog.higherMenuPrice},
    extra: Object,
    availability: {
        monday: {type: Boolean, default: true},
        tuesday: {type: Boolean, default: true},
        wednesday: {type: Boolean, default: true},
        thursday: {type: Boolean, default: true},
        friday: {type: Boolean, default: true},
        saturday: {type: Boolean, default: true},
        sunday: {type: Boolean, default: true},
    },
    mealType: {
        monday: {
            type: String,
            enum: Object.values(constants.application.catalog.mealType),
            default: constants.application.catalog.mealType.BOTH
        },
        tuesday: {
            type: String,
            enum: Object.values(constants.application.catalog.mealType),
            default: constants.application.catalog.mealType.BOTH
        },
        wednesday: {
            type: String,
            enum: Object.values(constants.application.catalog.mealType),
            default: constants.application.catalog.mealType.BOTH
        },
        thursday: {
            type: String,
            enum: Object.values(constants.application.catalog.mealType),
            default: constants.application.catalog.mealType.BOTH
        },
        friday: {
            type: String,
            enum: Object.values(constants.application.catalog.mealType),
            default: constants.application.catalog.mealType.BOTH
        },
        saturday: {
            type: String,
            enum: Object.values(constants.application.catalog.mealType),
            default: constants.application.catalog.mealType.BOTH
        },
        sunday: {
            type: String,
            enum: Object.values(constants.application.catalog.mealType),
            default: constants.application.catalog.mealType.BOTH
        },
    },
});

const drinkSchema = new SubModel({
    name: {type: String, required: true},
    drink: {type: mongoose.Schema.Types.ObjectId, ref: 'drinks'},
});

const specialitiesSchema = new SubModel({
    name: {type: String, required: true},
});

const CatalogSchema = new Model({
    name: {
        type: String,
        required: true,
        trim: true,
        match: [constants.regex.catalogName, "Please fill a valid catalog name"]
    },
    description: {type: String},
    mainPicture: {type: PictureModel, required: true},
    pictures: [PictureModel],
    cif: {type: String, trim: true, match: [constants.regex.cif, "Please fill a valid dni/passport"]},
    phoneNumber: {type: String, trim: true, match: [constants.regex.phone, "Please fill a valid phone number"]},
    openingTime: String,
    categories: [{type: mongoose.Schema.Types.ObjectId, ref: 'categories'}],
    manager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'profiles',
        refConditions: {role: constants.users.type.MANAGER}
    },
    promotions: [PromotionSchema],
    services: [{type: mongoose.Schema.Types.ObjectId, ref: 'services'}],
    location: {type: LocationModel, required: true},
    acceptsCredits: {type: Boolean, default: false},
    paymentMethod: {
        type: Number,
        required: true,
        enum: Object.values(constants.application.paymentMethod),
        default: constants.application.paymentMethod.CASH
    },
    isHighlighted: {type: Boolean, default: false},
    status: {
        type: String,
        enum: Object.values(constants.application.catalog.status),
        required: true,
        default: constants.application.catalog.status.PENDING
    },
    mainMenus: [menuSchema],
    mainSnacks: [menuSchema],
    mainDrinks: [drinkSchema],
    mainSpecialities: [specialitiesSchema],
    imported: {type: Boolean, default: false},
    importedId: String,
}, (doc, ret) => {
    if (ret.status && !ret.openingTime) {
        ret.openingTime = JSON.stringify({time: {}, repeat: []});
    }
    return ret;
});

CatalogSchema.index({name: 1}, {name: 'nameIdx'});
CatalogSchema.index({services: 1}, {name: 'servicesIdx'});
CatalogSchema.index({manager: 1}, {name: 'managerIdx'});
CatalogSchema.index({promotions: 1}, {name: 'promotionsIdx'});
CatalogSchema.index({acceptsCredits: 1}, {name: 'acceptsCreditsIdx'});
CatalogSchema.index({isHighlighted: 1}, {name: 'isHighlightedIdx'});
CatalogSchema.index({name: 'text', description: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('catalogs', CatalogSchema);
