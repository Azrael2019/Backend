import mongoose from "mongoose";
import Model from "./_model";

const BookingLogSchema = new Model({
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    userRegister: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    promotion: {type: mongoose.Schema.Types.ObjectId, ref: 'promotions'},
    reward: {type: mongoose.Schema.Types.ObjectId, ref: 'rewards'},
    catalog: {type: mongoose.Schema.Types.ObjectId, ref: 'catalogs', required: true},
    amount: {type: Number, required: true},
    points: {type: Number, required: true},
    processing: {type: Boolean, default: false},
    externalId: String,
});

BookingLogSchema.index({user: 1}, {name: 'userIdx'});
BookingLogSchema.index({userRegister: 1}, {name: 'userRegisterIdx'});
BookingLogSchema.index({userRegister: 1, catalog: 1}, {name: 'userRegisterAndCatalogIdx'});
BookingLogSchema.index({catalog: 1}, {name: 'catalogIdx'});

export default mongoose.model('booking-logs', BookingLogSchema);
