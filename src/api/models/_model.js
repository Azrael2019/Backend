import mongoose from "mongoose";
import timestamps from "mongoose-timestamp";
import queryPlugin from "mongoose-query";
import idValidator from "mongoose-id-validator";

class Model extends mongoose.Schema {

    constructor(schema, transform) {
        schema.deleted = {type: Boolean, default: false};
        super(schema);
        this.plugin(queryPlugin);
        this.plugin(timestamps);
        this.plugin(idValidator);
        this.options.toJSON = {
            transform: function (doc, ret) {
                ret.id = ret._id || ret.id;
                delete ret._id;
                delete ret.__v;
                if (!ret.deleted) delete ret.deleted;
                if (transform) {
                    return transform(doc, ret)
                }
                return ret;
            }
        };
        this.index({deleted: 1}, {name: 'deletedIdx'});
        this.index({createdAt: 1}, {name: 'createdAtIdx'});
        this.statics.findOneOrCreate = function findOneOrCreate(filter, projection, doc) {
            const self = this;
            return self.findOne(filter, projection)
                .then(result => result ? result : self.create(doc));
        }
    }
}

export default Model
