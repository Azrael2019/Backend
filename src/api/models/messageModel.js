import mongoose from "mongoose";
import Model from "./_model";

const MessageSchema = new Model({
    message: {type: String, required: true},
    user: {type: mongoose.Schema.Types.ObjectId, ref: 'profiles', required: true},
    catalog: {type: mongoose.Schema.Types.ObjectId, ref: 'catalogs', required: true},
    read: {type: Boolean, default: false},
});

MessageSchema.index({user: 1}, {name: 'userIdx'});
MessageSchema.index({catalog: 1}, {name: 'catalogIdx'});
MessageSchema.index({user: 1, catalog: 1}, {name: 'userAndCatalogIdx'});
MessageSchema.index({message: 'text'}, {name: 'text', default_language: 'spanish'});

export default mongoose.model('messages', MessageSchema);
